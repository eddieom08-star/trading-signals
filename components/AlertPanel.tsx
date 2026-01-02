'use client';

import { X, Bell, Send } from 'lucide-react';
import { TelegramAlert, postAlert } from '@/lib/telegram';

interface AlertPanelProps {
  alerts: TelegramAlert[];
  onDismiss: (index: number) => void;
  onClearAll: () => void;
}

export function AlertPanel({
  alerts,
  onDismiss,
  onClearAll
}: AlertPanelProps) {
  const handlePostAllAlerts = async () => {
    for (const alert of alerts) {
      await postAlert(alert);
    }
  };

  const alertColors = {
    success: 'border-green-500/50 bg-green-500/10',
    warning: 'border-amber-500/50 bg-amber-500/10',
    danger: 'border-red-500/50 bg-red-500/10',
    info: 'border-blue-500/50 bg-blue-500/10'
  };

  const alertTextColors = {
    success: 'text-green-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    info: 'text-blue-400'
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-white">Alerts</span>
          {alerts.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <>
              <button
                onClick={handlePostAllAlerts}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                title="Post all alerts to Telegram"
              >
                <Send size={12} />
                Post All
              </button>
              <button
                onClick={onClearAll}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No active alerts
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start justify-between gap-3 p-3 rounded border ${alertColors[alert.type]}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold ${alertTextColors[alert.type]}`}>
                    {alert.ticker}
                  </span>
                  {alert.priority === 'critical' && (
                    <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                      CRITICAL
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-300">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {alert.time.toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => postAlert(alert)}
                  className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                  title="Post to Telegram"
                >
                  <Send size={12} />
                </button>
                <button
                  onClick={() => onDismiss(index)}
                  className="p-1 text-gray-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
