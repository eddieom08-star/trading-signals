import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

interface QuoteData {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High
  l: number;  // Low
  o: number;  // Open
  pc: number; // Previous close
  t: number;  // Timestamp
}

interface PriceResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
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

    if (!symbols) {
      return NextResponse.json(
        { error: 'Symbols parameter is required' },
        { status: 400 }
      );
    }

    const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());

    // Fetch quotes for all symbols in parallel
    const quotePromises = symbolList.map(async (symbol): Promise<PriceResult | null> => {
      try {
        const response = await fetch(
          `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
          {
            next: { revalidate: 10 }, // Cache for 10 seconds
            signal: AbortSignal.timeout(5000)
          }
        );

        if (!response.ok) {
          console.error(`Finnhub error for ${symbol}:`, response.status);
          return null;
        }

        const data: QuoteData = await response.json();

        // Check if we got valid data (Finnhub returns 0s for invalid symbols)
        if (data.c === 0 && data.pc === 0) {
          console.warn(`No data for symbol: ${symbol}`);
          return null;
        }

        return {
          symbol,
          price: data.c,
          change: data.d,
          changePercent: data.dp,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
          timestamp: data.t
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return null;
      }
    });

    const results = await Promise.all(quotePromises);

    // Filter out null results and convert to object
    const prices: Record<string, PriceResult> = {};
    results.forEach(result => {
      if (result) {
        prices[result.symbol] = result;
      }
    });

    return NextResponse.json({
      success: true,
      count: Object.keys(prices).length,
      prices,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Prices route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check
export async function HEAD() {
  const configured = Boolean(FINNHUB_API_KEY);
  return new NextResponse(null, {
    status: configured ? 200 : 503,
    headers: {
      'X-API-Status': configured ? 'configured' : 'not_configured'
    }
  });
}
