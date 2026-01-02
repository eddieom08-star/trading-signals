'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Users, TrendingUp, TrendingDown, AlertCircle, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { PriceDisplay, PriceData } from './PriceDisplay';

interface InsiderTransaction {
  symbol: string;
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionCode: string;
  transactionPrice: number;
}

interface InsiderSignal {
  symbol: string;
  totalShares: number;
  totalValue: number;
  netDirection: 'BUY' | 'SELL' | 'MIXED';
  transactions: InsiderTransaction[];
  insiderCount: number;
  avgPrice: number;
  latestDate: string;
  signalStrength: 'HIGH' | 'MEDIUM' | 'LOW';
  isCluster: boolean;
}

interface InsiderSignalsCardProps {
  prices: Record<string, PriceData>;
  onSignalFound?: (signal: InsiderSignal) => void;
}

function SignalStrengthBadge({ strength }: { strength: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const colors = {
    HIGH: 'bg-green-500/20 text-green-400 border-green-500/30',
    MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    LOW: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-mono rounded border ${colors[strength]}`}>
      {strength}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' | 'MIXED' }) {
  const colors = {
    BUY: 'text-green-400',
    SELL: 'text-red-400',
    MIXED: 'text-amber-400'
  };
  const icons = {
    BUY: <TrendingUp size={14} />,
    SELL: <TrendingDown size={14} />,
    MIXED: <AlertCircle size={14} />
  };
  return (
    <span className={`flex items-center gap-1 text-sm font-semibold ${colors[direction]}`}>
      {icons[direction]}
      {direction}
    </span>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatShares(shares: number): string {
  if (shares >= 1000000) return `${(shares / 1000000).toFixed(1)}M`;
  if (shares >= 1000) return `${(shares / 1000).toFixed(0)}K`;
  return shares.toFixed(0);
}

export function InsiderSignalsCard({ prices, onSignalFound }: InsiderSignalsCardProps) {
  const [signals, setSignals] = useState<InsiderSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchInsiderSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/insider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insider signals');
      }

      const data = await response.json();
      setSignals(data.signals || []);
      setLastFetch(new Date());

      // Notify parent of high-strength signals
      if (onSignalFound) {
        data.signals?.filter((s: InsiderSignal) => s.signalStrength === 'HIGH')
          .forEach((s: InsiderSignal) => onSignalFound(s));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsiderSignals();
    // Refresh every 5 minutes
    const interval = setInterval(fetchInsiderSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="text-purple-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Insider Activity Scanner</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
              Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-xs text-gray-500">
                Updated {lastFetch.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchInsiderSignals}
              disabled={loading}
              className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Finnhub insider transactions - Last 14 days - Minimum $50K value
        </p>
      </div>

      <div className="p-4">
        {loading && signals.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={20} />
            Scanning for insider activity...
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchInsiderSignals}
              className="mt-2 text-xs text-gray-400 hover:text-white"
            >
              Try again
            </button>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="mx-auto mb-2 opacity-50" size={24} />
            <p className="text-sm">No significant insider activity detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => (
              <div
                key={signal.symbol}
                className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
              >
                <div
                  className="p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
                  onClick={() => setExpanded(expanded === signal.symbol ? null : signal.symbol)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white">{signal.symbol}</span>
                      <DirectionBadge direction={signal.netDirection} />
                      <SignalStrengthBadge strength={signal.signalStrength} />
                      {signal.isCluster && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
                          CLUSTER
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {prices[signal.symbol] && (
                        <PriceDisplay data={prices[signal.symbol]} />
                      )}
                      {expanded === signal.symbol ? (
                        <ChevronUp size={16} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} />
                      {formatValue(signal.totalValue)}
                    </span>
                    <span>{formatShares(signal.totalShares)} shares</span>
                    <span>{signal.insiderCount} insider{signal.insiderCount > 1 ? 's' : ''}</span>
                    <span>Latest: {signal.latestDate}</span>
                  </div>
                </div>

                {expanded === signal.symbol && (
                  <div className="border-t border-gray-700 p-3 space-y-3">
                    <div className="text-xs text-gray-400 mb-2">Recent Transactions</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {signal.transactions.map((tx, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-gray-900/50 rounded p-2"
                        >
                          <div>
                            <div className="text-white font-medium">{tx.name}</div>
                            <div className="text-gray-500">{tx.transactionDate}</div>
                          </div>
                          <div className="text-right">
                            <div className={tx.change > 0 ? 'text-green-400' : 'text-red-400'}>
                              {tx.change > 0 ? '+' : ''}{formatShares(Math.abs(tx.change))} shares
                            </div>
                            {tx.transactionPrice > 0 && (
                              <div className="text-gray-500">
                                @ ${tx.transactionPrice.toFixed(2)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs">TOTAL VALUE</div>
                          <div className="text-amber-400 font-mono">
                            {formatValue(signal.totalValue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">AVG PRICE</div>
                          <div className="text-white font-mono">
                            ${signal.avgPrice.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">SIGNAL</div>
                          <div className={`font-mono ${
                            signal.netDirection === 'BUY' ? 'text-green-400' :
                            signal.netDirection === 'SELL' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {signal.netDirection === 'BUY' ? 'Bullish' :
                             signal.netDirection === 'SELL' ? 'Bearish' : 'Mixed'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
