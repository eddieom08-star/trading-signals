'use client';

import { ChevronDown, ChevronUp, Target, AlertTriangle } from 'lucide-react';
import { StockSignal } from '@/lib/config';
import { postStockSignal } from '@/lib/telegram';
import { TierBadge, ConfidenceBadge, ClusterBadge } from './Badges';
import { PriceDisplay, PriceData } from './PriceDisplay';
import { TelegramButton } from './TelegramButton';

interface StockSignalCardProps {
  config: StockSignal;
  priceData?: PriceData;
  expanded: boolean;
  onToggle: () => void;
}

export function StockSignalCard({ config, priceData, expanded, onToggle }: StockSignalCardProps) {
  const price = priceData?.price || 100;
  const stopLoss = price * (1 - config.stockConfig.stopPercent);
  const targets = config.stockConfig.targets.map(t => price * (1 + t));

  return (
    <div className="bg-gray-900 border border-cyan-700/50 rounded-lg overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-800/50"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-white">{config.ticker}</span>
            <span className="text-sm font-semibold text-cyan-400">STOCK</span>
            <TierBadge tier={config.tier} />
            <ConfidenceBadge level={config.confidence} />
            {config.isCluster && <ClusterBadge />}
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
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span>
            {config.politicians.map(p => `${p.name} (${p.party}-${p.state})`).join(', ')}
          </span>
          <span className="text-gray-600">|</span>
          <span>{config.amount}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-700 p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <Target size={12} />
                CATALYST
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                {config.catalyst.map((c, i) => (
                  <li key={i}>&bull; {c}</li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                <AlertTriangle size={12} />
                RISKS
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                {config.risks.map((r, i) => (
                  <li key={i}>&bull; {r}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-gray-800 border border-cyan-500/30 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-cyan-400 font-mono">STOCK POSITION</div>
              <TelegramButton
                onPost={() => postStockSignal(config, price)}
                label="Post Signal"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs">CURRENT</div>
                <div className="text-white font-mono">${price.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">STOP LOSS</div>
                <div className="text-red-400 font-mono">
                  ${stopLoss.toFixed(2)} (-{(config.stockConfig.stopPercent * 100).toFixed(0)}%)
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">T1</div>
                <div className="text-green-400 font-mono">
                  ${targets[0].toFixed(2)} (+{(config.stockConfig.targets[0] * 100).toFixed(0)}%)
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">T2</div>
                <div className="text-green-400 font-mono">
                  ${targets[1].toFixed(2)} (+{(config.stockConfig.targets[1] * 100).toFixed(0)}%)
                </div>
              </div>
            </div>

            {targets[2] && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs">T3 (MOON)</div>
                    <div className="text-green-400 font-mono">
                      ${targets[2].toFixed(2)} (+{(config.stockConfig.targets[2] * 100).toFixed(0)}%)
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">RISK/REWARD</div>
                    <div className="text-white font-mono">
                      1:{(config.stockConfig.targets[0] / config.stockConfig.stopPercent).toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
