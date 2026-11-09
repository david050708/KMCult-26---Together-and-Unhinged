import React from 'react';
import { X, Shield, Sparkles, FolderArchive, Tag, Database } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FCFBF7] w-full max-w-2xl max-h-[85vh] rounded-xl border border-[#D6C4A8] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#E8DDC9]/70 border-b border-[#D6C4A8] flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#493D35]">
              About KMCult&apos;26
            </h2>
            <p className="text-xs text-[#8B735E]">
              Shared Digital Memory &amp; Swarm Reconstruction Platform
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8B735E] hover:text-[#493D35] rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs text-[#493D35] leading-relaxed">
          <div>
            <h3 className="font-serif text-sm font-semibold text-[#493D35] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#8B735E]" />
              The Swarm Reconstruction Concept
            </h3>
            <p className="text-[#8B735E]">
              KMCult&apos;26 is crafted as a living scrapbook. When opening any memory folder, spatial animated stationery tools reconstruct the photographs into an organic composition, followed by automatic strolling and interactive spatial physics.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold text-[#493D35] mb-1.5 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#8B735E]" />
              Anonymous Memories &amp; Passcode Protection
            </h3>
            <p className="text-[#8B735E]">
              All memories in the archive are anonymous by default—focusing on our shared experiences rather than individual ownership. The creator assigns an independent editing passcode to each folder. Viewing is open to the entire batch, while modifications and deletions require the passcode.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold text-[#493D35] mb-1.5 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#8B735E]" />
              150-Student Directory — Tagging Exclusively
            </h3>
            <p className="text-[#8B735E]">
              The authoritative 150-student directory is dedicated strictly to tagging classmates in photographs and memories. It is not used for tracking creators or upload attribution, keeping the platform egalitarian and collective.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-sm font-semibold text-[#493D35] mb-1.5 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#8B735E]" />
              Permanent Storage
            </h3>
            <p className="text-[#8B735E]">
              Memories and uploaded photographs are stored permanently in the central backend database and server file storage. They persist across sessions, devices, and reboots, ensuring our batch archive remains intact for years to come.
            </p>
          </div>
        </div>

        <div className="px-6 py-3 bg-[#E8DDC9]/50 border-t border-[#D6C4A8] flex items-center justify-between text-xs text-[#8B735E]">
          <span>Kilpauk Medical College, Chennai · MBBS Class of 2026</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-[#D6C4A8] rounded text-[#493D35] hover:bg-[#F5F0E6]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
