'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { IndexOption } from '@/lib/config';
import { roundToStrike, calcOptionMetrics, getGreekRating } from '@/lib/calculations';
import { PriceDisplay, PriceData } from './PriceDisplay';

interface IndexOptionsCardProps {
  config: IndexOption;
  priceData?: PriceData;
}

const stratColors = {
  green: 'border-green-500/30 bg-green-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  red: 'border-red-500/30 bg-red-500/5'
};

const stratTextColors = {
  green: 'text-green-400',
  amber: 'text-amber-400',
  red: 'text-red-400'
};

const dotColors = {
  green: 'bg-green-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400'
};

export function IndexOptionsCard({ config, priceData }: IndexOptionsCardProps) {
  const [expanded, setExpanded] = useState(true);
  const price = priceData?.price || 500;

  const strategyData = config.strategies.map(strat => {
    const strike = roundToStrike(price, strat.strikeOffset);
    const otmPercent = ((strike - price) / price) * 100;
    const metrics = calcOptionMetrics(price, strike, strat.dte, config.iv);
    const breakeven = strike + parseFloat(metrics.premium);
    const maxLoss = parseFloat(metrics.premium) * 100;

    return { ...strat, strike, otmPercent, metrics, breakeven, maxLoss };
  });

  return (
    <div className="bg-gray-900 border border-blue-700/50 rounded-lg overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-800/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-white">{config.ticker}</span>
            <span className="text-sm font-semibold text-blue-400">INDEX</span>
            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded">
              {config.name}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <PriceDisplay data={priceData} />
            {expanded ? (
              <ChevronUp size={20} className="text-gray-500" />
            ) : (
              <ChevronDown size={20} className="text-gray-500" />
            )}
          </div>
        </div>
        <div className="text-xs text-gray-400">{config.description}</div>
      </div>

      {expanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {strategyData.map((strat, i) => (
              <div key={i} className={`rounded-lg border p-4 ${stratColors[strat.color]}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-semibold ${stratTextColors[strat.color]}`}>
                    {strat.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    parseInt(strat.metrics.pop) >= 35
                      ? 'bg-green-500/20 text-green-400'
                      : parseInt(strat.metrics.pop) >= 25
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {strat.metrics.pop}% Prob. of Profit
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Strike</span>
                    <span className="text-white font-mono">
                      ${strat.strike} ({strat.otmPercent.toFixed(1)}% OTM)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">DTE</span>
                    <span className="text-white font-mono">{strat.dte}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Premium</span>
                    <span className="text-amber-400 font-mono">${strat.metrics.premium}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Breakeven</span>
                    <span className="text-white font-mono">${strat.breakeven.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Max Loss</span>
                    <span className="text-red-400 font-mono">${strat.maxLoss.toFixed(0)}/ct</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-gray-500 text-xs mb-2">Greeks</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {(['delta', 'gamma', 'theta', 'vega'] as const).map(greek => {
                      const value = strat.metrics[greek];
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
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-800 rounded p-3">
            <div className="text-xs text-gray-400 mb-2">WHY {config.ticker}?</div>
            <ul className="text-sm text-gray-300 space-y-1">
              {config.notes.map((note, i) => (
                <li key={i}>&bull; {note}</li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-500 border-t border-gray-700 pt-3">
            <div>
              <span className="text-gray-400">Implied Vol:</span>{' '}
              <span className="text-white font-mono">{(config.iv * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-gray-400">Avg Daily Range:</span>{' '}
              <span className="text-white font-mono">
                ${(price * config.iv / Math.sqrt(252)).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Weekly Expected Move:</span>{' '}
              <span className="text-white font-mono">
                &plusmn;${(price * config.iv / Math.sqrt(52)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
