import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface InsiderTransaction {
  symbol: string;
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number;
  currency: string;
  source: string;
}

export interface InsiderSignal {
  symbol: string;
  totalShares: number;
  totalValue: number;
  netDirection: 'BUY' | 'SELL' | 'MIXED';
  transactions: InsiderTransaction[];
  insiderCount: number;
  avgPrice: number;
  latestDate: string;
  signalStrength: 'HIGH' | 'MEDIUM' | 'LOW';
  isCluster: boolean;
}

// Transaction codes: P = Purchase, S = Sale, M = Option Exercise, G = Gift
const PURCHASE_CODES = ['P', 'A'];
const SALE_CODES = ['S', 'D', 'F'];

function calculateSignalStrength(
  totalValue: number,
  insiderCount: number,
  isCluster: boolean
): 'HIGH' | 'MEDIUM' | 'LOW' {
  // High: >$1M total value OR 3+ insiders (cluster)
  if (totalValue >= 1000000 || insiderCount >= 3) return 'HIGH';
  // Medium: >$250K value OR 2 insiders
  if (totalValue >= 250000 || insiderCount >= 2) return 'MEDIUM';
  return 'LOW';
}

export async function GET(request: NextRequest) {
  try {
    if (!FINNHUB_API_KEY) {
      return NextResponse.json(
        { error: 'Finnhub API key not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const symbols = searchParams.get('symbols');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!symbols) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = new Date().toISOString().split('T')[0];

    // Fetch insider transactions for all symbols in parallel
    const insiderPromises = symbolList.map(async (symbol): Promise<InsiderSignal | null> => {
      try {
        const response = await fetch(
          `${FINNHUB_BASE_URL}/stock/insider-transactions?symbol=${symbol}&from=${fromDateStr}&to=${toDateStr}&token=${FINNHUB_API_KEY}`,
          {
            next: { revalidate: 300 }, // Cache for 5 minutes
            signal: AbortSignal.timeout(10000)
          }
        );

        if (!response.ok) {
          console.error(`Finnhub insider error for ${symbol}:`, response.status);
          return null;
        }

        const data = await response.json();
        const transactions: InsiderTransaction[] = data.data || [];

        if (transactions.length === 0) {
          return null;
        }

        // Aggregate transactions
        let totalBuyShares = 0;
        let totalSellShares = 0;
        let totalBuyValue = 0;
        let totalSellValue = 0;
        const insiders = new Set<string>();
        let latestDate = '';

        transactions.forEach((tx: InsiderTransaction) => {
          const value = Math.abs(tx.change) * (tx.transactionPrice || 0);
          insiders.add(tx.name);

          if (tx.transactionDate > latestDate) {
            latestDate = tx.transactionDate;
          }

          if (PURCHASE_CODES.includes(tx.transactionCode)) {
            totalBuyShares += Math.abs(tx.change);
            totalBuyValue += value;
          } else if (SALE_CODES.includes(tx.transactionCode)) {
            totalSellShares += Math.abs(tx.change);
            totalSellValue += value;
          }
        });

        const netShares = totalBuyShares - totalSellShares;
        const totalValue = Math.max(totalBuyValue, totalSellValue);
        const insiderCount = insiders.size;
        const isCluster = insiderCount >= 2;

        let netDirection: 'BUY' | 'SELL' | 'MIXED' = 'MIXED';
        if (totalBuyValue > totalSellValue * 1.5) {
          netDirection = 'BUY';
        } else if (totalSellValue > totalBuyValue * 1.5) {
          netDirection = 'SELL';
        }

        const avgPrice = totalValue > 0
          ? totalValue / (totalBuyShares + totalSellShares)
          : 0;

        const signalStrength = calculateSignalStrength(totalValue, insiderCount, isCluster);

        return {
          symbol,
          totalShares: Math.abs(netShares),
          totalValue,
          netDirection,
          transactions: transactions.slice(0, 10), // Limit to 10 most recent
          insiderCount,
          avgPrice,
          latestDate,
          signalStrength,
          isCluster
        };
      } catch (error) {
        console.error(`Error fetching insider data for ${symbol}:`, error);
        return null;
      }
    });

    const results = await Promise.all(insiderPromises);

    // Filter out nulls and low-value signals, sort by signal strength and value
    const signals = results
      .filter((s): s is InsiderSignal => s !== null && s.totalValue >= 50000)
      .sort((a, b) => {
        const strengthOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const strengthDiff = strengthOrder[b.signalStrength] - strengthOrder[a.signalStrength];
        if (strengthDiff !== 0) return strengthDiff;
        return b.totalValue - a.totalValue;
      });

    return NextResponse.json({
      success: true,
      count: signals.length,
      signals,
      dateRange: { from: fromDateStr, to: toDateStr },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Insider route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Scan popular tickers for insider activity
export async function POST(request: NextRequest) {
  try {
    if (!FINNHUB_API_KEY) {
      return NextResponse.json(
        { error: 'Finnhub API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { watchlist } = body;

    // Default watchlist of high-activity stocks
    const defaultWatchlist = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
      'AMD', 'IREN', 'HD', 'BE', 'ETN', 'NKE', 'PLTR', 'AXON',
      'LMT', 'RTX', 'GE', 'BA', 'CAT', 'JPM', 'GS', 'MS'
    ];

    const symbolsToScan = watchlist || defaultWatchlist;

    // Redirect to GET with symbols
    const url = new URL(request.url);
    url.searchParams.set('symbols', symbolsToScan.join(','));
    url.searchParams.set('days', '14');

    const response = await GET(new NextRequest(url));
    return response;

  } catch (error) {
    console.error('Insider scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
