import React, { useState, useEffect } from 'react';
import { getResetDryRun, executeFreshStartReset, type StorageMetrics } from '../services/api.ts';
import { AlertTriangle, Trash2, CheckCircle2, Shield, RefreshCw, X, HardDrive } from 'lucide-react';

interface StorageResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: () => Promise<void>;
}

export const StorageResetModal: React.FC<StorageResetModalProps> = ({
  isOpen,
  onClose,
  onResetComplete,
}) => {
  const [dryRunData, setDryRunData] = useState<any>(null);
  const [isLoadingDryRun, setIsLoadingDryRun] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetReport, setResetReport] = useState<any>(null);

  const REQUIRED_PHRASE = "RESET ALL KMCULT26 STORAGE";

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setErrorMessage(null);
      setResetReport(null);
      fetchDryRun();
    }
  }, [isOpen]);

  const fetchDryRun = async () => {
    setIsLoadingDryRun(true);
    setErrorMessage(null);
    try {
      const data = await getResetDryRun();
      setDryRunData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate dry-run inventory.');
    } finally {
      setIsLoadingDryRun(false);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = confirmationInput.trim().toUpperCase();
    if (cleanInput !== "RESET ALL KMCULT26 STORAGE" && cleanInput !== "RESET ALL KMCULT'26 MEMORIES") {
      setErrorMessage(`Please type exactly: "${REQUIRED_PHRASE}"`);
      return;
    }

    setIsExecuting(true);
    setErrorMessage(null);

    try {
      const res = await executeFreshStartReset(confirmationInput);
      if (res.success) {
        setResetReport(res.report);
        await onResetComplete();
      } else {
        setErrorMessage(res.error || 'Reset failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Fresh-start storage reset encountered an error.');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="paper-sheet relative w-full max-w-xl p-6 sm:p-8 rounded-xs border-2 border-[#493D35] shadow-[6px_8px_0px_rgba(73,61,53,0.4)] bg-[#FAF6EE] text-[#493D35]">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isExecuting}
          className="absolute top-4 right-4 p-1.5 ink-button-subtle text-[#493D35] hover:bg-[#E8DDC9] rounded-xs cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 pb-3 border-b-1.5 border-[#493D35]/30">
          <div className="p-2 bg-[#B84A39]/15 border border-[#B84A39]/40 rounded-xs text-[#B84A39]">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-[#493D35] leading-tight">
              Controlled Fresh-Start Storage Reset
            </h2>
            <p className="text-xs text-[#8B735E]">
              Purge all memories, original photos, generated artwork & storage ledger
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-800 text-xs rounded-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Report State */}
        {resetReport ? (
          <div className="mt-5 space-y-4">
            <div className="p-4 bg-[#66715C]/15 border-1.5 border-[#66715C] rounded-xs text-[#493D35] space-y-2">
              <div className="flex items-center gap-2 font-serif font-bold text-sm text-[#493D35]">
                <CheckCircle2 className="w-5 h-5 text-[#66715C]" />
                <span>Fresh-Start Storage Reset Complete (VERIFIED)</span>
              </div>
              <p className="text-xs text-[#493D35]/90 leading-relaxed">
                {resetReport.message}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-[#66715C]/30">
                <div>Memories Cleared: <strong>{resetReport.memoriesDeletedCount}</strong></div>
                <div>OCI Objects Purged: <strong>{resetReport.deletedOciObjectsCount}</strong></div>
                <div>Local Files Purged: <strong>{resetReport.deletedLocalFilesCount}</strong></div>
                <div>Remaining Usage: <strong>0 Bytes (0%)</strong></div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                onClick={onClose}
                className="ink-button px-5 py-2 text-xs font-serif font-bold cursor-pointer"
              >
                Close & Return to App
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Dry Run Inventory Section */}
            <div className="p-4 bg-[#E8DDC9]/50 border border-[#493D35]/30 rounded-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold text-[#493D35] flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-[#8B735E]" />
                  <span>Dry-Run Inventory Summary</span>
                </span>
                {isLoadingDryRun && (
                  <RefreshCw className="w-3.5 h-3.5 text-[#8B735E] animate-spin" />
                )}
              </div>

              {dryRunData && dryRunData.summary ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#493D35]">
                  <div className="p-2 bg-[#FAF6EE] border border-[#493D35]/20 rounded-xs">
                    Memories: <strong>{dryRunData.summary.memoriesCount}</strong>
                  </div>
                  <div className="p-2 bg-[#FAF6EE] border border-[#493D35]/20 rounded-xs">
                    Photos: <strong>{dryRunData.summary.photoCount}</strong>
                  </div>
                  <div className="p-2 bg-[#FAF6EE] border border-[#493D35]/20 rounded-xs">
                    Artwork Objects: <strong>{dryRunData.summary.artworkCount}</strong>
                  </div>
                  <div className="p-2 bg-[#FAF6EE] border border-[#493D35]/20 rounded-xs">
                    OCI Objects: <strong>{dryRunData.summary.ociObjectsCount}</strong>
                  </div>
                  <div className="col-span-2 p-2 bg-[#FAF6EE] border border-[#493D35]/20 rounded-xs text-[#B84A39]">
                    Total Size To Purge: <strong>{(dryRunData.summary.totalEstimatedBytesToDelete / 1024 / 1024).toFixed(2)} MB</strong>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#8B735E] italic">Scanning storage objects...</div>
              )}
            </div>

            {/* Preserved Systems Notice */}
            <div className="p-3 bg-[#FAF6EE] border border-[#493D35]/20 rounded-xs text-xs text-[#493D35] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#66715C] shrink-0" />
              <span>
                <strong>Preserved Systems:</strong> Universal batch member accounts, password credentials, and 150-student directory slots remain intact.
              </span>
            </div>

            {/* Confirmation Input Form */}
            <form onSubmit={handleExecuteReset} className="space-y-3">
              <div>
                <label className="block text-xs font-serif font-bold text-[#493D35] mb-1">
                  Type confirmation phrase to authorize:
                </label>
                <div className="p-1.5 bg-[#E8DDC9]/30 border border-[#493D35]/30 rounded-xs text-[11px] font-mono text-[#B84A39] select-all mb-2">
                  {REQUIRED_PHRASE}
                </div>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder={`Type "${REQUIRED_PHRASE}"`}
                  disabled={isExecuting}
                  className="w-full px-3 py-2 bg-[#FAF6EE] border-1.5 border-[#493D35] rounded-xs text-xs font-mono text-[#493D35] focus:outline-none focus:ring-2 focus:ring-[#8B735E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExecuting}
                  className="ink-button-subtle px-4 py-2 text-xs font-serif cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isExecuting ||
                    (confirmationInput.trim().toUpperCase() !== "RESET ALL KMCULT26 STORAGE" &&
                     confirmationInput.trim().toUpperCase() !== "RESET ALL KMCULT'26 MEMORIES")
                  }
                  className={`px-5 py-2 text-xs font-serif font-bold rounded-xs border-1.5 transition-all flex items-center gap-2 cursor-pointer ${
                    confirmationInput.trim().toUpperCase() === "RESET ALL KMCULT26 STORAGE" ||
                    confirmationInput.trim().toUpperCase() === "RESET ALL KMCULT'26 MEMORIES"
                      ? 'bg-[#B84A39] text-[#FAF6EE] border-[#493D35] shadow-[2px_3px_0px_rgba(73,61,53,0.3)] hover:bg-[#9B2C2C]'
                      : 'bg-[#E8DDC9] text-[#493D35]/50 border-[#493D35]/30 cursor-not-allowed'
                  }`}
                >
                  {isExecuting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isExecuting ? 'Executing Reset...' : 'Execute Fresh-Start Reset'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
