export interface Politician {
  name: string;
  party: 'D' | 'R';
  state: string;
  committee: string;
}

export interface OptionsConfig {
  strikeOffset: number;
  dte: number;
  expiry: string;
}

export interface StockConfig {
  stopPercent: number;
  targets: number[];
}

export interface OptionsSignal {
  ticker: string;
  direction: 'LONG' | 'SHORT';
  tier: 1 | 2;
  confidence: 'HIGH' | 'MEDIUM';
  politicians: Politician[];
  transaction: string;
  amount: string;
  lag: number | string;
  winRate: number | null;
  isCluster: boolean;
  catalyst: string[];
  risks: string[];
  optionsConfig: OptionsConfig;
}

export interface StockSignal {
  ticker: string;
  direction: 'LONG' | 'SHORT';
  tier: 1 | 2;
  confidence: 'HIGH' | 'MEDIUM';
  politicians: Politician[];
  amount: string;
  lag: number | string;
  winRate?: number;
  isCluster: boolean;
  catalyst: string[];
  risks: string[];
  stockConfig: StockConfig;
}

export interface IndexStrategy {
  type: string;
  strikeOffset: number;
  dte: number;
  color: 'green' | 'amber' | 'red';
}

export interface IndexOption {
  ticker: string;
  name: string;
  description: string;
  strategies: IndexStrategy[];
  iv: number;
  notes: string[];
}

export interface HighProbOption {
  ticker: string;
  name: string;
  strikeOffset: number;
  dte: number;
  iv: number;
  rationale: string;
}

export const SIGNALS_CONFIG: OptionsSignal[] = [
  {
    ticker: 'NVDA',
    direction: 'LONG',
    tier: 1,
    confidence: 'HIGH',
    politicians: [{ name: 'Nancy Pelosi', party: 'D', state: 'CA', committee: 'Financial Services' }],
    transaction: 'BUY Call Options',
    amount: '$1M-$5M',
    lag: 13,
    winRate: 68,
    isCluster: false,
    catalyst: ['GTC 2026 keynote Mar 17', 'Blackwell Ultra production ramp'],
    risks: ['Crowded trade', 'Elevated IV into earnings'],
    optionsConfig: { strikeOffset: 0.10, dte: 35, expiry: 'Feb 7' }
  },
  {
    ticker: 'LMT',
    direction: 'LONG',
    tier: 1,
    confidence: 'HIGH',
    politicians: [
      { name: 'Dan Crenshaw', party: 'R', state: 'TX', committee: 'Armed Services' },
      { name: 'Mike Garcia', party: 'R', state: 'CA', committee: 'Armed Services' },
      { name: 'Mark Kelly', party: 'D', state: 'AZ', committee: 'Armed Services' }
    ],
    transaction: 'BUY Stock',
    amount: '$250K-$500K each',
    lag: '12-17',
    winRate: null,
    isCluster: true,
    catalyst: ['FY2026 defense appropriations', '$920B defense budget'],
    risks: ['Shutdown risk', 'Budget priced in'],
    optionsConfig: { strikeOffset: 0.05, dte: 28, expiry: 'Jan 31' }
  },
  {
    ticker: 'GOOGL',
    direction: 'LONG',
    tier: 2,
    confidence: 'MEDIUM',
    politicians: [{ name: 'Tommy Tuberville', party: 'R', state: 'AL', committee: 'Banking' }],
    transaction: 'BUY Stock',
    amount: '$100K-$250K',
    lag: 13,
    winRate: 61,
    isCluster: false,
    catalyst: ['DOJ antitrust remedy hearing Feb 2026', 'Gemini 2.0 momentum'],
    risks: ['Binary ruling', 'No cluster confirmation'],
    optionsConfig: { strikeOffset: 0.065, dte: 42, expiry: 'Feb 14' }
  },
  {
    ticker: 'AMD',
    direction: 'LONG',
    tier: 1,
    confidence: 'HIGH',
    politicians: [{ name: 'Paul Pelosi (Spouse)', party: 'D', state: 'CA', committee: 'N/A' }],
    transaction: 'BUY Call Options',
    amount: '$500K-$1M',
    lag: 12,
    winRate: 71,
    isCluster: false,
    catalyst: ['CES 2026 keynote Jan 7', 'MI350X launch'],
    risks: ['NVDA competition', 'China exposure'],
    optionsConfig: { strikeOffset: 0.08, dte: 32, expiry: 'Feb 7' }
  },
  {
    ticker: 'RTX',
    direction: 'LONG',
    tier: 1,
    confidence: 'HIGH',
    politicians: [
      { name: 'French Hill', party: 'R', state: 'AR', committee: 'Financial Services' },
      { name: 'Pat Fallon', party: 'R', state: 'TX', committee: 'Armed Services' }
    ],
    transaction: 'BUY Stock',
    amount: '$100K-$250K each',
    lag: '9-11',
    winRate: 58,
    isCluster: true,
    catalyst: ['Patriot system expansion contracts', 'NATO 3% GDP target'],
    risks: ['Defense rotation', 'Low beta'],
    optionsConfig: { strikeOffset: 0.07, dte: 35, expiry: 'Feb 7' }
  }
];

