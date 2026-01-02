import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface DynamicSignal {
  ticker: string;
  direction: 'LONG' | 'SHORT';
  signalType: 'INSIDER' | 'CONTRACT' | 'COMBINED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  reasons: string[];
  insiderData?: {
    netDirection: 'BUY' | 'SELL' | 'MIXED';
    totalValue: number;
    insiderCount: number;
    latestDate: string;
  };
  contractData?: {
    totalValue: number;
    contractCount: number;
    primaryAgency: string;
    sector: string;
  };
  suggestedEntry?: {
    strikeOffset: number;
    dte: number;
    stopPercent: number;
  };
  generatedAt: string;
}

interface InsiderTransaction {
  symbol: string;
  name: string;
  change: number;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number;
}

interface GovernmentContract {
  totalValue: number;
  actionDate: string;
  agency: string;
}

const PURCHASE_CODES = ['P', 'A'];
const SALE_CODES = ['S', 'D', 'F'];

// Watchlist of tickers to scan for signals
const SIGNAL_WATCHLIST = [
  // Tech
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'AMD', 'INTC', 'CRM',
  // Defense
  'LMT', 'RTX', 'NOC', 'GD', 'BA', 'HII', 'LDOS', 'BAH',
  // Energy
  'XOM', 'CVX', 'IREN', 'BE', 'ENPH', 'FSLR',
  // Industrial
  'CAT', 'DE', 'ETN', 'HON', 'GE',
  // Consumer
  'HD', 'NKE', 'COST', 'WMT', 'TGT',
  // Finance
  'JPM', 'GS', 'MS', 'BAC',
  // Healthcare
  'UNH', 'JNJ', 'PFE', 'MRNA',
  // Other high-activity
  'PLTR', 'AXON', 'PANW', 'CRWD', 'NET'
];

async function fetchInsiderData(symbol: string, days: number = 30): Promise<{
  netDirection: 'BUY' | 'SELL' | 'MIXED';
  totalValue: number;
  insiderCount: number;
  latestDate: string;
  score: number;
} | null> {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = new Date().toISOString().split('T')[0];

    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/insider-transactions?symbol=${symbol}&from=${fromDateStr}&to=${toDateStr}&token=${FINNHUB_API_KEY}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const transactions: InsiderTransaction[] = data.data || [];

    if (transactions.length === 0) return null;

    let totalBuyValue = 0;
    let totalSellValue = 0;
    const insiders = new Set<string>();
    let latestDate = '';

    transactions.forEach((tx) => {
      const value = Math.abs(tx.change) * (tx.transactionPrice || 0);
      insiders.add(tx.name);
      if (tx.transactionDate > latestDate) latestDate = tx.transactionDate;

      if (PURCHASE_CODES.includes(tx.transactionCode)) {
        totalBuyValue += value;
      } else if (SALE_CODES.includes(tx.transactionCode)) {
        totalSellValue += value;
      }
    });

    const totalValue = Math.max(totalBuyValue, totalSellValue);
    if (totalValue < 100000) return null; // Min threshold $100K

    let netDirection: 'BUY' | 'SELL' | 'MIXED' = 'MIXED';
    if (totalBuyValue > totalSellValue * 2) netDirection = 'BUY';
    else if (totalSellValue > totalBuyValue * 2) netDirection = 'SELL';

    // Score: 0-100 based on value, insider count, and direction clarity
    let score = 0;
    if (totalValue >= 5000000) score += 40;
    else if (totalValue >= 1000000) score += 30;
    else if (totalValue >= 500000) score += 20;
    else score += 10;

    if (insiders.size >= 3) score += 30;
    else if (insiders.size >= 2) score += 20;
    else score += 10;

    if (netDirection !== 'MIXED') score += 30;
    else score += 10;

    return {
      netDirection,
      totalValue,
      insiderCount: insiders.size,
      latestDate,
      score
    };
  } catch {
    return null;
  }
}

