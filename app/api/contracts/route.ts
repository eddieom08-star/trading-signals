import { NextRequest, NextResponse } from 'next/server';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface GovernmentContract {
  symbol: string;
  awardDescription: string;
  country: string;
  totalValue: number;
  actionDate: string;
  agency: string;
  recipient: string;
  performanceStartDate: string;
  performanceEndDate: string;
}

export interface ContractSignal {
  symbol: string;
  companyName: string;
  totalContractValue: number;
  contractCount: number;
  contracts: GovernmentContract[];
  primaryAgency: string;
  latestDate: string;
  signalStrength: 'HIGH' | 'MEDIUM' | 'LOW';
  sector: string;
}

function determineSector(agency: string, description: string): string {
  const lowerAgency = agency.toLowerCase();
  const lowerDesc = description.toLowerCase();

  if (lowerAgency.includes('defense') || lowerAgency.includes('army') ||
      lowerAgency.includes('navy') || lowerAgency.includes('air force') ||
      lowerDesc.includes('military') || lowerDesc.includes('defense')) {
    return 'Defense';
  }
  if (lowerAgency.includes('health') || lowerDesc.includes('medical') ||
      lowerDesc.includes('pharma') || lowerDesc.includes('vaccine')) {
    return 'Healthcare';
  }
  if (lowerAgency.includes('energy') || lowerDesc.includes('energy') ||
      lowerDesc.includes('solar') || lowerDesc.includes('renewable')) {
    return 'Energy';
  }
  if (lowerAgency.includes('homeland') || lowerDesc.includes('security') ||
      lowerDesc.includes('cybersecurity')) {
    return 'Security';
  }
  if (lowerAgency.includes('transportation') || lowerDesc.includes('infrastructure')) {
    return 'Infrastructure';
  }
  return 'Government';
}

function calculateSignalStrength(totalValue: number, contractCount: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  // High: >$50M total value or 5+ contracts
  if (totalValue >= 50000000 || contractCount >= 5) return 'HIGH';
  // Medium: >$10M value or 2+ contracts
  if (totalValue >= 10000000 || contractCount >= 2) return 'MEDIUM';
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
    const days = parseInt(searchParams.get('days') || '90', 10);

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

    // Fetch government contracts for all symbols in parallel
    const contractPromises = symbolList.map(async (symbol): Promise<ContractSignal | null> => {
      try {
        const response = await fetch(
          `${FINNHUB_BASE_URL}/stock/usa-spending?symbol=${symbol}&from=${fromDateStr}&to=${toDateStr}&token=${FINNHUB_API_KEY}`,
          {
            next: { revalidate: 600 }, // Cache for 10 minutes
            signal: AbortSignal.timeout(10000)
          }
        );

        if (!response.ok) {
          console.error(`Finnhub contracts error for ${symbol}:`, response.status);
          return null;
        }

        const data = await response.json();
        const contracts: GovernmentContract[] = data.data || [];

        if (contracts.length === 0) {
          return null;
        }

        // Aggregate contract data
        let totalContractValue = 0;
        const agencyCount: Record<string, number> = {};
        let latestDate = '';

        contracts.forEach((contract: GovernmentContract) => {
          totalContractValue += contract.totalValue || 0;

          const agency = contract.agency || 'Unknown';
          agencyCount[agency] = (agencyCount[agency] || 0) + 1;

          if (contract.actionDate > latestDate) {
            latestDate = contract.actionDate;
          }
        });

        // Find primary agency
        const primaryAgency = Object.entries(agencyCount)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Government';

        const sector = determineSector(
          primaryAgency,
          contracts[0]?.awardDescription || ''
        );

        const signalStrength = calculateSignalStrength(totalContractValue, contracts.length);

        return {
          symbol,
          companyName: contracts[0]?.recipient || symbol,
          totalContractValue,
          contractCount: contracts.length,
          contracts: contracts.slice(0, 5), // Limit to 5 most recent
          primaryAgency,
          latestDate,
          signalStrength,
          sector
        };
      } catch (error) {
        console.error(`Error fetching contracts for ${symbol}:`, error);
        return null;
      }
    });

    const results = await Promise.all(contractPromises);

    // Filter out nulls and sort by signal strength and value
    const signals = results
      .filter((s): s is ContractSignal => s !== null)
      .sort((a, b) => {
        const strengthOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const strengthDiff = strengthOrder[b.signalStrength] - strengthOrder[a.signalStrength];
        if (strengthDiff !== 0) return strengthDiff;
        return b.totalContractValue - a.totalContractValue;
      });

    return NextResponse.json({
      success: true,
      count: signals.length,
      signals,
      dateRange: { from: fromDateStr, to: toDateStr },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Contracts route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Scan defense/government contractors
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

    // Default watchlist of major government contractors
    const defaultWatchlist = [
      'LMT', 'RTX', 'NOC', 'GD', 'BA', 'HII', 'L3HARRIS', 'LDOS',
      'BAH', 'SAIC', 'CACI', 'PLTR', 'PANW', 'FTNT', 'CRWD',
      'ETN', 'HON', 'CAT', 'DE', 'GE'
    ];

    const symbolsToScan = watchlist || defaultWatchlist;

    const url = new URL(request.url);
    url.searchParams.set('symbols', symbolsToScan.join(','));
    url.searchParams.set('days', '60');

    const response = await GET(new NextRequest(url));
    return response;

  } catch (error) {
    console.error('Contracts scan error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
