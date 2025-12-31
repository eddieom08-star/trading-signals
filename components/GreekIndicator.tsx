'use client';

import { getGreekRating, OptionMetrics, getGreekScoreTotal } from '@/lib/calculations';

interface GreekIndicatorProps {
  label: string;
  value: number;
  greek: string;
  suffix?: string;
}

const ratingColors = {
  green: 'bg-green-500/20 text-green-400 border-green-500/50',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
  red: 'bg-red-500/20 text-red-400 border-red-500/50'
};

const dotColors = {
  green: 'bg-green-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400'
};

export function GreekIndicator({ label, value, greek, suffix = '' }: GreekIndicatorProps) {
  const { rating, tooltip } = getGreekRating(greek, value);

  return (
    <div className="group relative">
      <div className={`flex items-center gap-2 px-3 py-2 rounded border ${ratingColors[rating]}`}>
        <span className={`w-2 h-2 rounded-full ${dotColors[rating]}`}></span>
        <span className="text-gray-400 text-xs">{label}</span>
        <span className="font-mono font-semibold">
          {typeof value === 'number' ? value.toFixed(greek === 'gamma' ? 3 : 2) : value}
          {suffix}
        </span>
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-xs text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full ${dotColors[rating]}`}></span>
          <span className="font-semibold">
            {rating === 'green' ? 'Favorable' : rating === 'amber' ? 'Neutral' : 'Unfavorable'}
          </span>
        </div>
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </div>
    </div>
  );
}

export function GreekScoreBadge({ metrics }: { metrics: OptionMetrics }) {
  const { score, maxScore, label, rating } = getGreekScoreTotal(metrics);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${ratingColors[rating]}`}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-xs opacity-75">({score}/{maxScore})</span>
    </div>
  );
}

export function CompactGreeks({ metrics }: { metrics: OptionMetrics }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-xs">
      {(['delta', 'gamma', 'theta', 'vega'] as const).map((greek) => {
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
  );
}