async function fetchContractData(symbol: string, days: number = 90): Promise<{
  totalValue: number;
  contractCount: number;
  primaryAgency: string;
  sector: string;
  score: number;
} | null> {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = new Date().toISOString().split('T')[0];

    const response = await fetch(
      `${FINNHUB_BASE_URL}/stock/usa-spending?symbol=${symbol}&from=${fromDateStr}&to=${toDateStr}&token=${FINNHUB_API_KEY}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const contracts: GovernmentContract[] = data.data || [];

    if (contracts.length === 0) return null;

    let totalValue = 0;
    const agencyCount: Record<string, number> = {};

    contracts.forEach((contract) => {
      totalValue += contract.totalValue || 0;
      const agency = contract.agency || 'Unknown';
      agencyCount[agency] = (agencyCount[agency] || 0) + 1;
    });

    if (totalValue < 1000000) return null; // Min threshold $1M

    const primaryAgency = Object.entries(agencyCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Government';

    const sector = primaryAgency.toLowerCase().includes('defense') ||
      primaryAgency.toLowerCase().includes('army') ||
      primaryAgency.toLowerCase().includes('navy') ? 'Defense' : 'Government';

    // Score: 0-100 based on contract value and count
    let score = 0;
    if (totalValue >= 100000000) score += 50;
    else if (totalValue >= 50000000) score += 40;
    else if (totalValue >= 10000000) score += 30;
    else score += 20;

    if (contracts.length >= 5) score += 30;
    else if (contracts.length >= 3) score += 20;
    else score += 10;

    if (sector === 'Defense') score += 20;
    else score += 10;

    return {
      totalValue,
      contractCount: contracts.length,
      primaryAgency,
      sector,
      score
    };
  } catch {
    return null;
  }
}

function generateSignal(
  ticker: string,
  insiderData: Awaited<ReturnType<typeof fetchInsiderData>>,
  contractData: Awaited<ReturnType<typeof fetchContractData>>
): DynamicSignal | null {
  if (!insiderData && !contractData) return null;

  const reasons: string[] = [];
  let totalScore = 0;
  let signalType: 'INSIDER' | 'CONTRACT' | 'COMBINED' = 'INSIDER';
  let direction: 'LONG' | 'SHORT' = 'LONG';

  if (insiderData) {
    totalScore += insiderData.score;
    if (insiderData.netDirection === 'BUY') {
      reasons.push(`Insider buying: $${(insiderData.totalValue / 1000000).toFixed(1)}M by ${insiderData.insiderCount} insider(s)`);
      direction = 'LONG';
    } else if (insiderData.netDirection === 'SELL') {
      reasons.push(`Insider selling: $${(insiderData.totalValue / 1000000).toFixed(1)}M by ${insiderData.insiderCount} insider(s)`);
      direction = 'SHORT';
    } else {
      reasons.push(`Mixed insider activity: $${(insiderData.totalValue / 1000000).toFixed(1)}M`);
    }
  }

  if (contractData) {
    totalScore += contractData.score;
    reasons.push(`${contractData.sector} contracts: $${(contractData.totalValue / 1000000).toFixed(0)}M from ${contractData.primaryAgency}`);
    signalType = insiderData ? 'COMBINED' : 'CONTRACT';
    // Contracts are bullish signal
    if (!insiderData || insiderData.netDirection !== 'SELL') {
      direction = 'LONG';
    }
  }

  // Combined signals get bonus
  if (insiderData && contractData) {
    totalScore += 20;
    reasons.push('COMBINED: Insider activity + Government contracts');
  }

  // Minimum score threshold
  if (totalScore < 40) return null;

  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (totalScore >= 80) confidence = 'HIGH';
  else if (totalScore >= 60) confidence = 'MEDIUM';

  // Generate suggested entry parameters based on confidence
  const suggestedEntry = {
    strikeOffset: confidence === 'HIGH' ? 0.05 : confidence === 'MEDIUM' ? 0.08 : 0.10,
    dte: confidence === 'HIGH' ? 45 : confidence === 'MEDIUM' ? 35 : 28,
    stopPercent: 0.10
  };

  return {
    ticker,
    direction,
    signalType,
    confidence,
    score: totalScore,
    reasons,
    insiderData: insiderData ? {
      netDirection: insiderData.netDirection,
      totalValue: insiderData.totalValue,
      insiderCount: insiderData.insiderCount,
      latestDate: insiderData.latestDate
    } : undefined,
    contractData: contractData ? {
      totalValue: contractData.totalValue,
      contractCount: contractData.contractCount,
      primaryAgency: contractData.primaryAgency,
      sector: contractData.sector
    } : undefined,
    suggestedEntry,
    generatedAt: new Date().toISOString()
  };
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
    const symbolsParam = searchParams.get('symbols');
    const minScore = parseInt(searchParams.get('minScore') || '50', 10);

    const symbols = symbolsParam
      ? symbolsParam.split(',').map(s => s.trim().toUpperCase())
      : SIGNAL_WATCHLIST;

    // Fetch data for all symbols in parallel (batch of 5 to avoid rate limits)
    const signals: DynamicSignal[] = [];
    const batchSize = 5;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          const [insiderData, contractData] = await Promise.all([
            fetchInsiderData(symbol),
            fetchContractData(symbol)
          ]);
          return generateSignal(symbol, insiderData, contractData);
        })
      );

      batchResults.forEach(signal => {
        if (signal && signal.score >= minScore) {
          signals.push(signal);
        }
      });

      // Small delay between batches to avoid rate limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Sort by score descending
    signals.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      count: signals.length,
      signals,
      scannedSymbols: symbols.length,
      minScoreThreshold: minScore,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Signals route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Scan default watchlist
export async function POST() {
  const url = new URL('http://localhost/api/signals');
  url.searchParams.set('minScore', '50');
  return GET(new NextRequest(url));
}