export const STOCK_SIGNALS_CONFIG: StockSignal[] = [
  {
    ticker: 'PLTR',
    direction: 'LONG',
    tier: 1,
    confidence: 'HIGH',
    politicians: [
      { name: 'Marjorie Taylor Greene', party: 'R', state: 'GA', committee: 'Homeland Security' },
      { name: 'Josh Gottheimer', party: 'D', state: 'NJ', committee: 'Financial Services' }
    ],
    amount: '$250K-$500K each',
    lag: '11-12',
    isCluster: true,
    catalyst: ['Maven Smart System expansion', 'NATO AIP platform adoption'],
    risks: ['High valuation', 'Insider selling'],
    stockConfig: { stopPercent: 0.10, targets: [0.13, 0.26, 0.46] }
  },
  {
    ticker: 'AXON',
    direction: 'LONG',
    tier: 2,
    confidence: 'HIGH',
    politicians: [{ name: 'Michael McCaul', party: 'R', state: 'TX', committee: 'Foreign Affairs Chair' }],
    amount: '$500K-$1M',
    lag: 12,
    winRate: 64,
    isCluster: false,
    catalyst: ['Federal body camera mandate 2026', 'Draft One AI integration'],
    risks: ['High price', 'Single politician'],
    stockConfig: { stopPercent: 0.11, targets: [0.10, 0.20, 0.31] }
  },
  {
    ticker: 'GE',
    direction: 'LONG',
    tier: 2,
    confidence: 'MEDIUM',
    politicians: [{ name: 'Ro Khanna', party: 'D', state: 'CA', committee: 'Armed Services' }],
    amount: '$100K-$250K',
    lag: 13,
    winRate: 59,
    isCluster: false,
    catalyst: ['GE Aerospace record backlog', 'LEAP engine demand'],
    risks: ['Cycle peak', 'Single signal'],
    stockConfig: { stopPercent: 0.10, targets: [0.09, 0.18, 0.29] }
  }
];

export const INDEX_OPTIONS_CONFIG: IndexOption[] = [
  {
    ticker: 'SPY',
    name: 'S&P 500 ETF',
    description: 'Broad market exposure, highest liquidity',
    strategies: [
      { type: 'Conservative', strikeOffset: 0.03, dte: 45, color: 'green' },
      { type: 'Moderate', strikeOffset: 0.05, dte: 30, color: 'amber' },
      { type: 'Aggressive', strikeOffset: 0.08, dte: 21, color: 'red' }
    ],
    iv: 0.18,
    notes: ['Most liquid options market globally', 'Tight spreads even on OTM strikes', 'Weekly expirations available']
  },
  {
    ticker: 'QQQ',
    name: 'Nasdaq-100 ETF',
    description: 'Tech-heavy, higher volatility than SPY',
    strategies: [
      { type: 'Conservative', strikeOffset: 0.04, dte: 45, color: 'green' },
      { type: 'Moderate', strikeOffset: 0.06, dte: 30, color: 'amber' },
      { type: 'Aggressive', strikeOffset: 0.10, dte: 21, color: 'red' }
    ],
    iv: 0.24,
    notes: ['Higher beta than SPY', 'Benefits from tech momentum', 'Excellent liquidity']
  }
];

export const HIGH_PROB_CONFIG: HighProbOption[] = [
  {
    ticker: 'SPY',
    name: 'S&P 500 ETF',
    strikeOffset: -0.02,
    dte: 60,
    iv: 0.18,
    rationale: 'Deep ITM call acts like leveraged stock with high delta and limited downside vs shares'
  },
  {
    ticker: 'QQQ',
    name: 'Nasdaq-100 ETF',
    strikeOffset: -0.01,
    dte: 60,
    iv: 0.24,
    rationale: 'Slightly ITM captures tech momentum with reduced theta decay vs OTM'
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp',
    strikeOffset: -0.03,
    dte: 45,
    iv: 0.45,
    rationale: 'High IV makes ITM calls attractive - pays for time value with strong delta exposure'
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc',
    strikeOffset: -0.02,
    dte: 60,
    iv: 0.22,
    rationale: 'Low IV blue chip - ITM calls provide stock-like exposure with defined risk'
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp',
    strikeOffset: -0.02,
    dte: 60,
    iv: 0.24,
    rationale: 'Enterprise AI leader - ITM calls capture upside with built-in downside protection'
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc',
    strikeOffset: -0.025,
    dte: 55,
    iv: 0.28,
    rationale: 'Undervalued relative to peers - ITM calls benefit from any multiple expansion'
  }
];

// Fallback prices updated Jan 2026 - used when Finnhub API unavailable
export const FALLBACK_PRICES: Record<string, { price: number; change: number; changePercent: number }> = {
  NVDA: { price: 145.50, change: 1.25, changePercent: 0.87 },
  LMT: { price: 512.00, change: 3.40, changePercent: 0.67 },
  GOOGL: { price: 198.75, change: 1.85, changePercent: 0.94 },
  AMD: { price: 128.40, change: -0.65, changePercent: -0.50 },
  RTX: { price: 128.90, change: 0.75, changePercent: 0.59 },
  PLTR: { price: 78.50, change: 1.45, changePercent: 1.88 },
  AXON: { price: 720.00, change: 5.20, changePercent: 0.73 },
  GE: { price: 185.60, change: 1.10, changePercent: 0.60 },
  SPY: { price: 610.25, change: 2.80, changePercent: 0.46 },
  QQQ: { price: 545.90, change: 3.65, changePercent: 0.67 },
  AAPL: { price: 262.30, change: 1.55, changePercent: 0.59 },
  MSFT: { price: 448.50, change: 2.90, changePercent: 0.65 }
};

export function getAllTickers(): string[] {
  const tickers = new Set<string>();
  SIGNALS_CONFIG.forEach(s => tickers.add(s.ticker));
  STOCK_SIGNALS_CONFIG.forEach(s => tickers.add(s.ticker));
  INDEX_OPTIONS_CONFIG.forEach(s => tickers.add(s.ticker));
  HIGH_PROB_CONFIG.forEach(s => tickers.add(s.ticker));
  return Array.from(tickers);
}
