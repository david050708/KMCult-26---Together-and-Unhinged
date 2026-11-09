import React, { useState } from 'react';
import { authenticateMemoryEdit } from '../services/api.ts';
import { Lock, KeyRound, AlertCircle, X, Shield, Unlock } from 'lucide-react';

interface MemoryPasswordModalProps {
  isOpen: boolean;
  memoryId: string;
  memoryTitle: string;
  actionDescription?: string;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export const MemoryPasswordModal: React.FC<MemoryPasswordModalProps> = ({
  isOpen,
  memoryId,
  memoryTitle,
  actionDescription = 'edit this memory',
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the memory password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authenticateMemoryEdit(memoryId, password);
      if (res.success && res.token) {
        onSuccess(res.token);
        onClose();
        setPassword('');
      } else {
        setError(res.error || 'Incorrect password for this memory.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 animate-vintage-fade-up">
      <div className="paper-sheet w-full max-w-md rounded-xs border-2 border-[#493D35] shadow-[5px_6px_0px_rgba(73,61,53,0.25)] overflow-hidden flex flex-col">
        {/* Header Strip */}
        <div className="px-4 sm:px-6 py-4 bg-[#E8DDC9] border-b-1.5 border-[#493D35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#493D35]" />
            <h3 className="font-serif font-bold text-sm text-[#493D35]">
              Memory Editing Passcode
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Passcode Modal"
            className="p-1.5 text-[#493D35] hover:bg-[#493D35]/10 rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <div className="mb-4">
            <span className="text-[11px] uppercase tracking-wider text-[#8B735E] font-medium">
              Target Memory
            </span>
            <h4 className="text-base font-serif font-bold text-[#493D35] mt-0.5">
              &ldquo;{memoryTitle}&rdquo;
            </h4>
            <p className="mt-2 text-xs text-[#8B735E] leading-relaxed">
              This memory is password-protected by its creator. Enter its editing passcode to {actionDescription}.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50/80 border border-red-700 rounded-xs flex items-start gap-2.5 text-xs text-red-900">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#493D35] mb-1.5">
                Memory Passcode
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter editing password..."
                autoFocus
                required
                className="w-full px-3.5 py-2.5 text-xs text-[#493D35]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="ink-button-subtle text-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !password}
                className="ink-button text-xs font-semibold"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{loading ? 'Verifying...' : 'Unlock Editing'}</span>
              </button>
            </div>
          </form>

          <div className="mt-5 pt-3 border-t border-[#493D35]/20 text-[11px] text-[#8B735E] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#66715C] shrink-0" />
            <span>Public viewing is always unlocked. Passcode is only required for modifications.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
