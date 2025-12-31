'use client';

import { Users } from 'lucide-react';

export function TierBadge({ tier }: { tier: 1 | 2 }) {
  const colors = {
    1: 'bg-green-500/20 text-green-400 border-green-500/50',
    2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-mono border rounded ${colors[tier]}`}>
      TIER {tier}
    </span>
  );
}

export function ConfidenceBadge({ level }: { level: 'HIGH' | 'MEDIUM' }) {
  const colors = {
    HIGH: 'bg-emerald-500/20 text-emerald-400',
    MEDIUM: 'bg-amber-500/20 text-amber-400'
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded ${colors[level]}`}>
      {level}
    </span>
  );
}

export function ClusterBadge() {
  return (
    <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded flex items-center gap-1">
      <Users size={10} />
      CLUSTER
    </span>
  );
}

export function DirectionBadge({ direction, type }: { direction: 'LONG' | 'SHORT'; type: 'options' | 'stock' | 'index' }) {
  const colors = {
    options: 'text-green-400',
    stock: 'text-cyan-400',
    index: 'text-blue-400'
  };

  const labels = {
    options: direction,
    stock: 'STOCK',
    index: 'INDEX'
  };

  return (
    <span className={`text-sm font-semibold ${colors[type]}`}>
      {labels[type]}
    </span>
  );
}
