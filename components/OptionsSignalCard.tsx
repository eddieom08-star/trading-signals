'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Target, AlertTriangle, Zap } from 'lucide-react';
import { OptionsSignal } from '@/lib/config';
import { roundToStrike, calcOptionMetrics } from '@/lib/calculations';
import { postOptionsSignal } from '@/lib/telegram';
import { TierBadge, ConfidenceBadge, ClusterBadge } from './Badges';
import { PriceDisplay, PriceData } from './PriceDisplay';
import { GreekIndicator, GreekScoreBadge } from './GreekIndicator';
import { TelegramButton } from './TelegramButton';

interface OptionsSignalCardProps {
  config: OptionsSignal;
  priceData?: PriceData;
  expanded: boolean;
  onToggle: () => void;
}

export function OptionsSignalCard({ config, priceData, expanded, onToggle }: OptionsSignalCardProps) {
  const price = priceData?.price || 100;
  const strike = roundToStrike(price, config.optionsConfig.strikeOffset);
  const otmPercent = ((strike - price) / price) * 100;
  const metrics = calcOptionMetrics(price, strike, config.optionsConfig.dte);
  const breakeven = strike + parseFloat(metrics.premium);
  const maxLoss = parseFloat(metrics.premium) * 100;
  const sizing = `${Math.floor(5000 / maxLoss)}-${Math.floor(10000 / maxLoss)} contracts`;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-800/50"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-white">{config.ticker}</span>
            <span className="text-sm font-semibold text-green-400">{config.direction}</span>
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
          <span>{config.transaction} &bull; {config.amount}</span>
          <span className="text-gray-600">|</span>
          <span>Lag: {config.lag}d</span>
          {config.winRate && (
            <span className="text-green-400" title="Historical win rate of this politician's disclosed trades">
              {config.winRate}% Hist. WR
            </span>
          )}
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

          <div className="bg-gray-800 border border-amber-500/30 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-amber-400 font-mono flex items-center gap-2">
                <Zap size={12} />
                OTM CALL - {config.optionsConfig.dte} DTE
              </div>
              <TelegramButton
                onPost={() => postOptionsSignal(config, price)}
                label="Post Signal"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <div className="text-gray-500 text-xs">CONTRACT</div>
                <div className="text-white font-mono text-xs">
                  {config.ticker} {config.optionsConfig.expiry} ${strike} Call
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">STOCK PRICE</div>
                <div className="text-white font-mono">${price.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">STRIKE</div>
                <div className="text-white font-mono">
                  ${strike} ({otmPercent.toFixed(1)}% OTM)
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">DTE</div>
                <div className="text-white font-mono">{config.optionsConfig.dte}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <div className="text-gray-500 text-xs">EST. PREMIUM</div>
                <div className="text-amber-400 font-mono">${metrics.premium}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">BREAKEVEN</div>
                <div className="text-white font-mono">${breakeven.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">MAX LOSS</div>
                <div className="text-red-400 font-mono">${maxLoss.toFixed(0)}/ct</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">SIZING</div>
                <div className="text-white text-xs">{sizing}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
              <div>
                <div className="text-gray-500 text-xs">PROB. OF PROFIT</div>
                <div className={`font-mono ${parseInt(metrics.pop) > 25 ? 'text-green-400' : 'text-amber-400'}`}>
                  {metrics.pop}%
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">PROB. OF 2x</div>
                <div className="text-white font-mono">{metrics.prob100}%</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">STOP (Premium)</div>
                <div className="text-red-400 font-mono">
                  ${(parseFloat(metrics.premium) * 0.4).toFixed(2)} (-60%)
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">STOP (Stock)</div>
                <div className="text-red-400 font-mono">${(price * 0.95).toFixed(2)}</div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-3">
              <div className="flex items-center justify-between mb-3">
                <div className="text-gray-500 text-xs">GREEKS (Estimated) - Hover for details</div>
                <GreekScoreBadge metrics={metrics} />
              </div>
              <div className="flex flex-wrap gap-2">
                <GreekIndicator label="Delta" value={metrics.delta} greek="delta" />
                <GreekIndicator label="Gamma" value={metrics.gamma} greek="gamma" />
                <GreekIndicator label="Theta" value={metrics.theta} greek="theta" suffix="/d" />
                <GreekIndicator label="Vega" value={metrics.vega} greek="vega" />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Favorable
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Neutral
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Unfavorable
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
