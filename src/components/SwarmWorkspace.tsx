import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Memory, Photograph, Student } from '../types/index.ts';
import { PhotoLightbox } from './PhotoLightbox.tsx';
import { MemoryPasswordModal } from './MemoryPasswordModal.tsx';
import { GraphitePencilCoverCanvas } from './GraphitePencilCoverCanvas.tsx';
import { PhotoIllustrationCanvas, type IllustrationStage, getCachedIllustration, setCachedIllustration } from './PhotoIllustrationCanvas.tsx';
import { MultiAgentTitleTracing } from './MultiAgentTitleTracing.tsx';
import { MemoryPreparationScreen } from './MemoryPreparationScreen.tsx';
import { hasMemoryToken, clearMemoryToken, uploadArtworkToMemory } from '../services/api.ts';
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  ImagePlus,
  Users,
  Compass,
  ZoomIn,
  Lock,
  Unlock,
  Upload,
  X,
  Camera,
} from 'lucide-react';
import { StationeryAgent, type StationeryType } from './StationeryAgents.tsx';

interface SwarmWorkspaceProps {
  memory: Memory;
  students: Student[];
  onBackToGallery: () => void;
  onUpdatePhoto: (photoId: string, updates: { caption?: string; location?: string; date?: string; taggedStudentIds?: string[]; isCover?: boolean }) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
  onAddPhotos: (photos: { url: string; caption?: string }[]) => Promise<void>;
}

// 16 Specialized Visible Stationery Agents (Part 7: Shared Agent Pool)
interface SwarmAgentData {
  id: string;
  name: string;
  toolType: StationeryType;
  color?: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  active: boolean;
  roleType: 'contour' | 'detail' | 'color' | 'shading';
  assignedPhotoId?: string;
}

const INITIAL_SWARM_AGENTS: Omit<SwarmAgentData, 'x' | 'y' | 'targetX' | 'targetY' | 'active'>[] = [
  // 4 Contour & Outline Agents
  { id: 'ag-c1', name: 'Graphite HB Contour', toolType: 'pencil', roleType: 'contour' },
  { id: 'ag-c2', name: 'Fine Lead 0.5mm', toolType: 'pencil', roleType: 'contour' },
  { id: 'ag-c3', name: 'Silverpoint Stylus', toolType: 'fineliner', roleType: 'contour' },
  { id: 'ag-c4', name: 'Architectural Pencil', toolType: 'pencil', roleType: 'contour' },

  // 4 Detail & Refining Agents
  { id: 'ag-d1', name: 'Drafting Fineliner 0.3mm', toolType: 'fineliner', roleType: 'detail' },
  { id: 'ag-d2', name: 'Sepia Ink Dip Pen', toolType: 'fountain_pen', roleType: 'detail' },
  { id: 'ag-d3', name: 'Carbon Black 2B', toolType: 'pencil', roleType: 'detail' },
  { id: 'ag-d4', name: 'Technical Micro-Nib', toolType: 'fineliner', roleType: 'detail' },

  // 4 Color Pencil Agents
  { id: 'ag-col1', name: 'Cadmium Ochre', toolType: 'colored_pencil', color: '#C9943C', roleType: 'color' },
  { id: 'ag-col2', name: 'Sage Olive', toolType: 'colored_pencil', color: '#66715C', roleType: 'color' },
  { id: 'ag-col3', name: 'Terra Cotta Pastel', toolType: 'colored_pencil', color: '#A65B45', roleType: 'color' },
  { id: 'ag-col4', name: 'Umber Soft Core', toolType: 'colored_pencil', color: '#493D35', roleType: 'color' },

  // 4 Shading & Depth Agents
  { id: 'ag-s1', name: 'Cross-Hatch 4B', toolType: 'pencil', roleType: 'shading' },
  { id: 'ag-s2', name: 'Tortillon Stump', toolType: 'marker', roleType: 'shading' },
  { id: 'ag-s3', name: 'Charcoal Wash', toolType: 'marker', roleType: 'shading' },
  { id: 'ag-s4', name: 'Deep Graphite 6B', toolType: 'pencil', roleType: 'shading' },
];

