import React from 'react';
import { ArrowRight } from 'lucide-react';

interface IntroMessageModalProps {
  onContinue: () => void;
}

export const IntroMessageModal: React.FC<IntroMessageModalProps> = ({ onContinue }) => {
  return (
    <div className="w-full max-w-xl p-4 sm:p-6 my-auto animate-in fade-in duration-700">
      <div className="scrapbook-paper-card rounded-2xl p-8 sm:p-12 relative overflow-hidden">
        {/* Vintage Paper Tape Graphic */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#E8DDC9]/90 border border-dashed border-[#8B735E]/40 rounded-sm transform -rotate-1 pointer-events-none" />

        <div className="space-y-6 text-center font-handwritten text-[#493D35]">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#8B735E]">
            Knock Knock. Who&apos;s there ?
          </h2>

          <div className="py-2">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-wide text-[#493D35] leading-snug">
              One key, all memories. No gatekeeping
            </p>
          </div>

          <p className="text-lg sm:text-xl text-[#8B735E] font-medium leading-relaxed max-w-md mx-auto">
            One key opens everyone&apos;s photos, memories, and all our goofy moments.
          </p>

          <div className="pt-6 flex justify-center">
            <button
              onClick={onContinue}
              className="px-8 py-3 bg-[#493D35] text-[#F5F0E6] hover:bg-[#382E28] rounded-xl text-sm font-handwritten tracking-wider uppercase shadow-md transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <span>Open the Chronicle</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
