'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Zap, TrendingUp, TrendingDown, Users, Building2, Loader2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { PriceDisplay, PriceData } from './PriceDisplay';

interface DynamicSignal {
  ticker: string;
  direction: 'LONG' | 'SHORT';
  signalType: 'INSIDER' | 'CONTRACT' | 'COMBINED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  reasons: string[];
  insiderData?: {
    netDirection: 'BUY' | 'SELL' | 'MIXED';
    totalValue: number;
    insiderCount: number;
    latestDate: string;
  };
  contractData?: {
    totalValue: number;
    contractCount: number;
    primaryAgency: string;
    sector: string;
  };
  suggestedEntry?: {
    strikeOffset: number;
    dte: number;
    stopPercent: number;
  };
  generatedAt: string;
}

interface DynamicSignalsCardProps {
  prices: Record<string, PriceData>;
  onSignalFound?: (signal: DynamicSignal) => void;
}

function ConfidenceBadge({ confidence }: { confidence: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const colors = {
    HIGH: 'bg-green-500/20 text-green-400 border-green-500/30',
    MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    LOW: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-bold rounded border ${colors[confidence]}`}>
      {confidence}
    </span>
  );
}

function SignalTypeBadge({ type }: { type: 'INSIDER' | 'CONTRACT' | 'COMBINED' }) {
  const config = {
    INSIDER: { icon: Users, color: 'text-purple-400 bg-purple-500/20 border-purple-500/30', label: 'Insider' },
    CONTRACT: { icon: Building2, color: 'text-blue-400 bg-blue-500/20 border-blue-500/30', label: 'Contract' },
    COMBINED: { icon: Sparkles, color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', label: 'Combined' }
  };
  const { icon: Icon, color, label } = config[type];
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: 'LONG' | 'SHORT' }) {
  return (
    <span className={`flex items-center gap-1 text-sm font-semibold ${direction === 'LONG' ? 'text-green-400' : 'text-red-400'}`}>
      {direction === 'LONG' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {direction}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-gray-400';
  return (
    <span className={`text-xs font-mono ${color}`} title="Signal strength score (0-100)">
      Score: {score}
    </span>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function DynamicSignalsCard({ prices, onSignalFound }: DynamicSignalsCardProps) {
  const [signals, setSignals] = useState<DynamicSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to generate signals');
      }

      const data = await response.json();
      setSignals(data.signals || []);
      setLastFetch(new Date());

      // Notify parent of high-confidence signals
      if (onSignalFound) {
        data.signals?.filter((s: DynamicSignal) => s.confidence === 'HIGH')
          .forEach((s: DynamicSignal) => onSignalFound(s));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    // Refresh every 10 minutes
    const interval = setInterval(fetchSignals, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="text-yellow-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Auto-Generated Signals</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
              AI Scored
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-xs text-gray-500">
                {lastFetch.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchSignals}
              disabled={loading}
              className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Signals generated from Finnhub insider transactions + government contracts
        </p>
      </div>

      <div className="p-4">
        {loading && signals.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={20} />
            Scanning 40+ tickers for signals...
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchSignals}
              className="mt-2 text-xs text-gray-400 hover:text-white"
            >
              Try again
            </button>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Zap className="mx-auto mb-2 opacity-50" size={24} />
            <p className="text-sm">No signals above threshold</p>
            <p className="text-xs mt-1">Minimum score: 50</p>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((signal) => (
              <div
                key={signal.ticker}
                className={`bg-gray-800 border rounded-lg overflow-hidden ${
                  signal.confidence === 'HIGH' ? 'border-green-500/50' :
                  signal.confidence === 'MEDIUM' ? 'border-amber-500/30' : 'border-gray-700'
                }`}
              >
                <div
                  className="p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
                  onClick={() => setExpanded(expanded === signal.ticker ? null : signal.ticker)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-lg font-bold text-white">{signal.ticker}</span>
                      <DirectionBadge direction={signal.direction} />
                      <ConfidenceBadge confidence={signal.confidence} />
                      <SignalTypeBadge type={signal.signalType} />
                    </div>
                    <div className="flex items-center gap-4">
                      {prices[signal.ticker] && (
                        <PriceDisplay data={prices[signal.ticker]} />
                      )}
                      <ScoreBadge score={signal.score} />
                      {expanded === signal.ticker ? (
                        <ChevronUp size={16} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-500" />
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {signal.reasons[0]}
                  </div>
                </div>

                {expanded === signal.ticker && (
                  <div className="border-t border-gray-700 p-3 space-y-3">
                    {/* Reasons */}
                    <div>
                      <div className="text-xs text-gray-500 mb-2">SIGNAL REASONS</div>
                      <ul className="space-y-1">
                        {signal.reasons.map((reason, idx) => (
                          <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-green-400 mt-1">•</span>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Data breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                      {signal.insiderData && (
                        <div className="bg-gray-900/50 rounded p-2">
                          <div className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                            <Users size={12} />
                            INSIDER DATA
                          </div>
                          <div className="text-sm text-white">
                            {formatValue(signal.insiderData.totalValue)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {signal.insiderData.insiderCount} insider(s) • {signal.insiderData.netDirection}
                          </div>
                        </div>
                      )}
                      {signal.contractData && (
                        <div className="bg-gray-900/50 rounded p-2">
                          <div className="text-xs text-blue-400 mb-1 flex items-center gap-1">
                            <Building2 size={12} />
                            CONTRACT DATA
                          </div>
                          <div className="text-sm text-white">
                            {formatValue(signal.contractData.totalValue)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {signal.contractData.contractCount} contracts • {signal.contractData.sector}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Suggested entry */}
                    {signal.suggestedEntry && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3">
                        <div className="text-xs text-amber-400 mb-2 flex items-center gap-1">
                          <Zap size={12} />
                          SUGGESTED ENTRY (Based on confidence)
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <div className="text-gray-500 text-xs">STRIKE</div>
                            <div className="text-white font-mono">
                              {(signal.suggestedEntry.strikeOffset * 100).toFixed(0)}% OTM
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs">DTE</div>
                            <div className="text-white font-mono">
                              {signal.suggestedEntry.dte}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 text-xs">STOP</div>
                            <div className="text-red-400 font-mono">
                              -{(signal.suggestedEntry.stopPercent * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-600 text-right">
                      Generated: {new Date(signal.generatedAt).toLocaleString()}
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
