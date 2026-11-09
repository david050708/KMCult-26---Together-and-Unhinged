import React, { useState } from 'react';
import { LogOut, Users, Menu, X, BookOpen, Tag, ShieldCheck, Info } from 'lucide-react';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="w-full bg-transparent border-b border-[#493D35]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-6">
        {/* Zone 1: Brand Anchor Slot for Docked Handwritten Title */}
        <div
          onClick={isAuthenticated ? () => { closeMobileMenu(); onNavigateHome(); } : undefined}
          className={`flex items-center gap-2 w-36 sm:w-40 h-10 shrink-0 ${
            isAuthenticated ? 'cursor-pointer' : 'cursor-default'
          }`}
          title="KMCult'26"
        >
          {/* Reserved space for docked HandwrittenTitle vector */}
          <div className="w-20 sm:w-24 h-8" />
        </div>

        {isAuthenticated ? (
          <>
            {/* Zone 2: Desktop Navigation Links (3-Zone Top Bar Contract §2) */}
            <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#8B735E]">
              <button
                onClick={onNavigateHome}
                className={`transition-all whitespace-nowrap shrink-0 hover:text-[#493D35] py-1 cursor-pointer ${
                  currentView === 'gallery' ? 'text-[#493D35] border-b-2 border-[#493D35] font-bold' : ''
                }`}
              >
                Memories
              </button>
              <button
                onClick={onOpenDirectory}
                className="transition-all whitespace-nowrap shrink-0 hover:text-[#493D35] py-1 cursor-pointer"
                title="Browse 150 students for memory and photo tagging"
              >
                Tag Directory
              </button>
              <button
                onClick={onOpenRosterManager}
                className="transition-all whitespace-nowrap shrink-0 hover:text-[#493D35] py-1 cursor-pointer"
              >
                Authoritative Roster
              </button>
              <button
                onClick={onOpenAbout}
                className="transition-all whitespace-nowrap shrink-0 hover:text-[#493D35] py-1 cursor-pointer"
              >
                About
              </button>
            </nav>

            {/* Zone 3: Universal Batch Session & Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#493D35] border border-[#493D35]/40 rounded-xs bg-transparent">
                <Users className="w-3.5 h-3.5 text-[#66715C]" />
                <span>Batch &apos;26 Access</span>
              </span>

              <button
                onClick={onLogout}
                title="Lock Chronicle & Sign Out"
                className="ink-button-subtle p-2 min-h-[36px] min-w-[36px] text-[#493D35]"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Drawer Menu Toggle Toggle Button (< md) */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden ink-button-subtle p-2 min-h-[38px] min-w-[38px]"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs font-handwritten text-[#8B735E]">
            <span className="hidden sm:inline">MBBS Batch of 2026 Archive</span>
          </div>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {isAuthenticated && isMobileMenuOpen && (
        <div className="md:hidden paper-sheet border-b-2 border-[#493D35] shadow-[0_6px_0px_rgba(73,61,53,0.15)] animate-vintage-fade-up">
          <div className="px-4 pt-3 pb-4 space-y-1.5 text-sm font-handwritten text-[#493D35]">
            <button
              onClick={() => {
                closeMobileMenu();
                onNavigateHome();
              }}
              className={`w-full text-left py-2.5 px-3 rounded-xs flex items-center gap-3 transition-colors border ${
                currentView === 'gallery' ? 'border-[#493D35] bg-[#493D35]/10 font-bold' : 'border-transparent hover:border-[#493D35]/40'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#8B735E]" />
              <span>Memories Gallery</span>
            </button>

            <button
              onClick={() => {
                closeMobileMenu();
                onOpenDirectory();
              }}
              className="w-full text-left py-2.5 px-3 rounded-xs flex items-center gap-3 border border-transparent hover:border-[#493D35]/40 transition-colors"
            >
              <Tag className="w-4 h-4 text-[#8B735E]" />
              <span>Classmate Directory (Tagging)</span>
            </button>

            <button
              onClick={() => {
                closeMobileMenu();
                onOpenRosterManager();
              }}
              className="w-full text-left py-2.5 px-3 rounded-xs flex items-center gap-3 border border-transparent hover:border-[#493D35]/40 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-[#8B735E]" />
              <span>Authoritative 150 Roster</span>
            </button>

            <button
              onClick={() => {
                closeMobileMenu();
                onOpenAbout();
              }}
              className="w-full text-left py-2.5 px-3 rounded-xs flex items-center gap-3 border border-transparent hover:border-[#493D35]/40 transition-colors"
            >
              <Info className="w-4 h-4 text-[#8B735E]" />
              <span>About KMCult&apos;26</span>
            </button>

            <div className="pt-2 border-t border-[#493D35]/30 flex items-center justify-between px-2 text-xs text-[#8B735E]">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#66715C]" />
                <span>Batch &apos;26 Active Session</span>
              </span>
              <button
                onClick={() => {
                  closeMobileMenu();
                  onLogout();
                }}
                className="text-red-700 font-semibold hover:underline flex items-center gap-1 py-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

