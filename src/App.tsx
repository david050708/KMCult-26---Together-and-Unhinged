/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Student, Memory, AuthSession } from './types/index.ts';
import {
  fetchRoster,
  fetchMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  addPhotosToMemory,
  updatePhotoDetails,
  deletePhotoFromMemory,
  checkBatchSession,
  logoutBatch
} from './services/api.ts';
import { HandwrittenTitle, type HandwrittenTitleHandle } from './components/HandwrittenTitle.tsx';
import { ScrollStorytelling } from './components/ScrollStorytelling.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { IntroMessageModal } from './components/IntroMessageModal.tsx';
import { TopNav } from './components/TopNav.tsx';
import { GalleryView } from './components/GalleryView.tsx';
import { SwarmWorkspace } from './components/SwarmWorkspace.tsx';
import { StudentDirectoryModal } from './components/StudentDirectoryModal.tsx';
import { AuthoritativeRosterModal } from './components/AuthoritativeRosterModal.tsx';
import { AboutModal } from './components/AboutModal.tsx';
import { AUTHORITATIVE_ROSTER } from './data/rosterData.ts';

export default function App() {
  // Title Animation & Docking Lifecycle:
  // false = centered writing on scrapbook canvas
  // true = docked permanently into the upper header
  const [isTitleDocked, setIsTitleDocked] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('kmc26_token'));
  });

  const titleRef = useRef<HandwrittenTitleHandle | null>(null);

  // Universal Batch Auth Session (Anonymous by Default)
  const [session, setSession] = useState<AuthSession>(() => {
    const savedToken = localStorage.getItem('kmc26_token');
    return {
      token: savedToken || '',
      authenticated: Boolean(savedToken),
    };
  });

  const [introStep, setIntroStep] = useState<'tracing' | 'logo_transition' | 'scrolling_story' | 'showing_chronicle' | 'login' | 'authenticated'>(() => {
    const savedToken = localStorage.getItem('kmc26_token');
    return savedToken ? 'authenticated' : 'tracing';
  });

  // Central 150-Student Directory (Exclusively for tagging classmates)
  const [students, setStudents] = useState<Student[]>(AUTHORITATIVE_ROSTER);
  // Memory Archives
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active View & Memory
  const [currentView, setCurrentView] = useState<'gallery' | 'swarm'>('gallery');
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);

  // Navigation Modals
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isRosterManagerOpen, setIsRosterManagerOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Load Roster & Memories on Mount, plus check server session (Remember Me)
  const loadInitialData = async () => {
    try {
      const [rosterRes, memoriesRes, sessionRes] = await Promise.all([
        fetchRoster(),
        fetchMemories(),
        checkBatchSession()
      ]);
      setStudents(rosterRes.students || AUTHORITATIVE_ROSTER);
      setMemories(memoriesRes || []);

      if (sessionRes.authenticated && sessionRes.token) {
        setSession({
          token: sessionRes.token,
          authenticated: true,
        });
        setIntroStep('authenticated');
        setIsTitleDocked(true);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('kmc26_token', token);
    setSession({
      token,
      authenticated: true,
    });
    setIntroStep('authenticated');
    setIsTitleDocked(true);
  };

  const handleLogout = async () => {
    await logoutBatch();
    setSession({
      token: '',
      authenticated: false,
    });
    // Invalidate session, go directly to batch login without re-running intro animation
    setIntroStep('login');
    setIsTitleDocked(true);
    setCurrentView('gallery');
    setActiveMemoryId(null);
    window.history.replaceState(null, '', window.location.pathname);
  };

  // Replay the physical handwriting animation
  const handleReplayIntro = () => {
    setIsTitleDocked(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.resetAnimation();
        titleRef.current.startAnimation();
      }
    }, 150);
  };

  // Memory Handlers
  const handleOpenMemory = (memory: Memory) => {
    setActiveMemoryId(memory.id);
    setCurrentView('swarm');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateMemory = async (data: {
    title: string;
    description: string;
    date: string;
    category: string;
    password: string;
    reconstructionMode?: 'original' | 'oil_painting';
    initialPhotos?: { url: string; caption?: string; location?: string; taggedStudentIds?: string[] }[];
  }) => {
    const newMem = await createMemory(data);
    setMemories((prev) => [newMem, ...prev]);
  };

  const handleUpdateMemory = async (id: string, updates: { title?: string; description?: string; date?: string; category?: string; coverPhotoId?: string }) => {
    const updated = await updateMemory(id, updates);
    setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (activeMemoryId === id) {
      setActiveMemoryId(null);
      setCurrentView('gallery');
    }
  };

  const handleAddPhotos = async (memoryId: string, photos: { url: string; caption?: string }[]) => {
    const { memory: updated } = await addPhotosToMemory(memoryId, photos);
    setMemories((prev) => prev.map((m) => (m.id === memoryId ? updated : m)));
  };

  const handleUpdatePhotoInWorkspace = async (
    photoId: string,
    updates: { caption?: string; location?: string; date?: string; taggedStudentIds?: string[]; isCover?: boolean }
  ) => {
    if (!activeMemoryId) return;
    const { memory: updated } = await updatePhotoDetails(activeMemoryId, photoId, updates);
    setMemories((prev) => prev.map((m) => (m.id === activeMemoryId ? updated : m)));
  };

  const handleDeletePhotoInWorkspace = async (photoId: string) => {
    if (!activeMemoryId) return;
    const { memory: updated } = await deletePhotoFromMemory(activeMemoryId, photoId);
    setMemories((prev) => prev.map((m) => (m.id === activeMemoryId ? updated : m)));
  };

  const activeMemory = memories.find((m) => m.id === activeMemoryId) || memories[0];

  return (
    <div className="min-h-screen text-[#493D35] font-sans antialiased selection:bg-[#D6C4A8]">
      {/* 
        CRITICAL PERMANENT HANDWRITTEN TITLE:
        - When !isTitleDocked: Centered on warm paper canvas, written physically by the writing tip.
        - When isTitleDocked: Moves into the top header and stays in natural document flow.
      */}
      <HandwrittenTitle
        ref={titleRef}
        isDocked={isTitleDocked}
        onWritingComplete={() => {
          setIsTitleDocked(true);
          setIntroStep('logo_transition');
          setTimeout(() => {
            setIntroStep('scrolling_story');
          }, 1000);
        }}
        onClickLogo={() => {
          if (isTitleDocked) {
            setCurrentView('gallery');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
      />

      {/* Persistent Top Navigation Bar in Normal Document Flow */}
      {isTitleDocked && (
        <TopNav
          currentView={currentView}
          isAuthenticated={session.authenticated}
          onNavigateHome={() => {
            setCurrentView('gallery');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenDirectory={() => setIsDirectoryOpen(true)}
          onOpenRosterManager={() => setIsRosterManagerOpen(true)}
          onOpenAbout={() => setIsAboutOpen(true)}
          onLogout={handleLogout}
        />
      )}

      {/* Main Screen Content */}
      <div
        className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isTitleDocked
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {!session.authenticated ? (
          introStep === 'scrolling_story' ? (
            <ScrollStorytelling onComplete={() => setIntroStep('showing_chronicle')} />
          ) : introStep === 'showing_chronicle' ? (
             <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4">
               <IntroMessageModal onContinue={() => setIntroStep('login')} />
             </div>
          ) : introStep === 'login' ? (
            <LoginScreen
              onLoginSuccess={handleLoginSuccess}
            />
          ) : null
        ) : (
          <main>
            {currentView === 'gallery' ? (
              <GalleryView
                memories={memories}
                students={students}
                onOpenMemory={handleOpenMemory}
                onCreateMemory={handleCreateMemory}
                onUpdateMemory={handleUpdateMemory}
                onDeleteMemory={handleDeleteMemory}
                onAddPhotos={handleAddPhotos}
                onRefresh={loadInitialData}
              />
            ) : (
              activeMemory && (
                <SwarmWorkspace
                  memory={activeMemory}
                  students={students}
                  onBackToGallery={() => {
                    setCurrentView('gallery');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onUpdatePhoto={handleUpdatePhotoInWorkspace}
                  onDeletePhoto={handleDeletePhotoInWorkspace}
                  onAddPhotos={(photos) => handleAddPhotos(activeMemory.id, photos)}
                />
              )
            )}
          </main>
        )}
      </div>

      {/* Classmate Directory Modal (For Tagging & Viewing) */}
      <StudentDirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        students={students}
        memories={memories}
        onSelectMemory={(mem) => {
          setIsDirectoryOpen(false);
          handleOpenMemory(mem);
        }}
      />

      {/* Authoritative 150 Roster Manager Modal */}
      <AuthoritativeRosterModal
        isOpen={isRosterManagerOpen}
        onClose={() => setIsRosterManagerOpen(false)}
        students={students}
        onRosterUpdated={(updated) => setStudents(updated)}
      />

      {/* About Chronicle Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}
