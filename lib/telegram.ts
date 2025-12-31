import { OptionsSignal, StockSignal } from './config';
import { OptionMetrics, getGreekScoreTotal, roundToStrike, calcOptionMetrics } from './calculations';

export interface TelegramAlert {
  type: 'success' | 'warning' | 'danger' | 'info';
  ticker: string;
  message: string;
  time: Date;
  priority: 'high' | 'critical' | 'normal';
}

export function formatOptionsSignalForTelegram(
  signal: OptionsSignal,
  price: number,
  metrics: OptionMetrics
): string {
  const strike = roundToStrike(price, signal.optionsConfig.strikeOffset);
  const otmPercent = ((strike - price) / price) * 100;
  const scoreData = getGreekScoreTotal(metrics);

  const politicianList = signal.politicians
    .map(p => `${p.name} (${p.party}-${p.state})`)
    .join(', ');

  return `*SIGNAL ALERT: ${signal.ticker} ${signal.direction}*

*Tier ${signal.tier} | ${signal.confidence} Confidence*
${signal.isCluster ? '*CLUSTER TRADE*' : ''}
Politicians: ${politicianList}
Transaction: ${signal.transaction} ${signal.amount}

*Price:* $${price.toFixed(2)}
*Strike:* $${strike} (${otmPercent.toFixed(1)}% OTM)
*DTE:* ${signal.optionsConfig.dte} | Expiry: ${signal.optionsConfig.expiry}

*Greeks:* Delta ${metrics.delta} | Gamma ${metrics.gamma} | Theta ${metrics.theta}/d | Vega ${metrics.vega}
*Setup Score:* ${scoreData.label} (${scoreData.score}/${scoreData.maxScore})

*Catalyst:*
${signal.catalyst.map(c => `• ${c}`).join('\n')}

*Risks:*
${signal.risks.map(r => `• ${r}`).join('\n')}

---
_Congressional Trading Intel_`;
}

export function formatStockSignalForTelegram(
  signal: StockSignal,
  price: number
): string {
  const stopLoss = price * (1 - signal.stockConfig.stopPercent);
  const targets = signal.stockConfig.targets.map(t => price * (1 + t));

  const politicianList = signal.politicians
    .map(p => `${p.name} (${p.party}-${p.state})`)
    .join(', ');

  return `*STOCK SIGNAL: ${signal.ticker} ${signal.direction}*

*Tier ${signal.tier} | ${signal.confidence} Confidence*
${signal.isCluster ? '*CLUSTER TRADE*' : ''}
Politicians: ${politicianList}
Amount: ${signal.amount}

*Current Price:* $${price.toFixed(2)}
*Stop Loss:* $${stopLoss.toFixed(2)} (-${(signal.stockConfig.stopPercent * 100).toFixed(0)}%)

*Targets:*
• T1: $${targets[0].toFixed(2)} (+${(signal.stockConfig.targets[0] * 100).toFixed(0)}%)
• T2: $${targets[1].toFixed(2)} (+${(signal.stockConfig.targets[1] * 100).toFixed(0)}%)
• T3: $${targets[2].toFixed(2)} (+${(signal.stockConfig.targets[2] * 100).toFixed(0)}%)

*Catalyst:*
${signal.catalyst.map(c => `• ${c}`).join('\n')}

*Risks:*
${signal.risks.map(r => `• ${r}`).join('\n')}

---
_Congressional Trading Intel_`;
}

export function formatAlertForTelegram(alert: TelegramAlert): string {
  const emoji = alert.type === 'success' ? '📈' :
                alert.type === 'danger' ? '🚨' :
                alert.type === 'warning' ? '⚠️' : '📊';

  const priorityEmoji = alert.priority === 'critical' ? '🔴' :
                        alert.priority === 'high' ? '🟡' : '🟢';

  return `${emoji} *${alert.ticker} ALERT* ${priorityEmoji}

${alert.message}

_${alert.time.toLocaleString()}_
---
_Congressional Trading Intel_`;
}

export async function sendToTelegram(message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send message' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function postOptionsSignal(
  signal: OptionsSignal,
  price: number
): Promise<{ success: boolean; error?: string }> {
  const strike = roundToStrike(price, signal.optionsConfig.strikeOffset);
  const metrics = calcOptionMetrics(price, strike, signal.optionsConfig.dte);
  const message = formatOptionsSignalForTelegram(signal, price, metrics);
  return sendToTelegram(message);
}

export async function postStockSignal(
  signal: StockSignal,
  price: number
): Promise<{ success: boolean; error?: string }> {
  const message = formatStockSignalForTelegram(signal, price);
  return sendToTelegram(message);
}

export async function postAlert(alert: TelegramAlert): Promise<{ success: boolean; error?: string }> {
  const message = formatAlertForTelegram(alert);
  return sendToTelegram(message);
}
