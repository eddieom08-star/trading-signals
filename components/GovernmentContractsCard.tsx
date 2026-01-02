'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Building2, Shield, Zap, Heart, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { PriceDisplay, PriceData } from './PriceDisplay';

interface GovernmentContract {
  awardDescription: string;
  totalValue: number;
  actionDate: string;
  agency: string;
  recipient: string;
}

interface ContractSignal {
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

interface GovernmentContractsCardProps {
  prices: Record<string, PriceData>;
  onSignalFound?: (signal: ContractSignal) => void;
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

function SectorBadge({ sector }: { sector: string }) {
  const config: Record<string, { icon: typeof Shield; color: string }> = {
    Defense: { icon: Shield, color: 'text-red-400 bg-red-500/20 border-red-500/30' },
    Healthcare: { icon: Heart, color: 'text-pink-400 bg-pink-500/20 border-pink-500/30' },
    Energy: { icon: Zap, color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' },
    Security: { icon: Shield, color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' },
    Infrastructure: { icon: Building2, color: 'text-orange-400 bg-orange-500/20 border-orange-500/30' },
    Government: { icon: Building2, color: 'text-gray-400 bg-gray-500/20 border-gray-500/30' }
  };
  const { icon: Icon, color } = config[sector] || config.Government;
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${color}`}>
      <Icon size={12} />
      {sector}
    </span>
  );
}

function formatValue(value: number): string {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function GovernmentContractsCard({ prices, onSignalFound }: GovernmentContractsCardProps) {
  const [signals, setSignals] = useState<ContractSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchContractSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contract signals');
      }

      const data = await response.json();
      setSignals(data.signals || []);
      setLastFetch(new Date());

      // Notify parent of high-strength signals
      if (onSignalFound) {
        data.signals?.filter((s: ContractSignal) => s.signalStrength === 'HIGH')
          .forEach((s: ContractSignal) => onSignalFound(s));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractSignals();
    // Refresh every 10 minutes
    const interval = setInterval(fetchContractSignals, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="text-blue-400" size={20} />
            <h2 className="text-lg font-semibold text-white">Government Contracts</h2>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
              USA Spending
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="text-xs text-gray-500">
                Updated {lastFetch.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchContractSignals}
              disabled={loading}
              className="p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Finnhub government spending data - Last 60 days - Defense & contractors
        </p>
      </div>

      <div className="p-4">
        {loading && signals.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={20} />
            Scanning government contracts...
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto mb-2 text-red-400" size={24} />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchContractSignals}
              className="mt-2 text-xs text-gray-400 hover:text-white"
            >
              Try again
            </button>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="mx-auto mb-2 opacity-50" size={24} />
            <p className="text-sm">No significant contract activity detected</p>
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
                      <SectorBadge sector={signal.sector} />
                      <SignalStrengthBadge strength={signal.signalStrength} />
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
                    <span className="text-green-400 font-mono">
                      {formatValue(signal.totalContractValue)}
                    </span>
                    <span>{signal.contractCount} contract{signal.contractCount > 1 ? 's' : ''}</span>
                    <span className="truncate max-w-[200px]">{signal.primaryAgency}</span>
                    <span>Latest: {signal.latestDate}</span>
                  </div>
                </div>

                {expanded === signal.symbol && (
                  <div className="border-t border-gray-700 p-3 space-y-3">
                    <div className="text-xs text-gray-400 mb-2">Recent Contracts</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {signal.contracts.map((contract, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-gray-900/50 rounded p-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-white font-medium line-clamp-2">
                                {contract.awardDescription || 'Contract Award'}
                              </div>
                              <div className="text-gray-500 mt-1">
                                {contract.agency} | {contract.actionDate}
                              </div>
                            </div>
                            <div className="text-green-400 font-mono whitespace-nowrap">
                              {formatValue(contract.totalValue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs">TOTAL VALUE</div>
                          <div className="text-green-400 font-mono">
                            {formatValue(signal.totalContractValue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">CONTRACTS</div>
                          <div className="text-white font-mono">
                            {signal.contractCount}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">PRIMARY AGENCY</div>
                          <div className="text-white text-xs truncate">
                            {signal.primaryAgency}
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