export const SwarmWorkspace: React.FC<SwarmWorkspaceProps> = ({
  memory,
  students,
  onBackToGallery,
  onUpdatePhoto,
  onDeletePhoto,
  onAddPhotos,
}) => {
  // Swarm Phases:
  // 'preparing_memory' -> 'title_tracing' -> 'reconstructing' -> 'auto_scrolling' -> 'exploring'
  const [phase, setPhase] = useState<'preparing_memory' | 'title_tracing' | 'reconstructing' | 'auto_scrolling' | 'exploring'>('preparing_memory');

  // Responsive layout state
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;

  // Reconstruction state per photograph
  const [photoStages, setPhotoStages] = useState<Record<string, IllustrationStage>>(() => {
    const map: Record<string, IllustrationStage> = {};
    memory.photos.forEach((p) => {
      map[p.id] = getCachedIllustration(p.id) ? 'finished' : 'blank';
    });
    return map;
  });

  const [photoProgresses, setPhotoProgresses] = useState<Record<string, number>>({});
  const [pencilBackgroundProgress, setPencilBackgroundProgress] = useState(0);

  // 16 Visible Agents Pool
  const [agents, setAgents] = useState<SwarmAgentData[]>(() =>
    INITIAL_SWARM_AGENTS.map((base, idx) => ({
      ...base,
      x: 100 + (idx % 4) * 220,
      y: 120 + Math.floor(idx / 4) * 80,
      targetX: 100 + (idx % 4) * 220,
      targetY: 120 + Math.floor(idx / 4) * 80,
      active: true,
    }))
  );

  // Spatial Physics State for Interactive Exploration
  const [focusedPhotoId, setFocusedPhotoId] = useState<string | null>(null);
  const [repulsionOffsets, setRepulsionOffsets] = useState<Record<string, { dx: number; dy: number }>>({});

  // Lightbox selection
  const [selectedPhotoForLightbox, setSelectedPhotoForLightbox] = useState<Photograph | null>(null);

  // Quick photo upload in workspace
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Memory Passcode Verification State
  const [forceTokenRefresh, setForceTokenRefresh] = useState(0);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalAction, setPasswordModalAction] = useState('edit this memory');
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  const isUnlocked = useMemo(() => {
    return forceTokenRefresh >= 0 && hasMemoryToken(memory.id);
  }, [memory.id, forceTokenRefresh]);

  // Refs for auto-scroll and animation loops
  const autoScrollFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const userInterruptedScrollRef = useRef<boolean>(false);

  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Compute organic spatial coordinates adaptively for viewport size
  const photoSpatialLayout = useMemo(() => {
    return memory.photos.map((photo, index) => {
      let leftPercent = 10;
      let widthPercent = 38;
      let topOffset = 180 + index * 380;
      let rotation = photo.rotation || ((index % 5) * 1.2 - 2.4);

      if (isMobile) {
        leftPercent = 4 + (index % 2) * 2;
        widthPercent = 92;
        topOffset = 140 + index * 320;
        rotation = (index % 3) * 0.8 - 0.8;
      } else if (isTablet) {
        const col = index % 2;
        leftPercent = col === 0 ? 4 : 52;
        widthPercent = 44;
        topOffset = 160 + Math.floor(index / 2) * 360 + (col * 30);
      } else {
        const colPattern = index % 3;
        if (colPattern === 0) {
          leftPercent = 6 + ((index * 4) % 10);
          widthPercent = 42;
        } else if (colPattern === 1) {
          leftPercent = 54 + ((index * 3) % 8);
          widthPercent = 40;
        } else {
          leftPercent = 26 + ((index * 5) % 12);
          widthPercent = 44;
        }
        topOffset = 180 + index * 380;
      }

      return {
        photo,
        baseLeft: leftPercent,
        baseWidth: widthPercent,
        baseTop: topOffset,
        rotation,
        zIndex: 10 + (index % 5),
      };
    });
  }, [memory.photos, isMobile, isTablet]);

  // Total canvas height required for composition
  const totalCompositionHeight = useMemo(() => {
    const photoCount = memory.photos.length;
    if (photoCount === 0) return 500;
    if (isMobile) {
      return 180 + photoCount * 320 + 160;
    }
    if (isTablet) {
      return 200 + Math.ceil(photoCount / 2) * 360 + 200;
    }
    return Math.max(900, 260 + photoCount * 380 + 200);
  }, [memory.photos.length, isMobile, isTablet]);

  const coverPhoto = useMemo(() => {
    return memory.photos.find((p) => p.id === memory.coverPhotoId) || memory.photos[0];
  }, [memory.photos, memory.coverPhotoId]);

  // -------------------------------------------------------------
  // Step 2: Concurrent Multi-Agent Reconstruction Engine (Pipelines A & B)
  // Reconstructs photographs concurrently while preparing subsequent ones in background
  // -------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'reconstructing') return;

    if (memory.photos.length === 0) {
      setPhase('exploring');
      return;
    }

    if (prefersReducedMotion) {
      const fullStages: Record<string, IllustrationStage> = {};
      const fullProgress: Record<string, number> = {};
      memory.photos.forEach((p) => {
        fullStages[p.id] = 'finished';
        fullProgress[p.id] = 1;
      });
      setPhotoStages(fullStages);
      setPhotoProgresses(fullProgress);
      setPencilBackgroundProgress(1);
      setPhase('exploring');
      return;
    }

    let frameId: number;
    let startTime: number | null = null;
    const totalPhotos = memory.photos.length;
    const concurrency = Math.min(4, Math.max(1, totalPhotos));
    const durationPerPhoto = 1100; // High-speed active time-lapse drawing
    const batchCount = Math.ceil(totalPhotos / concurrency);
    const totalDuration = batchCount * durationPerPhoto;

    const stagesCycle: IllustrationStage[] = ['sketch', 'refining', 'coloring', 'shading', 'finished'];

    const updateSwarmPhysics = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const totalProgress = Math.min(1, elapsed / totalDuration);

      setPencilBackgroundProgress(totalProgress);

      const currentBatchIdx = Math.min(batchCount - 1, Math.floor(elapsed / durationPerPhoto));
      const batchStart = currentBatchIdx * concurrency;
      const batchEnd = Math.min(totalPhotos, batchStart + concurrency);
      const batchProgress = (elapsed % durationPerPhoto) / durationPerPhoto;

      const newStages = { ...photoStages };
      const newProgresses = { ...photoProgresses };

      for (let i = 0; i < batchStart; i++) {
        const id = memory.photos[i].id;
        newStages[id] = 'finished';
        newProgresses[id] = 1;
      }

      for (let i = batchStart; i < batchEnd; i++) {
        const id = memory.photos[i].id;
        const stageIndex = Math.min(stagesCycle.length - 1, Math.floor(batchProgress * stagesCycle.length));
        newStages[id] = stagesCycle[stageIndex];
        newProgresses[id] = (batchProgress * stagesCycle.length) % 1;
      }

      setPhotoStages(newStages);
      setPhotoProgresses(newProgresses);

      const activePhotos = memory.photos.slice(batchStart, batchEnd);
      const containerWidth = viewportWidth > 1200 ? 1100 : viewportWidth * 0.9;

      setAgents((prevAgents) => {
        return prevAgents.map((ag, idx) => {
          if (activePhotos.length === 0) return ag;
          const assignedPhotoIdx = idx % activePhotos.length;
          const targetPhoto = activePhotos[assignedPhotoIdx];
          const layout = photoSpatialLayout.find((l) => l.photo.id === targetPhoto.id);

          if (!layout) return ag;

          const cardX = (layout.baseLeft / 100) * containerWidth;
          const cardY = layout.baseTop;
          const cardW = (layout.baseWidth / 100) * containerWidth;
          const cardH = 260;

          const subProgress = (batchProgress * 4 + idx * 0.25) % 1;
          const sweepX = cardX + 20 + subProgress * (cardW - 40);
          const sweepY = cardY + 20 + ((idx % 4) / 4) * (cardH - 40) + Math.sin(now * 0.008 + idx) * 15;

          return {
            ...ag,
            targetX: sweepX,
            targetY: sweepY,
            active: true,
            assignedPhotoId: targetPhoto.id,
          };
        });
      });

      if (totalProgress < 1) {
        frameId = requestAnimationFrame(updateSwarmPhysics);
      } else {
        const completedStages: Record<string, IllustrationStage> = {};
        const completedProgress: Record<string, number> = {};
        memory.photos.forEach((p) => {
          completedStages[p.id] = 'finished';
          completedProgress[p.id] = 1;
        });
        setPhotoStages(completedStages);
        setPhotoProgresses(completedProgress);
        setPencilBackgroundProgress(1);

        setTimeout(() => {
          setPhase('auto_scrolling');
        }, 500);
      }
    };

    frameId = requestAnimationFrame(updateSwarmPhysics);
    return () => cancelAnimationFrame(frameId);
  }, [phase, memory.photos, prefersReducedMotion, photoSpatialLayout, viewportWidth]);

  // -------------------------------------------------------------
  // Step 3: Automatic Panoramic Voyage after Reconstruction
  // -------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'auto_scrolling') return;

    if (prefersReducedMotion) {
      setPhase('exploring');
      return;
    }

    userInterruptedScrollRef.current = false;

    const handleUserInterrupt = () => {
      userInterruptedScrollRef.current = true;
      if (autoScrollFrameRef.current) {
        cancelAnimationFrame(autoScrollFrameRef.current);
      }
      setPhase('exploring');
    };

    window.addEventListener('wheel', handleUserInterrupt, { passive: true });
    window.addEventListener('touchstart', handleUserInterrupt, { passive: true });
    window.addEventListener('pointerdown', handleUserInterrupt, { passive: true });
    window.addEventListener('keydown', handleUserInterrupt);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const scrollTimeout = setTimeout(() => {
      const scrollStep = () => {
        if (userInterruptedScrollRef.current) return;

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const currentScroll = window.scrollY;

        if (currentScroll < maxScroll - 15) {
          window.scrollBy(0, 2);
          autoScrollFrameRef.current = requestAnimationFrame(scrollStep);
        } else {
          setPhase('exploring');
        }
      };

      autoScrollFrameRef.current = requestAnimationFrame(scrollStep);
    }, 500);

    return () => {
      clearTimeout(scrollTimeout);
      if (autoScrollFrameRef.current) cancelAnimationFrame(autoScrollFrameRef.current);
      window.removeEventListener('wheel', handleUserInterrupt);
      window.removeEventListener('touchstart', handleUserInterrupt);
      window.removeEventListener('pointerdown', handleUserInterrupt);
      window.removeEventListener('keydown', handleUserInterrupt);
    };
  }, [phase, prefersReducedMotion]);

  // -------------------------------------------------------------
  // Step 4: Interactive Physics & Repulsion on Focus/Hover
  // -------------------------------------------------------------
  const handlePhotoHover = (photoId: string | null) => {
    if (phase !== 'exploring') return;

    setFocusedPhotoId(photoId);

    if (!photoId) {
      setRepulsionOffsets({});
      return;
    }

    const focusedLayout = photoSpatialLayout.find((l) => l.photo.id === photoId);
    if (!focusedLayout) return;

    const newOffsets: Record<string, { dx: number; dy: number }> = {};
    const repulsionRadius = isMobile ? 220 : 420;

    photoSpatialLayout.forEach((item) => {
      if (item.photo.id === photoId) return;

      const dx = (item.baseLeft - focusedLayout.baseLeft) * 10;
      const dy = item.baseTop - focusedLayout.baseTop;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < repulsionRadius && dist > 1) {
        const force = Math.pow((repulsionRadius - dist) / repulsionRadius, 1.4) * (isMobile ? 20 : 38);
        const nx = dx / dist;
        const ny = dy / dist;

        newOffsets[item.photo.id] = {
          dx: nx * force,
          dy: ny * force,
        };
      }
    });

    setRepulsionOffsets(newOffsets);
  };

  const handleReplaySwarm = () => {
    if (autoScrollFrameRef.current) cancelAnimationFrame(autoScrollFrameRef.current);
    userInterruptedScrollRef.current = false;
    const blankStages: Record<string, IllustrationStage> = {};
    memory.photos.forEach((p) => { blankStages[p.id] = 'blank'; });
    setPhotoStages(blankStages);
    setPhotoProgresses({});
    setPencilBackgroundProgress(0);
    setFocusedPhotoId(null);
    setRepulsionOffsets({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPhase('preparing_memory');
  };

  // Lock / Unlock Handlers
  const handleRequestAddPhoto = () => {
    if (!isUnlocked) {
      setPasswordModalAction('add photographs to this memory');
      setPendingCallback(() => () => setIsAddingPhoto(true));
      setIsPasswordModalOpen(true);
      return;
    }
    setIsAddingPhoto(true);
  };

  const handlePasswordSuccess = (_token: string) => {
    setForceTokenRefresh((k) => k + 1);
    setIsPasswordModalOpen(false);
    if (pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }
  };

  const handleRelockMemory = () => {
    clearMemoryToken(memory.id);
    setForceTokenRefresh((k) => k + 1);
  };

  const handleLocalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setNewPhotoUrl(url);
      if (!newPhotoCaption) {
        setNewPhotoCaption('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQuickAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) return;
    setIsUploadingPhoto(true);
    try {
      await onAddPhotos([{ url: newPhotoUrl.trim(), caption: newPhotoCaption.trim() }]);
      setNewPhotoUrl('');
      setNewPhotoCaption('');
      setIsAddingPhoto(false);
    } catch (err) {
      console.error('Failed to add photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // If memory is preparing, render the preparation screen
  if (phase === 'preparing_memory') {
    return (
      <div className="relative min-h-screen overflow-x-hidden selection:bg-[#D6C4A8]">
        {/* Workspace Sub-header Toolbar */}
        <div className="w-full border-b border-[#493D35]/30 bg-transparent px-3 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <button
              onClick={onBackToGallery}
              className="ink-button-subtle text-xs py-1.5 px-2.5 flex items-center gap-1.5 min-h-[38px] font-serif font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Chronicle</span>
            </button>
            <h1 className="text-sm font-serif font-bold text-[#493D35] truncate max-w-xs sm:max-w-md">
              {memory.title}
            </h1>
            <div />
          </div>
        </div>

        <MemoryPreparationScreen
          memoryTitle={memory.title}
          photos={memory.photos}
          onReady={() => setPhase('title_tracing')}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-x-hidden selection:bg-[#D6C4A8]"
    >
      {/* Workspace Sub-header Toolbar (Normal Flow per Global Layout Requirement) */}
      <div className="w-full border-b border-[#493D35]/30 bg-transparent px-3 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
            <button
              onClick={onBackToGallery}
              className="ink-button-subtle text-xs py-1.5 px-2.5 flex items-center gap-1.5 shrink-0 min-h-[38px] font-serif font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Chronicle</span>
            </button>

            <div className="hidden sm:block h-4 w-[1px] bg-[#493D35]/40" />

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-serif font-bold text-[#493D35] truncate max-w-[160px] sm:max-w-md">
                {memory.title}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#8B735E]">
                <span>{memory.date}</span>
                <span aria-hidden="true">·</span>
                <span>{memory.photos.length} illustrated frames</span>
              </div>
            </div>
          </div>

          {/* Controls: Lock status, Swarm Phase Badge, Add Photo */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isUnlocked ? (
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1 px-2 py-1 text-[#66715C] text-[11px] sm:text-xs font-serif font-bold rounded-xs border border-[#66715C]/40 bg-transparent">
                  <Unlock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Editing Unlocked</span>
                </span>
                <button
                  onClick={handleRelockMemory}
                  className="ink-button-subtle p-1.5"
                  title="Lock editing session"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setPasswordModalAction('unlock editing for this memory');
                  setPendingCallback(null);
                  setIsPasswordModalOpen(true);
                }}
                className="ink-button-subtle flex items-center gap-1.5 text-xs py-1.5 px-2.5 min-h-[36px] font-serif font-bold"
                title="Enter memory passcode to enable editing"
              >
                <Lock className="w-3.5 h-3.5 text-[#493D35]" />
                <span className="hidden sm:inline">Unlock Editing</span>
              </button>
            )}

            {phase === 'reconstructing' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-serif font-bold text-[#493D35] border border-[#493D35]/40 rounded-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#66715C] animate-spin" />
                <span className="text-[11px] sm:text-xs">Swarm Reconstruction (16 Agents)</span>
              </div>
            )}

            {phase === 'auto_scrolling' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-serif text-[#493D35]">
                <Compass className="w-3.5 h-3.5 text-[#493D35] animate-pulse" />
                <span className="hidden sm:inline">Navigating Chronicle...</span>
              </div>
            )}

            {phase === 'exploring' && (
              <button
                onClick={handleReplaySwarm}
                className="ink-button-subtle text-xs py-1.5 px-2.5 flex items-center gap-1.5 min-h-[36px] font-serif font-bold cursor-pointer"
                title="Re-run Multi-Agent Reconstruction"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#493D35]" />
                <span className="hidden sm:inline">Replay Swarm</span>
              </button>
            )}

            {isUnlocked && (
              <button
                onClick={handleRequestAddPhoto}
                className="ink-button text-xs py-1.5 px-3 flex items-center gap-1.5 min-h-[36px] font-serif font-bold cursor-pointer"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Photograph</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Part 5: Multi-Agent Memory Title Tracing */}
      {phase === 'title_tracing' ? (
        <MultiAgentTitleTracing
          title={memory.title}
          onComplete={() => setPhase('reconstructing')}
        />
      ) : (
        <div className="max-w-5xl mx-auto px-4 pt-6 text-center animate-vintage-fade-up">
          <h2 className="text-xl sm:text-3xl font-serif italic text-[#493D35] font-bold tracking-tight">
            {memory.title}
          </h2>
          {memory.description && (
            <p className="mt-1.5 text-xs sm:text-sm text-[#8B735E] max-w-2xl mx-auto leading-relaxed italic px-2 font-handwritten">
              &ldquo;{memory.description}&rdquo;
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#8B735E]">
            <span>Kilpauk Medical College, Chennai</span>
            <span aria-hidden="true">·</span>
            <span>MBBS Class of 2026</span>
            <span aria-hidden="true">·</span>
            <span>{memory.date}</span>
          </div>
        </div>
      )}

      {/* Main Organic Swarm Spatial Canvas */}
      <div
        className="relative max-w-6xl mx-auto px-2 sm:px-4 mt-4 sm:mt-6"
        style={{ height: `${totalCompositionHeight}px` }}
      >
        {/* Graphite Pencil Cover Layer in background */}
        {coverPhoto && (
          <div className="absolute inset-x-0 top-6 bottom-16 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-25">
            <div className="w-[92%] sm:w-[88%] h-[85%] max-w-4xl max-h-[850px] relative rounded-3xl overflow-hidden shadow-inner">
              <GraphitePencilCoverCanvas
                imageUrl={coverPhoto.url}
                progress={pencilBackgroundProgress}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-transparent to-[#F5F0E6] opacity-80" />
            </div>
          </div>
        )}

        {/* 16 Visible Stationery Agents Collaboratively Illustrating Photographs */}
        {phase === 'reconstructing' && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {agents.map((ag) => (
              <StationeryAgent
                key={ag.id}
                type={ag.toolType}
                x={ag.targetX}
                y={ag.targetY}
                label={`${ag.name}`}
                isWriting={true}
                scale={isMobile ? 0.6 : 0.75}
                className="transition-all duration-150 ease-out"
              />
            ))}
          </div>
        )}

        {/* Empty state if memory has no photos */}
        {memory.photos.length === 0 && (
          <div className="my-16 p-8 sm:p-12 paper-sheet border-2 border-[#493D35] rounded-xs text-center max-w-lg mx-auto shadow-[4px_5px_0px_rgba(73,61,53,0.2)]">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#E8DDC9]/70 flex items-center justify-center text-[#8B735E] mb-4">
              <Camera className="w-7 h-7 stroke-1" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#493D35]">
              This Memory Album Has No Photographs Yet
            </h3>
            <p className="mt-1.5 text-xs text-[#8B735E] leading-relaxed">
              Upload photographs or snapshots taken by classmates to reconstruct this chapter in the spatial Swarm.
            </p>
            <button
              onClick={handleRequestAddPhoto}
              className="ink-button mt-5 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mx-auto cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              <span>Add First Photograph</span>
            </button>
          </div>
        )}

        {/* Spatial Reconstructed Photographs Layer (Original photo NEVER visible) */}
        {photoSpatialLayout.map((layout) => {
          const photo = layout.photo;
          const isFocused = focusedPhotoId === photo.id;
          const offset = repulsionOffsets[photo.id] || { dx: 0, dy: 0 };
          const stage = photoStages[photo.id] || 'blank';
          const prog = photoProgresses[photo.id] ?? 1;

          const currentRotation = isFocused ? 0 : layout.rotation;
          const scale = isFocused ? (isMobile ? 1.02 : 1.05) : 1;
          const zIndex = isFocused ? 50 : layout.zIndex;

          return (
            <div
              key={photo.id}
              onMouseEnter={() => handlePhotoHover(photo.id)}
              onMouseLeave={() => handlePhotoHover(null)}
              onClick={() => setSelectedPhotoForLightbox(photo)}
              style={{
                position: 'absolute',
                top: `${layout.baseTop}px`,
                left: `${layout.baseLeft}%`,
                width: `${layout.baseWidth}%`,
                zIndex,
                transform: `translate3d(${offset.dx}px, ${offset.dy}px, 0) rotate(${currentRotation}deg) scale(${scale})`,
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease',
              }}
              className="cursor-pointer group select-none"
            >
              {/* Paper-crafted Polaroid Frame with Washi Tape */}
              <div
                className={`p-3 pb-5 paper-sheet rounded-xs border-1.5 border-[#493D35] transition-shadow duration-300 ${
                  isFocused
                    ? 'shadow-[6px_8px_0px_rgba(73,61,53,0.3)]'
                    : 'shadow-[3px_4px_0px_rgba(73,61,53,0.18)] group-hover:shadow-[5px_6px_0px_rgba(73,61,53,0.25)]'
                }`}
              >
                {/* Vintage Washi Tape Top Tab */}
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-4 bg-[#E8DDC9] border border-dashed border-[#493D35]/40 rounded-xs transform -rotate-1 pointer-events-none" />

                {/* Illustrated Canvas Area (Original raw photo NEVER appears on canvas) */}
                <div className="relative aspect-[4/3] bg-[#FAF6EE] overflow-hidden rounded-xs border border-[#493D35]/30">
                  <PhotoIllustrationCanvas
                    photo={photo}
                    stage={stage}
                    progress={prog}
                    memoryId={memory.id}
                    mode={photo.reconstructionMode || memory.reconstructionMode || 'oil_painting'}
                    interactive={true}
                    onIllustrationReady={(photoId, dataUrl) => {
                      setCachedIllustration(photoId, dataUrl);
                      uploadArtworkToMemory(memory.id, photoId, dataUrl).catch(() => {});
                    }}
                  />

                  {/* Stage indicator chip during reconstruction */}
                  {phase === 'reconstructing' && stage !== 'finished' && (
                    <div className="absolute top-2 left-2 bg-[#493D35]/80 text-[#FAF6EE] text-[9px] font-mono px-2 py-0.5 rounded-xs uppercase tracking-wider backdrop-blur-xs">
                      {stage}
                    </div>
                  )}

                  {/* Quick Expand Icon on Hover */}
                  <div className="absolute bottom-2 right-2 p-1.5 bg-[#493D35] text-[#FAF6EE] rounded-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Handwritten Polaroid Caption */}
                <div className="mt-3 px-1">
                  <p className="text-xs sm:text-sm font-handwritten text-[#493D35] leading-snug">
                    {photo.caption || (
                      <span className="italic text-[#8B735E]">Uncaptioned memory</span>
                    )}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between text-[10px] sm:text-[11px] text-[#8B735E]">
                    <span>{photo.date || memory.date}</span>
                    {photo.taggedStudentIds && photo.taggedStudentIds.length > 0 && (
                      <span className="flex items-center gap-1 font-mono text-[9px] sm:text-[10px] text-[#66715C]">
                        <Users className="w-3 h-3" />
                        {photo.taggedStudentIds.length} tagged
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK ADD PHOTO IN WORKSPACE MODAL */}
      {isAddingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-vintage-fade-up">
          <div className="paper-sheet w-full max-w-lg rounded-xs border-2 border-[#493D35] shadow-[5px_6px_0px_rgba(73,61,53,0.25)] p-6">
            <div className="flex items-center justify-between pb-3 border-b-1.5 border-[#493D35]">
              <h3 className="text-base font-serif font-bold text-[#493D35]">
                Add Photograph to Swarm
              </h3>
              <button
                onClick={() => setIsAddingPhoto(false)}
                className="text-[#493D35] hover:bg-[#493D35]/10 p-1 rounded-xs transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8B735E] my-3 leading-relaxed">
              Upload a local file or paste an image URL to add a new memory frame directly to &quot;{memory.title}&quot;.
            </p>

            <form onSubmit={handleQuickAddPhoto} className="space-y-4 text-xs">
              <div>
                <label className="block font-serif font-bold uppercase tracking-wider text-[#493D35] mb-1">
                  Photograph Source
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://... or choose local file"
                    required
                    className="flex-1 px-3 py-2 bg-transparent border-1.5 border-[#493D35] rounded-xs text-xs text-[#493D35]"
                  />
                  <label className="ink-button-subtle px-3 py-2 text-xs font-serif font-bold cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLocalImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-serif font-bold uppercase tracking-wider text-[#493D35] mb-1">
                  Photograph Description (Optional)
                </label>
                <input
                  type="text"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="Describe this moment..."
                  className="w-full px-3 py-2 bg-transparent border-1.5 border-[#493D35] rounded-xs text-xs text-[#493D35] font-handwritten"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t-1.5 border-[#493D35]">
                <button
                  type="button"
                  onClick={() => setIsAddingPhoto(false)}
                  className="ink-button-subtle px-3 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPhoto || !newPhotoUrl.trim()}
                  className="ink-button px-4 py-2 text-xs font-serif font-bold disabled:opacity-50"
                >
                  {isUploadingPhoto ? 'Adding...' : 'Add Photograph'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL (Interactive Scrapbook Viewer - Original Photo Hidden) */}
      {selectedPhotoForLightbox && (
        <PhotoLightbox
          photo={selectedPhotoForLightbox}
          allPhotos={memory.photos}
          memoryTitle={memory.title}
          isCover={memory.coverPhotoId === selectedPhotoForLightbox.id}
          students={students}
          isUnlocked={isUnlocked}
          illustratedUrl={getCachedIllustration(selectedPhotoForLightbox.id)}
          onRequestUnlock={(desc) => {
            setPasswordModalAction(desc);
            setPendingCallback(null);
            setIsPasswordModalOpen(true);
          }}
          onClose={() => setSelectedPhotoForLightbox(null)}
          onNavigate={(nextPhoto) => setSelectedPhotoForLightbox(nextPhoto)}
          onUpdateDetails={onUpdatePhoto}
          onDeletePhoto={onDeletePhoto}
        />
      )}

      {/* MEMORY PASSCODE INTERCEPTOR */}
      {isPasswordModalOpen && (
        <MemoryPasswordModal
          isOpen={isPasswordModalOpen}
          memoryId={memory.id}
          memoryTitle={memory.title}
          actionDescription={passwordModalAction}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setPendingCallback(null);
          }}
          onSuccess={handlePasswordSuccess}
        />
      )}
    </div>
  );
};
