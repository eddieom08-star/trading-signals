'use client';

import { HighProbOption } from '@/lib/config';
import { roundToStrike, calcOptionMetrics, getGreekRating, calcPoPForITM } from '@/lib/calculations';
import { PriceData } from './PriceDisplay';

interface HighProbCardProps {
  config: HighProbOption;
  priceData?: PriceData;
}

const dotColors = {
  green: 'bg-green-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400'
};

export function HighProbCard({ config, priceData }: HighProbCardProps) {
  const price = priceData?.price || 100;
  const strike = roundToStrike(price, config.strikeOffset);
  const isITM = strike < price;
  const moneyness = isITM ? 'ITM' : strike === price ? 'ATM' : 'OTM';
  const moneynessPercent = Math.abs(((strike - price) / price) * 100);

  const rawPoP = calcPoPForITM(price, strike, config.dte, config.iv);
  const metrics = calcOptionMetrics(price, strike, config.dte, config.iv);
  const breakeven = strike + parseFloat(metrics.premium);
  const intrinsicValue = isITM ? price - strike : 0;
  const timeValue = parseFloat(metrics.premium) - intrinsicValue;

  return (
    <div className="bg-gray-800 border border-emerald-500/30 rounded-lg p-4 hover:border-emerald-500/50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white">{config.ticker}</span>
          <span className="text-xs text-gray-400">{config.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-bold rounded ${
            rawPoP >= 70
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
              : rawPoP >= 50
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
          }`}>
            {rawPoP.toFixed(0)}% Prob. of Profit
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-white font-mono">${price.toFixed(2)}</span>
        {priceData?.change !== undefined && (
          <span className={`text-sm font-mono ${priceData.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {priceData.change >= 0 ? '+' : ''}{priceData.change.toFixed(2)} ({priceData.changePercent?.toFixed(2)}%)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
        <div>
          <div className="text-gray-500 text-xs">STRIKE</div>
          <div className="text-white font-mono">
            ${strike}
            <span className={`ml-1 text-xs ${isITM ? 'text-emerald-400' : 'text-amber-400'}`}>
              ({moneynessPercent.toFixed(1)}% {moneyness})
            </span>
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">DTE</div>
          <div className="text-white font-mono">{config.dte}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">PREMIUM</div>
          <div className="text-amber-400 font-mono">${metrics.premium}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">BREAKEVEN</div>
          <div className="text-white font-mono">${breakeven.toFixed(2)}</div>
        </div>
      </div>

      {isITM && (
        <div className="grid grid-cols-2 gap-3 text-sm mb-3 p-2 bg-emerald-500/10 rounded">
          <div>
            <div className="text-gray-500 text-xs">INTRINSIC VALUE</div>
            <div className="text-emerald-400 font-mono">${intrinsicValue.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs">TIME VALUE</div>
            <div className="text-amber-400 font-mono">${timeValue.toFixed(2)}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 text-xs mb-3">
        {(['delta', 'gamma', 'theta', 'vega'] as const).map(greek => {
          const value = metrics[greek];
          const { rating } = getGreekRating(greek, value);
          const symbol = { delta: 'Delta', gamma: 'Gamma', theta: 'Theta', vega: 'Vega' }[greek];
          const suffix = greek === 'theta' ? '/d' : '';

          return (
            <div key={greek} className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dotColors[rating]}`}></span>
              <span className="text-gray-400">{symbol}</span>
              <span className="font-mono text-white">
                {value.toFixed(greek === 'gamma' ? 3 : 2)}{suffix}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
        {config.rationale}
      </div>
    </div>
  );
}
