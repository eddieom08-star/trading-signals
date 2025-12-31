'use client';

import { useState } from 'react';
import { Send, Check, X, Loader2 } from 'lucide-react';

interface TelegramButtonProps {
  onPost: () => Promise<{ success: boolean; error?: string }>;
  label?: string;
  size?: 'sm' | 'md';
}

export function TelegramButton({ onPost, label = 'Post to Telegram', size = 'sm' }: TelegramButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setStatus('loading');
    setError(null);

    const result = await onPost();

    if (result.success) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } else {
      setStatus('error');
      setError(result.error || 'Failed to post');
      setTimeout(() => {
        setStatus('idle');
        setError(null);
      }, 3000);
    }
  };

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-xs gap-1'
    : 'px-3 py-2 text-sm gap-2';

  const iconSize = size === 'sm' ? 12 : 16;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={status === 'loading'}
        className={`flex items-center ${sizeClasses} rounded font-medium transition-colors
          ${status === 'idle' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
          ${status === 'loading' ? 'bg-blue-600/50 text-white cursor-wait' : ''}
          ${status === 'success' ? 'bg-green-600 text-white' : ''}
          ${status === 'error' ? 'bg-red-600 text-white' : ''}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {status === 'idle' && <Send size={iconSize} />}
        {status === 'loading' && <Loader2 size={iconSize} className="animate-spin" />}
        {status === 'success' && <Check size={iconSize} />}
        {status === 'error' && <X size={iconSize} />}
        <span>
          {status === 'idle' && label}
          {status === 'loading' && 'Sending...'}
          {status === 'success' && 'Sent!'}
          {status === 'error' && 'Failed'}
        </span>
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-red-900 border border-red-700 rounded text-xs text-red-200 whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
}
