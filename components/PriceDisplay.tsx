'use client';

export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
}

export function PriceDisplay({ data }: { data?: PriceData }) {
  if (!data) {
    return <span className="text-gray-500">--</span>;
  }

  const isUp = data.change >= 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-white font-mono text-lg">${data.price?.toFixed(2)}</span>
      <span className={`text-sm font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{data.change?.toFixed(2)} ({isUp ? '+' : ''}{data.changePercent?.toFixed(2)}%)
      </span>
    </div>
  );
}

export function CompactPrice({ data }: { data?: PriceData }) {
  if (!data) {
    return <span className="text-gray-500 text-sm">--</span>;
  }

  const isUp = data.change >= 0;

  return (
    <div className="flex items-center gap-1">
      <span className="text-white font-mono">${data.price?.toFixed(2)}</span>
      <span className={`text-xs font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        ({isUp ? '+' : ''}{data.changePercent?.toFixed(2)}%)
      </span>
    </div>
  );
}
