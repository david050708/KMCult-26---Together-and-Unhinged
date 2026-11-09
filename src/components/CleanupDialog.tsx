import React, { useState, useMemo } from 'react';
import { X, Trash2, Calendar, CheckCircle2, AlertTriangle, Loader2, Filter } from 'lucide-react';
import type { Memory } from '../types/index.ts';

interface CleanupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  onConfirm: (payload: { memoryIds?: string[]; olderThanDays?: number; customCutoffDate?: string }) => Promise<void>;
}

export const CleanupDialog: React.FC<CleanupDialogProps> = ({
  isOpen,
  onClose,
  memories,
  onConfirm
}) => {
  const [method, setMethod] = useState<'age' | 'selection'>('age');
  const [ageDays, setAgeDays] = useState<number>(90);
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetsByAge = useMemo(() => {
    const cutoff = customDate ? new Date(customDate).getTime() : Date.now() - (ageDays * 24 * 60 * 60 * 1000);
    return memories.filter(m => new Date(m.createdAt).getTime() < cutoff);
  }, [memories, ageDays, customDate]);

  const photoCount = useMemo(() => {
    const targetMemories = method === 'age' ? targetsByAge : memories.filter(m => selectedIds.has(m.id));
    return targetMemories.reduce((sum, m) => sum + m.photos.length, 0);
  }, [method, targetsByAge, selectedIds, memories]);

  if (!isOpen) return null;

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(memories.map(m => m.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const payload = method === 'age' 
        ? (customDate ? { customCutoffDate: customDate } : { olderThanDays: ageDays })
        : { memoryIds: Array.from(selectedIds) };
      
      await onConfirm(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Cleanup failed. Some objects may have failed to delete.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 animate-vintage-fade-up">
      <div className="paper-sheet w-full max-w-2xl max-h-[90vh] rounded-xs border-2 border-[#493D35] shadow-[5px_6px_0px_rgba(73,61,53,0.25)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#E8DDC9] border-b-1.5 border-[#493D35] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-[#493D35]" />
            <h2 className="font-serif text-lg font-bold text-[#493D35]">Centralized Memory Cleanup</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#493D35] hover:bg-[#493D35]/10 rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="p-4 bg-[#FAF6EE] border-1.5 border-[#493D35] rounded-xs flex items-start gap-3 text-xs text-[#493D35] leading-relaxed shadow-[2px_2px_0px_rgba(73,61,53,0.15)]">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-700 mt-0.5" />
            <div>
              <p className="font-serif font-bold mb-1 text-red-800">Permanent Deletion Warning</p>
              <p className="text-[#493D35]/90">This action will permanently delete memory records from the database AND all associated photograph files from Oracle Cloud Object Storage. This cannot be undone.</p>
            </div>
          </div>

          {/* Method Selector */}
          <div className="flex gap-2 p-1 bg-[#E8DDC9]/40 rounded-xs border-1.5 border-[#493D35]">
            <button
              onClick={() => setMethod('age')}
              className={`flex-1 py-2 text-xs font-serif font-bold rounded-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                method === 'age'
                  ? 'bg-[#493D35] text-[#FAF6EE] shadow-[2px_2px_0px_rgba(73,61,53,0.3)]'
                  : 'bg-transparent text-[#493D35] hover:bg-[#493D35]/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>By Age</span>
            </button>
            <button
              onClick={() => setMethod('selection')}
              className={`flex-1 py-2 text-xs font-serif font-bold rounded-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                method === 'selection'
                  ? 'bg-[#493D35] text-[#FAF6EE] shadow-[2px_2px_0px_rgba(73,61,53,0.3)]'
                  : 'bg-transparent text-[#493D35] hover:bg-[#493D35]/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>By Selection</span>
            </button>
          </div>

          {method === 'age' ? (
            <div className="space-y-4">
              <label className="block text-[11px] font-serif font-bold uppercase tracking-wider text-[#493D35]">
                Cleanup Threshold
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[30, 90, 180, 365].map((days) => (
                  <button
                    key={days}
                    onClick={() => { setAgeDays(days); setCustomDate(''); }}
                    className={`px-3 py-2 text-[11px] rounded-xs border-1.5 transition-all font-serif font-bold cursor-pointer ${
                      ageDays === days && !customDate
                        ? 'bg-[#493D35] text-[#FAF6EE] border-[#493D35] shadow-[2px_2px_0px_rgba(73,61,53,0.25)]'
                        : 'bg-transparent text-[#493D35] border-[#493D35]/60 hover:border-[#493D35]'
                    }`}
                  >
                    {days >= 365 ? '1 Year+' : days >= 180 ? '6 Months+' : `${days} Days+`}
                  </button>
                ))}
              </div>
              
              <div className="pt-2">
                <label className="block text-[11px] font-serif font-bold uppercase tracking-wider text-[#493D35] mb-2">
                  Custom Cutoff Date
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent border-1.5 border-[#493D35] rounded-xs text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#493D35]"
                  />
                  {customDate && (
                    <button 
                      onClick={() => setCustomDate('')}
                      className="ink-button-subtle px-3 py-2 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 bg-[#FAF6EE] rounded-xs border-1.5 border-[#493D35] text-xs shadow-[2px_2px_0px_rgba(73,61,53,0.15)]">
                <p className="text-[#8B735E] mb-2">Targeting memories created before:</p>
                <p className="font-serif font-bold text-base text-[#493D35]">
                  {customDate ? new Date(customDate).toLocaleDateString() : new Date(Date.now() - (ageDays * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                </p>
                <p className="mt-3 font-medium text-[#493D35]">
                  Found <span className="text-[#493D35] font-bold">{targetsByAge.length}</span> matching memories
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#493D35]">
                  Selected: {selectedIds.size} / {memories.length}
                </label>
                <div className="flex gap-3">
                  <button onClick={handleSelectAll} className="ink-button-subtle text-[10px] py-1 px-2 uppercase font-serif font-bold">Select All</button>
                  <button onClick={handleDeselectAll} className="ink-button-subtle text-[10px] py-1 px-2 uppercase font-serif font-bold">Deselect All</button>
                </div>
              </div>
              
              <div className="border-1.5 border-[#493D35] rounded-xs overflow-hidden bg-[#FAF6EE] max-h-[240px] overflow-y-auto divide-y divide-[#493D35]/20 shadow-[2px_2px_0px_rgba(73,61,53,0.15)]">
                {memories.map((m) => (
                  <label 
                    key={m.id} 
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selectedIds.has(m.id) ? 'bg-[#E8DDC9]/60' : 'hover:bg-[#E8DDC9]/30'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(m.id)}
                      onChange={() => handleToggleSelect(m.id)}
                      className="w-4 h-4 rounded-xs border-1.5 border-[#493D35] text-[#493D35] focus:ring-[#493D35]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-serif font-bold text-[#493D35] truncate">{m.title}</p>
                      <p className="text-[10px] text-[#8B735E]">{m.photos.length} photos · {new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border-1.5 border-red-700 rounded-xs flex items-center gap-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#E8DDC9] border-t-1.5 border-[#493D35] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-[11px] text-[#493D35]">
            <p>Ready to delete <span className="font-serif font-bold text-red-700">{method === 'age' ? targetsByAge.length : selectedIds.size}</span> memories</p>
            <p><span className="font-serif font-bold text-red-700">{photoCount}</span> total OCI photograph objects will be removed</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="ink-button-subtle text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isDeleting || (method === 'age' ? targetsByAge.length === 0 : selectedIds.size === 0)}
              className="ink-button bg-red-800 text-[#FAF6EE] text-xs py-2 px-5 font-serif font-bold hover:bg-red-900 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Clearing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm Permanent Clear</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
