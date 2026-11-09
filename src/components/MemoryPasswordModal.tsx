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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FCFBF7] w-full max-w-md rounded-xl border border-[#D6C4A8] shadow-2xl overflow-hidden flex flex-col">
        {/* Header Strip */}
        <div className="px-6 py-4 bg-[#E8DDC9]/80 border-b border-[#D6C4A8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#8B735E]" />
            <h3 className="font-serif font-bold text-sm text-[#493D35]">
              Memory Editing Passcode
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8B735E] hover:text-[#493D35] rounded transition-colors"
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
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
                className="w-full px-3.5 py-2.5 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35] placeholder:text-[#8B735E]/50 focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-[#8B735E] hover:text-[#493D35]"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !password}
                className="px-4 py-2 bg-[#493D35] hover:bg-[#382E28] text-[#F5F0E6] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{loading ? 'Verifying...' : 'Unlock Editing'}</span>
              </button>
            </div>
          </form>

          <div className="mt-5 pt-3 border-t border-[#D6C4A8]/40 text-[11px] text-[#8B735E]/80 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#66715C] shrink-0" />
            <span>Public viewing is always unlocked. Passcode is only required for modifications.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
