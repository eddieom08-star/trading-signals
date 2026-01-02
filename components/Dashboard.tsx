'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Wifi, WifiOff, Settings, Activity } from 'lucide-react';
import {
  SIGNALS_CONFIG,
  STOCK_SIGNALS_CONFIG,
  INDEX_OPTIONS_CONFIG,
  HIGH_PROB_CONFIG,
  FALLBACK_PRICES,
  getAllTickers
} from '@/lib/config';
import { roundToStrike, calcOptionMetrics } from '@/lib/calculations';
import { TelegramAlert, postAlert } from '@/lib/telegram';
import { PriceData } from './PriceDisplay';
import { OptionsSignalCard } from './OptionsSignalCard';
import { StockSignalCard } from './StockSignalCard';
import { IndexOptionsCard } from './IndexOptionsCard';
import { HighProbCard } from './HighProbCard';
import { AlertPanel } from './AlertPanel';
import { InsiderSignalsCard } from './InsiderSignalsCard';
import { GovernmentContractsCard } from './GovernmentContractsCard';

export default function Dashboard() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<TelegramAlert[]>([]);
  const [expandedOptions, setExpandedOptions] = useState<string | null>('NVDA');
  const [expandedStock, setExpandedStock] = useState<string | null>('PLTR');
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [showSettings, setShowSettings] = useState(false);
  const [telegramAutoPost, setTelegramAutoPost] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processedAlertsRef = useRef<Set<string>>(new Set());

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'granted') setNotificationsEnabled(true);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setNotificationsEnabled(permission === 'granted');
  };

  const playAlertSound = useCallback((type: string = 'info') => {
    if (!soundEnabled || !audioContextRef.current) return;

    try {
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'success') {
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1108, ctx.currentTime + 0.1);
        oscillator.type = 'sine';
      } else if (type === 'danger') {
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        oscillator.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
        oscillator.frequency.setValueAtTime(440, ctx.currentTime + 0.3);
        oscillator.type = 'square';
      } else {
        oscillator.frequency.setValueAtTime(660, ctx.currentTime);
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        oscillator.type = 'sine';
      }

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error('Audio error:', e);
    }
  }, [soundEnabled]);

  const sendNotification = useCallback((title: string, body: string) => {
    if (!notificationsEnabled || notificationPermission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📊</text></svg>'
      });
    } catch (e) {
      console.error('Notification error:', e);
    }
  }, [notificationsEnabled, notificationPermission]);

  const fetchPrices = useCallback(async () => {
    try {
      const uniqueTickers = getAllTickers();
      const symbols = uniqueTickers.join(',');

      // Use our Finnhub API route
      const response = await fetch(`/api/prices?symbols=${symbols}`, {
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prices');
      }

      const data = await response.json();

      if (data.success && data.prices) {
        const newPrices: Record<string, PriceData> = {};

        Object.entries(data.prices).forEach(([symbol, quote]: [string, unknown]) => {
          const q = quote as { price: number; change: number; changePercent: number };
          newPrices[symbol] = {
            price: q.price,
            change: q.change,
            changePercent: q.changePercent
          };
        });

        if (Object.keys(newPrices).length > 0) {
          setPrices(newPrices);
          setLastUpdate(new Date());
          setConnected(true);
          setError(null);
          setLoading(false);
          checkAlerts(newPrices);
        } else {
          throw new Error('No price data received');
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setConnected(false);
      setError('Using fallback prices - Finnhub API unavailable');
      setPrices(FALLBACK_PRICES);
      setLoading(false);
    }
  }, []);

  const checkAlerts = useCallback((newPrices: Record<string, PriceData>) => {
    const newAlerts: TelegramAlert[] = [];

    SIGNALS_CONFIG.forEach(sig => {
      const priceData = newPrices[sig.ticker];
      if (!priceData) return;

      const price = priceData.price;
      const strike = roundToStrike(price, sig.optionsConfig.strikeOffset);
      const otmPercent = ((strike - price) / price) * 100;

      if (otmPercent < 5) {
        const alertKey = `${sig.ticker}-itm-${Math.floor(Date.now() / 60000)}`;
        if (!processedAlertsRef.current.has(alertKey)) {
          processedAlertsRef.current.add(alertKey);
          newAlerts.push({
            type: 'success',
            ticker: sig.ticker,
            message: `Approaching ITM - $${strike} now ${otmPercent.toFixed(1)}% OTM`,
            time: new Date(),
            priority: 'high'
          });
        }
      }

      if (Math.abs(priceData.changePercent) > 3) {
        const alertKey = `${sig.ticker}-move-${Math.floor(Date.now() / 60000)}`;
        if (!processedAlertsRef.current.has(alertKey)) {
          processedAlertsRef.current.add(alertKey);
          const type = priceData.changePercent > 0 ? 'success' : 'warning';
          newAlerts.push({
            type,
            ticker: sig.ticker,
            message: `Large move: ${priceData.changePercent > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%`,
            time: new Date(),
            priority: 'high'
          });
        }
      }
    });

    STOCK_SIGNALS_CONFIG.forEach(sig => {
      const priceData = newPrices[sig.ticker];
      if (!priceData) return;

      if (priceData.changePercent < -5) {
        const alertKey = `${sig.ticker}-stop-${Math.floor(Date.now() / 60000)}`;
        if (!processedAlertsRef.current.has(alertKey)) {
          processedAlertsRef.current.add(alertKey);
          const stopPrice = priceData.price * (1 - sig.stockConfig.stopPercent);
          newAlerts.push({
            type: 'danger',
            ticker: sig.ticker,
            message: `Down ${priceData.changePercent.toFixed(2)}% - Stop at $${stopPrice.toFixed(2)}`,
            time: new Date(),
            priority: 'critical'
          });
        }
      }

      if (priceData.changePercent > sig.stockConfig.targets[0] * 100) {
        const alertKey = `${sig.ticker}-target-${Math.floor(Date.now() / 60000)}`;
        if (!processedAlertsRef.current.has(alertKey)) {
          processedAlertsRef.current.add(alertKey);
          newAlerts.push({
            type: 'success',
            ticker: sig.ticker,
            message: 'Hit T1 target! Consider partial profits',
            time: new Date(),
            priority: 'high'
          });
        }
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 15));

      // Play sound and send notification for each new alert
      newAlerts.forEach(alert => {
        playAlertSound(alert.type);
        sendNotification(`${alert.ticker} Alert`, alert.message);

        // Auto-post to Telegram if enabled
        if (telegramAutoPost) {
          postAlert(alert);
        }
      });
    }
  }, [playAlertSound, sendNotification, telegramAutoPost]);

  const dismissAlert = (index: number) => setAlerts(prev => prev.filter((_, i) => i !== index));
  const clearAllAlerts = () => setAlerts([]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const testAlert = () => {
    const testAlertData: TelegramAlert = {
      type: 'success',
      ticker: 'TEST',
      message: 'Test alert - notifications working!',
      time: new Date(),
      priority: 'high'
    };
    setAlerts(prev => [testAlertData, ...prev]);
    playAlertSound('success');
    sendNotification('Test Alert', 'Notifications are working correctly!');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-800 pb-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                CONGRESSIONAL TRADING INTELLIGENCE
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Live Options & Stock Signals - Auto-refresh 30s
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                {connected ? (
                  <Wifi size={14} className="text-green-400" />
                ) : (
                  <WifiOff size={14} className="text-amber-400" />
                )}
                <span className={connected ? 'text-green-400' : 'text-amber-400'}>
                  {connected ? 'LIVE' : 'ESTIMATED'}
                </span>
              </div>
              {lastUpdate && (
                <span className="text-xs text-gray-500 hidden sm:inline">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <Settings size={16} />
              </button>
              <button
                onClick={fetchPrices}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
              {error}
            </div>
          )}

          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-3">Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramAutoPost}
                    onChange={(e) => setTelegramAutoPost(e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  Auto-post alerts to Telegram
                </label>
                <button
                  onClick={testAlert}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
                >
                  Test Alert System
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Options Signals */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Options Signals</h2>
              </div>
              <div className="space-y-3">
                {SIGNALS_CONFIG.map(config => (
                  <OptionsSignalCard
                    key={config.ticker}
                    config={config}
                    priceData={prices[config.ticker]}
                    expanded={expandedOptions === config.ticker}
                    onToggle={() => setExpandedOptions(
                      expandedOptions === config.ticker ? null : config.ticker
                    )}
                  />
                ))}
              </div>
            </section>

            {/* Stock Signals */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-cyan-400" />
                <h2 className="text-lg font-semibold text-white">Stock Signals</h2>
              </div>
              <div className="space-y-3">
                {STOCK_SIGNALS_CONFIG.map(config => (
                  <StockSignalCard
                    key={config.ticker}
                    config={config}
                    priceData={prices[config.ticker]}
                    expanded={expandedStock === config.ticker}
                    onToggle={() => setExpandedStock(
                      expandedStock === config.ticker ? null : config.ticker
                    )}
                  />
                ))}
              </div>
            </section>

            {/* Live Insider Activity Scanner */}
            <section>
              <InsiderSignalsCard
                prices={prices}
                onSignalFound={(signal) => {
                  const alertKey = `insider-${signal.symbol}-${signal.netDirection}-${Math.floor(Date.now() / 300000)}`;
                  if (!processedAlertsRef.current.has(alertKey)) {
                    processedAlertsRef.current.add(alertKey);
                    const newAlert: TelegramAlert = {
                      type: signal.netDirection === 'BUY' ? 'success' : signal.netDirection === 'SELL' ? 'warning' : 'info',
                      ticker: signal.symbol,
                      message: `Insider ${signal.netDirection} - $${(signal.totalValue / 1000000).toFixed(1)}M by ${signal.insiderCount} insider(s)`,
                      time: new Date(),
                      priority: 'high'
                    };
                    setAlerts(prev => [newAlert, ...prev].slice(0, 15));
                    playAlertSound(newAlert.type);
                    sendNotification(`${signal.symbol} Insider Alert`, newAlert.message);
                    if (telegramAutoPost) postAlert(newAlert);
                  }
                }}
              />
            </section>

            {/* Government Contracts Scanner */}
            <section>
              <GovernmentContractsCard
                prices={prices}
                onSignalFound={(signal) => {
                  const alertKey = `contract-${signal.symbol}-${Math.floor(Date.now() / 600000)}`;
                  if (!processedAlertsRef.current.has(alertKey)) {
                    processedAlertsRef.current.add(alertKey);
                    const newAlert: TelegramAlert = {
                      type: 'success',
                      ticker: signal.symbol,
                      message: `New ${signal.sector} contracts - $${(signal.totalContractValue / 1000000).toFixed(0)}M`,
                      time: new Date(),
                      priority: 'normal'
                    };
                    setAlerts(prev => [newAlert, ...prev].slice(0, 15));
                    playAlertSound('info');
                    sendNotification(`${signal.symbol} Contract Alert`, newAlert.message);
                    if (telegramAutoPost) postAlert(newAlert);
                  }
                }}
              />
            </section>

            {/* Index Options */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Index Options</h2>
              </div>
              <div className="space-y-3">
                {INDEX_OPTIONS_CONFIG.map(config => (
                  <IndexOptionsCard
                    key={config.ticker}
                    config={config}
                    priceData={prices[config.ticker]}
                  />
                ))}
              </div>
            </section>

            {/* High Probability Options */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">High Probability ITM Calls</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {HIGH_PROB_CONFIG.map(config => (
                  <HighProbCard
                    key={config.ticker}
                    config={config}
                    priceData={prices[config.ticker]}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AlertPanel
              alerts={alerts}
              onDismiss={dismissAlert}
              onClearAll={clearAllAlerts}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              notificationsEnabled={notificationsEnabled}
              onToggleNotifications={() => setNotificationsEnabled(!notificationsEnabled)}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={requestNotificationPermission}
            />

            {/* Quick Stats */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Total Signals</span>
                  <span className="text-white font-mono">
                    {SIGNALS_CONFIG.length + STOCK_SIGNALS_CONFIG.length}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tier 1 Signals</span>
                  <span className="text-green-400 font-mono">
                    {SIGNALS_CONFIG.filter(s => s.tier === 1).length +
                     STOCK_SIGNALS_CONFIG.filter(s => s.tier === 1).length}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Cluster Trades</span>
                  <span className="text-purple-400 font-mono">
                    {SIGNALS_CONFIG.filter(s => s.isCluster).length +
                     STOCK_SIGNALS_CONFIG.filter(s => s.isCluster).length}
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Active Alerts</span>
                  <span className="text-amber-400 font-mono">{alerts.length}</span>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Legend</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/50 rounded">
                    TIER 1
                  </span>
                  <span className="text-gray-400">High conviction</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 rounded">
                    TIER 2
                  </span>
                  <span className="text-gray-400">Moderate conviction</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/50 rounded">
                    CLUSTER
                  </span>
                  <span className="text-gray-400">Multiple politicians</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
          <p>
            Data for educational purposes only. Not financial advice.
            Trade at your own risk.
          </p>
        </div>
      </div>
    </div>
  );
}
