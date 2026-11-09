import React from 'react';
import { LogOut, Users } from 'lucide-react';

interface TopNavProps {
  currentView: 'gallery' | 'swarm';
  isAuthenticated?: boolean;
  onNavigateHome: () => void;
  onOpenDirectory: () => void;
  onOpenRosterManager: () => void;
  onOpenAbout: () => void;
  onLogout: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  isAuthenticated = true,
  onNavigateHome,
  onOpenDirectory,
  onOpenRosterManager,
  onOpenAbout,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#F5F0E6]/90 backdrop-blur-md border-b border-[#D6C4A8]/60 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Anchor Slot for Docked Handwritten Title */}
        <div
          onClick={isAuthenticated ? onNavigateHome : undefined}
          className={`flex items-center gap-2 w-48 sm:w-56 h-10 shrink-0 ${
            isAuthenticated ? 'cursor-pointer' : 'cursor-default'
          }`}
          title="KMCult'26 · Kilpauk Medical College, Chennai"
        >
          {/* Reserved space for docked HandwrittenTitle vector */}
          <div className="w-36 h-8" />
          <span className="hidden lg:inline-block text-[10px] uppercase tracking-widest text-[#8B735E] font-medium border-l border-[#D6C4A8] pl-2 py-0.5">
            Kilpauk
          </span>
        </div>

        {isAuthenticated ? (
          <>
            {/* Zone 2: Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#8B735E]">
              <button
                onClick={onNavigateHome}
                className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#493D35] pb-0.5 ${
                  currentView === 'gallery' ? 'text-[#493D35] border-b border-[#493D35]' : ''
                }`}
              >
                Memories
              </button>
              <button
                onClick={onOpenDirectory}
                className="transition-colors whitespace-nowrap shrink-0 hover:text-[#493D35] pb-0.5"
                title="Browse 150 students for memory and photo tagging"
              >
                Tag Directory
              </button>
              <button
                onClick={onOpenRosterManager}
                className="transition-colors whitespace-nowrap shrink-0 hover:text-[#493D35] pb-0.5"
              >
                Authoritative Roster
              </button>
              <button
                onClick={onOpenAbout}
                className="transition-colors whitespace-nowrap shrink-0 hover:text-[#493D35] pb-0.5"
              >
                About
              </button>
            </nav>

            {/* Zone 3: Universal Batch Session & Logout */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#8B735E] bg-[#E8DDC9]/50 rounded-md border border-[#D6C4A8]/60">
                <Users className="w-3.5 h-3.5 text-[#66715C]" />
                <span>Batch &apos;26 Access</span>
              </span>

              <button
                onClick={onLogout}
                title="Lock Chronicle & Sign Out"
                className="p-1.5 text-[#8B735E] hover:text-[#493D35] hover:bg-[#E8DDC9]/50 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs font-handwritten text-[#8B735E]">
            <span>MBBS Batch of 2026 Archive</span>
          </div>
        )}
      </div>
    </header>
  );
};
