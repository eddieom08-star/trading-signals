export interface OptionMetrics {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  premium: string;
  pop: string;
  prob100: string;
}

export interface GreekRating {
  rating: 'green' | 'amber' | 'red';
  tooltip: string;
}

export function roundToStrike(price: number, offset: number): number {
  const target = price * (1 + offset);
  if (price > 500) return Math.round(target / 10) * 10;
  if (price > 100) return Math.round(target / 5) * 5;
  return Math.round(target);
}

function calcBlackScholesD1(S: number, K: number, T: number, r: number, sigma: number): number {
  return (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
}

function normCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

export function calcOptionMetrics(stockPrice: number, strike: number, dte: number, iv: number = 0.35): OptionMetrics {
  const T = dte / 365;
  const r = 0.045;

  const d1 = calcBlackScholesD1(stockPrice, strike, T, r, iv);
  const d2 = d1 - iv * Math.sqrt(T);

  const delta = normCDF(d1);
  const gamma = Math.exp(-d1 * d1 / 2) / (stockPrice * iv * Math.sqrt(2 * Math.PI * T));
  const theta = -(stockPrice * iv * Math.exp(-d1 * d1 / 2)) / (2 * Math.sqrt(2 * Math.PI * T)) / 365;
  const vega = stockPrice * Math.sqrt(T) * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI) / 100;
  const callPrice = stockPrice * normCDF(d1) - strike * Math.exp(-r * T) * normCDF(d2);
  const pop = normCDF(d2) * 100;

  return {
    delta: parseFloat(delta.toFixed(2)),
    gamma: parseFloat(gamma.toFixed(3)),
    theta: parseFloat(theta.toFixed(2)),
    vega: parseFloat(vega.toFixed(2)),
    premium: Math.max(0.1, callPrice).toFixed(2),
    pop: Math.max(5, Math.min(50, pop)).toFixed(0),
    prob100: Math.max(3, pop * 0.5).toFixed(0)
  };
}

export function getGreekRating(greek: string, value: number): GreekRating {
  if (greek === 'delta') {
    if (value >= 0.20 && value <= 0.35) {
      return { rating: 'green', tooltip: 'Optimal leverage & probability' };
    } else if ((value >= 0.15 && value < 0.20) || (value > 0.35 && value <= 0.45)) {
      return { rating: 'amber', tooltip: 'Acceptable range' };
    } else {
      return {
        rating: 'red',
        tooltip: value < 0.15 ? 'Low probability of profit' : 'Expensive, reduced leverage'
      };
    }
  }

  if (greek === 'gamma') {
    if (value >= 0.010) {
      return { rating: 'green', tooltip: 'Fast delta acceleration' };
    } else if (value >= 0.005) {
      return { rating: 'amber', tooltip: 'Moderate responsiveness' };
    } else {
      return { rating: 'red', tooltip: 'Slow delta pickup on moves' };
    }
  }

  if (greek === 'theta') {
    if (value >= -0.20) {
      return { rating: 'green', tooltip: 'Low time decay' };
    } else if (value >= -0.40) {
      return { rating: 'amber', tooltip: 'Moderate decay - monitor' };
    } else {
      return { rating: 'red', tooltip: 'Heavy decay eating premium' };
    }
  }

  if (greek === 'vega') {
    if (value >= 0.25) {
      return { rating: 'green', tooltip: 'Benefits from IV expansion' };
    } else if (value >= 0.15) {
      return { rating: 'amber', tooltip: 'Moderate vol sensitivity' };
    } else {
      return { rating: 'red', tooltip: 'Limited IV benefit' };
    }
  }

  return { rating: 'amber', tooltip: '' };
}

export function getGreekScoreTotal(metrics: OptionMetrics): { score: number; maxScore: number; percentage: number; label: string; rating: 'green' | 'amber' | 'red' } {
  const scores = {
    delta: getGreekRating('delta', metrics.delta).rating,
    gamma: getGreekRating('gamma', metrics.gamma).rating,
    theta: getGreekRating('theta', metrics.theta).rating,
    vega: getGreekRating('vega', metrics.vega).rating
  };

  const scoreValues = { green: 2, amber: 1, red: 0 };
  const totalScore = Object.values(scores).reduce((sum, r) => sum + scoreValues[r], 0);
  const maxScore = 8;
  const percentage = (totalScore / maxScore) * 100;

  let overallRating: 'green' | 'amber' | 'red';
  let label: string;

  if (percentage >= 75) {
    overallRating = 'green';
    label = 'Strong Setup';
  } else if (percentage >= 50) {
    overallRating = 'amber';
    label = 'Moderate Setup';
  } else {
    overallRating = 'red';
    label = 'Weak Setup';
  }

  return { score: totalScore, maxScore, percentage, label, rating: overallRating };
}

export function calcPoPForITM(price: number, strike: number, dte: number, iv: number): number {
  const T = dte / 365;
  const r = 0.045;
  const d1 = calcBlackScholesD1(price, strike, T, r, iv);
  const d2 = d1 - iv * Math.sqrt(T);
  return normCDF(d2) * 100;
}
