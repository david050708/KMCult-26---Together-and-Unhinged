import React from 'react';
import type { StorageMetrics } from '../services/api.ts';
import { Database, HardDrive, AlertTriangle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface StorageUsageBarProps {
  metrics: StorageMetrics | null;
  error?: string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onOpenReset?: () => void;
  className?: string;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const StorageUsageBar: React.FC<StorageUsageBarProps> = ({
  metrics,
  error,
  isLoading = false,
  onRefresh,
  onOpenReset,
  className = '',
}) => {
  if (error) {
    return (
      <div className={`p-3 bg-red-50 border border-red-200 rounded-xl shadow-xs text-xs text-red-700 flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Storage Error: {error}</span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="p-1 hover:text-red-900 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`p-3 bg-[#FCFBF7] border border-[#D6C4A8] rounded-xl shadow-xs text-xs text-[#8B735E] flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#8B735E] animate-pulse" />
          <span>Measuring Oracle Object Storage usage...</span>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="p-1 hover:text-[#493D35] transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  const {
    usedBytes,
    allowanceBytes,
    remainingBytes,
    percentageUsed,
    objectCount,
    provider,
    isOciLive,
    isLimitReached,
  } = metrics;

  // Determine bar fill color based on warning thresholds
  let barColorClass = 'bg-[#66715C]'; // <70%: Sage green
  let badgeColorClass = 'bg-[#66715C]/15 text-[#66715C] border-[#66715C]/30';
  let warningMessage: string | null = null;

  if (percentageUsed >= 100) {
    barColorClass = 'bg-[#9B2C2C]'; // 100%: Critical red
    badgeColorClass = 'bg-red-100 text-red-800 border-red-300';
    warningMessage = 'Storage allowance full (100%). New photograph uploads are temporarily paused.';
  } else if (percentageUsed >= 95) {
    barColorClass = 'bg-[#B84A39]'; // 95%: Prominent crimson warning
    badgeColorClass = 'bg-red-50 text-red-700 border-red-200';
    warningMessage = 'Storage capacity critical (95%+). Please consider removing unnecessary drafts.';
  } else if (percentageUsed >= 85) {
    barColorClass = 'bg-[#C97A3E]'; // 85%: Limited terracotta warning
    badgeColorClass = 'bg-amber-50 text-amber-800 border-amber-200';
    warningMessage = 'Storage capacity is getting limited (85%+).';
  } else if (percentageUsed >= 70) {
    barColorClass = 'bg-[#8B735E]'; // 70%: Subtle amber heads-up
    badgeColorClass = 'bg-[#E8DDC9] text-[#493D35] border-[#D6C4A8]';
  }

  return (
    <div
      className={`p-3.5 sm:p-4 paper-card border-1.5 border-[#493D35] rounded-xs shadow-[2px_3px_0px_rgba(73,61,53,0.15)] transition-all ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#493D35]/20">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-[#493D35] shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-serif font-bold text-[#493D35] tracking-tight">
                Oracle Object Storage
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-xs border border-[#493D35] text-[#493D35]">
                {percentageUsed}% used
              </span>
            </div>
            <p className="text-[10px] text-[#493D35]/70 mt-0.5 truncate max-w-xs sm:max-w-md">
              {provider} · {objectCount} {objectCount === 1 ? 'object' : 'objects'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#493D35] justify-between sm:justify-end">
          <div className="text-right">
            <span className="font-semibold">{formatBytes(usedBytes)}</span>
            <span className="text-[#8B735E]"> / {formatBytes(allowanceBytes)}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="ink-button-subtle p-1 cursor-pointer"
              title="Refresh Storage Usage Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onOpenReset && (
            <button
              onClick={onOpenReset}
              className="ink-button-subtle p-1 text-[#B84A39] hover:bg-[#B84A39]/10 cursor-pointer"
              title="Controlled Fresh-Start Storage Reset"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#B84A39]" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3 relative">
        <div className="h-2.5 w-full bg-[#E8DDC9] rounded-xs overflow-hidden border border-[#493D35] p-0.5 flex items-center">
          <div
            className={`h-full rounded-xs transition-all duration-700 ease-out ${barColorClass}`}
            style={{ width: `${Math.max(1.5, Math.min(100, percentageUsed))}%` }}
          />
        </div>
      </div>

      {/* Text Details */}
      <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-[#493D35]/80">
        <span>Used: {formatBytes(usedBytes)}</span>
        <span>Remaining: {formatBytes(remainingBytes)}</span>
      </div>

      {/* Warning State Banner */}
      {warningMessage && (
        <div className="mt-2.5 p-2 bg-[#FAF6EE] border-1.5 border-[#493D35] rounded-xs flex items-center gap-2 text-xs text-[#493D35]">
          <AlertCircle className="w-4 h-4 text-[#B84A39] shrink-0" />
          <span className="leading-snug">{warningMessage}</span>
        </div>
      )}
    </div>
  );
};
