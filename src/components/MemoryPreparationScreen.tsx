import React, { useEffect, useState } from 'react';
import { Sparkles, Compass, Layers, CheckCircle2 } from 'lucide-react';
import type { Photograph } from '../types/index.ts';

interface MemoryPreparationScreenProps {
  memoryTitle: string;
  photos: Photograph[];
  onReady: () => void;
}

export const MemoryPreparationScreen: React.FC<MemoryPreparationScreenProps> = ({
  memoryTitle,
  photos,
  onReady,
}) => {
  const [prepProgress, setPrepProgress] = useState(0);
  const initialBatchCount = Math.min(3, Math.max(1, photos.length));

  useEffect(() => {
    const duration = 1600; // 1.6s initial batch analysis & planning
    const start = performance.now();
    let frameId: number;

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      setPrepProgress(t);

      if (t < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          onReady();
        }, 400);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [onReady]);

  const currentAnalysingIdx = Math.min(initialBatchCount - 1, Math.floor(prepProgress * initialBatchCount));

  return (
    <div className="min-h-[75vh] w-full flex flex-col items-center justify-center p-4 sm:p-8 animate-vintage-scale-fade">
      <div className="paper-sheet w-full max-w-xl p-8 sm:p-10 rounded-xs border-2 border-[#493D35] shadow-[6px_8px_0px_rgba(73,61,53,0.25)] relative overflow-hidden text-center space-y-6">
        {/* Vintage Washi Tape Top Tab */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-5 bg-[#E8DDC9] border border-dashed border-[#493D35]/40 rounded-xs transform -rotate-1 pointer-events-none" />

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8DDC9]/60 border border-[#493D35]/30 rounded-xs text-xs font-serif font-bold text-[#493D35]">
            <Sparkles className="w-3.5 h-3.5 text-[#66715C] animate-spin" />
            <span>Swarm Agent Pipeline: Initial Preparation</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#493D35]">
            Analysing &quot;{memoryTitle}&quot;
          </h2>
          <p className="text-xs sm:text-sm text-[#8B735E] font-handwritten">
            Stationery agents are planning composition, contours, and color distribution for the initial memory batch.
          </p>
        </div>

        {/* Pencil planning diagram mock visual */}
        <div className="relative py-6 px-4 bg-[#FAF6EE] border border-dashed border-[#8B735E]/40 rounded-xs space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#8B735E]">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Initial Batch ({initialBatchCount} of {photos.length} photos)</span>
            </span>
            <span>{Math.round(prepProgress * 100)}% Prepared</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-[#E8DDC9] rounded-xs overflow-hidden border border-[#493D35]/30">
            <div
              className="h-full bg-[#493D35] transition-all duration-75"
              style={{ width: `${prepProgress * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            {photos.slice(0, 3).map((p, idx) => {
              const isDone = prepProgress > (idx + 1) / initialBatchCount;
              const isCurrent = idx === currentAnalysingIdx && prepProgress < 1;
              return (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xs border text-left flex flex-col justify-between transition-all ${
                    isDone
                      ? 'bg-[#66715C]/10 border-[#66715C]'
                      : isCurrent
                      ? 'bg-[#E8DDC9] border-[#493D35] shadow-xs'
                      : 'bg-white/60 border-[#D6C4A8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-[#493D35]">Photo {idx + 1}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#66715C]" />
                    ) : isCurrent ? (
                      <Compass className="w-3.5 h-3.5 text-[#8B735E] animate-spin" />
                    ) : (
                      <span className="text-[9px] text-[#8B735E]">Queued</span>
                    )}
                  </div>
                  <p className="text-[10px] font-handwritten text-[#493D35] truncate">
                    {p.caption || 'Reference analysis'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-[#8B735E] italic">
          Once prepared, the initial batch will enter reconstruction immediately while remaining photographs are prepared concurrently in the background.
        </p>
      </div>
    </div>
  );
};
