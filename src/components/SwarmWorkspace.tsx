import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Memory, Photograph, Student } from '../types/index.ts';
import { PhotoLightbox } from './PhotoLightbox.tsx';
import { MemoryPasswordModal } from './MemoryPasswordModal.tsx';
import { GraphitePencilCoverCanvas } from './GraphitePencilCoverCanvas.tsx';
import { hasMemoryToken, clearMemoryToken } from '../services/api.ts';
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

// Represents a physical stationery agent collaboratively assembling the memory
interface SpatialStationeryAgent {
  id: string;
  name: string;
  toolType: StationeryType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  active: boolean;
  carryingPhotoId?: string;
  roleDescription: string;
}

export const SwarmWorkspace: React.FC<SwarmWorkspaceProps> = ({
  memory,
  students,
  onBackToGallery,
  onUpdatePhoto,
  onDeletePhoto,
  onAddPhotos,
}) => {
  // Swarm Lifecycle Phases:
  // 'intro_title' -> 'reconstructing' -> 'auto_scrolling' -> 'exploring'
  const [phase, setPhase] = useState<'intro_title' | 'reconstructing' | 'auto_scrolling' | 'exploring'>('intro_title');

  // Title tracing state
  const [titleProgress, setTitleProgress] = useState(0);
  const [titlePenPos, setTitlePenPos] = useState<{ x: number; y: number; angle: number } | null>(null);
  const titlePathRef = useRef<SVGPathElement | null>(null);

  // Responsive layout state
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;

  // Reconstruction state with Physical Stationery Tools & Progresses
  const [placedPhotoIds, setPlacedPhotoIds] = useState<Set<string>>(new Set());
  const [photoRevealProgresses, setPhotoRevealProgresses] = useState<Record<string, number>>({});
  const [pencilBackgroundProgress, setPencilBackgroundProgress] = useState(0);

  const [stationeryAgents, setStationeryAgents] = useState<SpatialStationeryAgent[]>([
    { id: 'agent-pencil', name: 'Graphite Pencil 2B', toolType: 'pencil', x: -60, y: 120, targetX: 180, targetY: 220, active: true, roleDescription: 'Traces guidelines & alignment ticks' },
    { id: 'agent-pen', name: 'Brass Fountain Pen', toolType: 'fountain_pen', x: 1100, y: 180, targetX: 620, targetY: 280, active: true, roleDescription: 'Inks frame borders & title cursive' },
    { id: 'agent-colored', name: 'Sage Coloured Pencil', toolType: 'colored_pencil', x: 200, y: -80, targetX: 350, targetY: 450, active: true, roleDescription: 'Applies warm tone & shading' },
    { id: 'agent-fineliner', name: 'Technical Fineliner', toolType: 'fineliner', x: 950, y: 800, targetX: 520, targetY: 620, active: true, roleDescription: 'Affixes tape & photo corners' },
  ]);

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
        // Mobile: Clean, non-overlapping vertically stacked scrapbook cards
        leftPercent = 4 + (index % 2) * 2; // 4% to 6%
        widthPercent = 92;
        topOffset = 140 + index * 320;
        rotation = (index % 3) * 0.8 - 0.8; // subtle tilt within mobile screen bounds
      } else if (isTablet) {
        // Tablet: 2-column alternating grid layout
        const col = index % 2;
        leftPercent = col === 0 ? 4 : 52;
        widthPercent = 44;
        topOffset = 160 + Math.floor(index / 2) * 360 + (col * 30);
      } else {
        // Desktop: 3-column organic scrapbook collage
        const colPattern = index % 3;
        if (colPattern === 0) {
          leftPercent = 6 + (index * 4) % 10;
          widthPercent = 42;
        } else if (colPattern === 1) {
          leftPercent = 54 + (index * 3) % 8;
          widthPercent = 40;
        } else {
          leftPercent = 26 + (index * 5) % 12;
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
  // Step 1: Title Tracing Opening Sequence
  // -------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'intro_title') return;

    if (prefersReducedMotion) {
      setPhase('reconstructing');
      return;
    }

    const duration = 2400; // 2.4 seconds cursive title tracing
    const start = performance.now();
    let frameId: number;

    const animateTitle = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      setTitleProgress(progress);

      if (titlePathRef.current) {
        const total = titlePathRef.current.getTotalLength();
        const pt = titlePathRef.current.getPointAtLength(progress * total);
        const lookAhead = Math.min(total, progress * total + 3);
        const ptNext = titlePathRef.current.getPointAtLength(lookAhead);
        const angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI);
        setTitlePenPos({ x: pt.x, y: pt.y, angle });
      }

      if (progress < 1) {
        frameId = requestAnimationFrame(animateTitle);
      } else {
        setTimeout(() => {
          setPhase('reconstructing');
        }, 600);
      }
    };

    frameId = requestAnimationFrame(animateTitle);
    return () => cancelAnimationFrame(frameId);
  }, [phase, prefersReducedMotion]);

  // -------------------------------------------------------------
  // Step 2: Physically Synchronized Swarm Reconstruction (`requestAnimationFrame`)
  // -------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'reconstructing') return;

    if (memory.photos.length === 0) {
      setPhase('exploring');
      return;
    }

    if (prefersReducedMotion) {
      setPlacedPhotoIds(new Set(memory.photos.map((p) => p.id)));
      setPencilBackgroundProgress(1);
      setPhase('exploring');
      return;
    }

    let frameId: number;
    let startTime: number | null = null;
    const totalPhotos = memory.photos.length;
    const durationPerPhoto = 850; // ms per photo drawing & taping
    const totalDuration = totalPhotos * durationPerPhoto;

    const updateSwarmPhysics = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const totalProgress = Math.min(1, elapsed / totalDuration);

      setPencilBackgroundProgress(totalProgress);

      const photoIdx = Math.min(totalPhotos - 1, Math.floor(elapsed / durationPerPhoto));
      const currentPhoto = memory.photos[photoIdx];
      const photoProgress = Math.min(1, (elapsed % durationPerPhoto) / durationPerPhoto);

      // Mark placed photo IDs up to current photo
      setPlacedPhotoIds(
        new Set(memory.photos.slice(0, photoIdx + 1).map((p) => p.id))
      );

      // Track reveal progress map for smooth border clip-path reveal
      setPhotoRevealProgresses((prev) => ({
        ...prev,
        [currentPhoto.id]: photoProgress,
      }));

      // Calculate agent tip (x, y) dynamically around current photo perimeter
      const layout = photoSpatialLayout[photoIdx];
      if (layout) {
        const approxWidth = isMobile ? viewportWidth * 0.9 : 420;
        const approxHeight = 280;
        const startX = (layout.baseLeft / 100) * (viewportWidth > 1200 ? 1100 : viewportWidth * 0.9);
        const startY = layout.baseTop;

        // Perimeter trace path around photo frame (TL -> TR -> BR -> BL -> TL)
        let tipX = startX;
        let tipY = startY;

        if (photoProgress < 0.25) {
          const p = photoProgress / 0.25;
          tipX = startX + p * approxWidth;
          tipY = startY;
        } else if (photoProgress < 0.5) {
          const p = (photoProgress - 0.25) / 0.25;
          tipX = startX + approxWidth;
          tipY = startY + p * approxHeight;
        } else if (photoProgress < 0.75) {
          const p = (photoProgress - 0.5) / 0.25;
          tipX = startX + (1 - p) * approxWidth;
          tipY = startY + approxHeight;
        } else {
          const p = (photoProgress - 0.75) / 0.25;
          tipX = startX;
          tipY = startY + (1 - p) * approxHeight;
        }

        setStationeryAgents((prevAgents) => {
          const agentIndex = photoIdx % prevAgents.length;
          return prevAgents.map((ag, i) => {
            if (i === agentIndex) {
              return {
                ...ag,
                targetX: tipX,
                targetY: tipY,
                carryingPhotoId: currentPhoto.id,
              };
            }
            return ag;
          });
        });
      }

      if (totalProgress < 1) {
        frameId = requestAnimationFrame(updateSwarmPhysics);
      } else {
        // Finalize reveal progress for ALL photos to guarantee 100% sharpness and opacity
        const fullRevealMap: Record<string, number> = {};
        memory.photos.forEach((p) => { fullRevealMap[p.id] = 1; });
        setPhotoRevealProgresses(fullRevealMap);
        setPlacedPhotoIds(new Set(memory.photos.map((p) => p.id)));
        setPencilBackgroundProgress(1);

        setTimeout(() => {
          setPhase('auto_scrolling');
        }, 600);
      }
    };

    frameId = requestAnimationFrame(updateSwarmPhysics);
    return () => cancelAnimationFrame(frameId);
  }, [phase, memory.photos, prefersReducedMotion, photoSpatialLayout, isMobile, viewportWidth]);

  // -------------------------------------------------------------
  // Step 3: Automatic Scrolling after Reconstruction
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
    }, 600);

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
    setPlacedPhotoIds(new Set());
    setPhotoRevealProgresses({});
    setPencilBackgroundProgress(0);
    setFocusedPhotoId(null);
    setRepulsionOffsets({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setPhase('intro_title');
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
        setNewPhotoCaption(file.name.replace(/\.[^/.]+$/, ''));
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

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#F5F0E6] bg-vintage-paper selection:bg-[#D6C4A8] overflow-x-hidden"
    >
      {/* Workspace Sticky Top Banner */}
      <div className="sticky top-16 z-30 bg-[#F5F0E6]/95 backdrop-blur-md border-b border-[#D6C4A8]/70 px-3 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
            <button
              onClick={onBackToGallery}
              className="px-2.5 py-1.5 text-xs font-semibold text-[#8B735E] hover:text-[#493D35] bg-[#E8DDC9]/50 hover:bg-[#E8DDC9] rounded-lg transition-colors flex items-center gap-1.5 border border-[#D6C4A8]/60 shrink-0 min-h-[38px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Gallery</span>
            </button>

            <div className="hidden sm:block h-4 w-[1px] bg-[#D6C4A8]" />

            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-serif font-bold text-[#493D35] truncate max-w-[160px] sm:max-w-md">
                {memory.title}
              </h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#8B735E]">
                <span>{memory.date}</span>
                <span aria-hidden="true">·</span>
                <span>{memory.photos.length} photos</span>
              </div>
            </div>
          </div>

          {/* Controls: Lock status, Phase Badge, Add Photo */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isUnlocked ? (
              <div className="flex items-center gap-1">
                <span className="flex items-center gap-1 px-2 py-1 bg-[#66715C]/15 text-[#66715C] text-[11px] sm:text-xs font-semibold rounded-lg border border-[#66715C]/30">
                  <Unlock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">Editing Unlocked</span>
                </span>
                <button
                  onClick={handleRelockMemory}
                  className="p-1.5 text-[#8B735E] hover:text-[#493D35] bg-[#E8DDC9]/50 hover:bg-[#E8DDC9] rounded border border-[#D6C4A8]/60 transition-colors"
                  title="Lock editing for this session"
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
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#E8DDC9]/70 hover:bg-[#E8DDC9] text-[#493D35] text-xs font-medium rounded-lg border border-[#D6C4A8] transition-colors min-h-[36px]"
                title="Enter memory passcode to enable editing"
              >
                <Lock className="w-3.5 h-3.5 text-[#8B735E]" />
                <span className="hidden sm:inline">Unlock Editing</span>
              </button>
            )}

            {phase === 'reconstructing' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E8DDC9] rounded-full text-xs font-medium text-[#493D35] border border-[#D6C4A8]">
                <Sparkles className="w-3.5 h-3.5 text-[#66715C] animate-spin" />
                <span className="text-[11px] sm:text-xs">Swarm ({placedPhotoIds.size}/{memory.photos.length})</span>
              </div>
            )}

            {phase === 'auto_scrolling' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#E8DDC9] rounded-full text-xs font-medium text-[#493D35]">
                <Compass className="w-3.5 h-3.5 text-[#8B735E] animate-pulse" />
                <span className="hidden sm:inline">Navigating Memory...</span>
              </div>
            )}

            {phase === 'exploring' && (
              <button
                onClick={handleReplaySwarm}
                className="px-2.5 py-1.5 text-xs font-medium text-[#493D35] bg-[#E8DDC9] hover:bg-[#D6C4A8] rounded-lg transition-colors flex items-center gap-1.5 border border-[#D6C4A8] min-h-[36px]"
                title="Re-run Swarm Reconstruction Animation"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#8B735E]" />
                <span className="hidden sm:inline">Replay Swarm</span>
              </button>
            )}

            {isUnlocked && (
              <button
                onClick={handleRequestAddPhoto}
                className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#F5F0E6] bg-[#493D35] hover:bg-[#382E28] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[36px]"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Photo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Title Stroke Tracing Stage */}
      <div className="max-w-5xl mx-auto px-4 pt-6 sm:pt-10 text-center">
        <div className="relative py-2 sm:py-4 flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 800 120"
            className="w-full max-w-2xl h-16 sm:h-24 filter drop-shadow-[0_2px_4px_rgba(73,61,53,0.1)]"
          >
            <path
              ref={titlePathRef}
              d="M 50 80 C 120 20, 220 120, 320 60 C 420 10, 520 110, 620 50 C 680 20, 740 70, 770 60"
              fill="none"
              stroke="#D6C4A8"
              strokeWidth="1"
              strokeDasharray="4 6"
              opacity="0.4"
            />
            <path
              d="M 50 80 C 120 20, 220 120, 320 60 C 420 10, 520 110, 620 50 C 680 20, 740 70, 770 60"
              fill="none"
              stroke="#493D35"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={titlePathRef.current ? titlePathRef.current.getTotalLength() : 800}
              strokeDashoffset={
                titlePathRef.current
                  ? titlePathRef.current.getTotalLength() * (1 - titleProgress)
                  : 0
              }
              className="transition-[stroke-dashoffset] duration-75"
            />
            {titlePenPos && phase === 'intro_title' && (
              <g
                transform={`translate(${titlePenPos.x}, ${titlePenPos.y}) rotate(${Math.min(10, Math.max(-50, titlePenPos.angle - 35))})`}
                className="pointer-events-none"
              >
                <path d="M 0 0 L -5 -20 L 5 -20 Z" fill="#2E2620" stroke="#D6C4A8" strokeWidth="0.8" />
                <line x1="0" y1="0" x2="0" y2="-14" stroke="#E8DDC9" strokeWidth="0.6" opacity="0.8" />
                <circle cx="0" cy="0" r="2" fill="#493D35" />
              </g>
            )}
          </svg>

          <h2 className="text-xl sm:text-3xl font-serif italic text-[#493D35] font-bold tracking-tight mt-1">
            {memory.title}
          </h2>

          {memory.description && (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[#8B735E] max-w-2xl leading-relaxed italic px-2">
              &ldquo;{memory.description}&rdquo;
            </p>
          )}

          <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs text-[#8B735E]">
            <span>Kilpauk Medical College, Chennai</span>
            <span aria-hidden="true">·</span>
            <span>MBBS Class of 2026</span>
            <span aria-hidden="true">·</span>
            <span>{memory.date}</span>
          </div>
        </div>
      </div>

      {/* Main Organic Swarm Spatial Canvas */}
      <div
        className="relative max-w-6xl mx-auto px-2 sm:px-4 mt-4 sm:mt-6"
        style={{ height: `${totalCompositionHeight}px` }}
      >
        {/* Permanent Pencil-Shaded Cover Photograph Background Layer */}
        {coverPhoto && (
          <div className="absolute inset-x-0 top-6 bottom-16 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-30">
            <div className="w-[92%] sm:w-[88%] h-[85%] max-w-4xl max-h-[850px] relative rounded-3xl overflow-hidden shadow-inner">
              <GraphitePencilCoverCanvas
                imageUrl={coverPhoto.url}
                progress={phase === 'intro_title' ? 0.1 : pencilBackgroundProgress}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#F5F0E6] via-transparent to-[#F5F0E6] opacity-75" />
            </div>
          </div>
        )}

        {/* Physical Illustrated Stationery Swarm Agents Assembling Photographs */}
        {phase === 'reconstructing' && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {stationeryAgents.map((ag) => (
              <StationeryAgent
                key={ag.id}
                type={ag.toolType}
                x={ag.targetX}
                y={ag.targetY}
                label={`${ag.name}`}
                isWriting={true}
                scale={isMobile ? 0.7 : 0.85}
                className="transition-all duration-300 ease-out"
              />
            ))}
          </div>
        )}

        {/* Empty state if memory has no photos */}
        {memory.photos.length === 0 && (
          <div className="my-16 p-8 sm:p-12 bg-[#FCFBF7] border border-dashed border-[#D6C4A8] rounded-2xl text-center max-w-lg mx-auto shadow-sm">
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
              className="mt-5 px-5 py-2.5 bg-[#493D35] text-[#F5F0E6] rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-[#382E28] transition-colors flex items-center gap-2 mx-auto min-h-[44px]"
            >
              <ImagePlus className="w-4 h-4 text-[#D6C4A8]" />
              <span>Add First Photograph</span>
            </button>
          </div>
        )}

        {/* Spatial Photographs Layer */}
        {photoSpatialLayout.map((layout) => {
          const photo = layout.photo;
          const isPlaced = placedPhotoIds.has(photo.id);
          const isFocused = focusedPhotoId === photo.id;
          const offset = repulsionOffsets[photo.id] || { dx: 0, dy: 0 };
          const revealProgress = photoRevealProgresses[photo.id] ?? (isPlaced ? 1 : 0);

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
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease, opacity 0.5s ease',
                opacity: phase === 'reconstructing'
                  ? (isPlaced ? Math.max(0.2, revealProgress) : 0)
                  : (isPlaced ? 1 : 0),
                pointerEvents: isPlaced ? 'auto' : 'none',
              }}
              className="cursor-pointer group"
            >
              {/* Scrapbook Polaroid & Snapshot Frame */}
              <div
                className={`p-2.5 sm:p-3 pb-4 sm:pb-5 rounded-lg bg-[#FCFBF7] border border-[#D6C4A8]/80 transition-shadow duration-300 ${
                  isFocused
                    ? 'shadow-[0_20px_40px_rgba(73,61,53,0.22)] ring-2 ring-[#8B735E]/40'
                    : 'shadow-[0_8px_24px_rgba(73,61,53,0.08)] group-hover:shadow-[0_14px_30px_rgba(73,61,53,0.14)]'
                }`}
              >
                {/* Vintage Washi Tape / Photo Corner Graphic */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 sm:w-16 h-3.5 sm:h-4 bg-[#E8DDC9]/80 border border-dashed border-[#8B735E]/30 rounded-xs transform -rotate-1 pointer-events-none" />

                {/* Photo Image View */}
                <div className="relative aspect-[4/3] bg-[#E8DDC9]/40 overflow-hidden rounded">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Memory frame'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />

                  {/* Quick Expand Icon on Hover */}
                  <div className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Handwritten Polaroid Caption */}
                <div className="mt-2.5 sm:mt-3 px-0.5 sm:px-1">
                  <p className="text-xs sm:text-sm font-handwritten text-[#493D35] leading-snug">
                    {photo.caption || (
                      <span className="italic text-[#8B735E]">Uncaptioned memory</span>
                    )}
                  </p>

                  <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[10px] sm:text-[11px] text-[#8B735E]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FCFBF7] w-full max-w-lg rounded-xl border border-[#D6C4A8] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#D6C4A8]">
              <h3 className="text-base font-serif font-bold text-[#493D35]">
                Add Photograph to Swarm
              </h3>
              <button onClick={() => setIsAddingPhoto(false)} className="text-[#8B735E] hover:text-[#493D35] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8B735E] my-3 leading-relaxed">
              Upload a local file or paste an image URL to add a new memory frame directly to &quot;{memory.title}&quot;.
            </p>

            <form onSubmit={handleQuickAddPhoto} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                  Photograph Source
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://... or choose local file"
                    required
                    className="flex-1 px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35] focus:outline-none focus:ring-1 focus:ring-[#8B735E]"
                  />
                  <label className="px-3 py-2 bg-[#E8DDC9] hover:bg-[#D6C4A8] text-[#493D35] rounded-lg font-medium cursor-pointer flex items-center gap-1 shrink-0 transition-colors">
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

              {newPhotoUrl && (
                <div className="aspect-[16/10] max-h-48 rounded overflow-hidden border border-[#D6C4A8]">
                  <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#493D35] mb-1">
                  Caption / Memory Notes
                </label>
                <input
                  type="text"
                  value={newPhotoCaption}
                  onChange={(e) => setNewPhotoCaption(e.target.value)}
                  placeholder="What was happening here? Who was in the frame?"
                  className="w-full px-3 py-2 bg-white border border-[#D6C4A8] rounded-lg text-xs text-[#493D35]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#D6C4A8]">
                <button
                  type="button"
                  onClick={() => setIsAddingPhoto(false)}
                  className="px-3 py-1.5 text-xs text-[#8B735E] hover:text-[#493D35]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPhoto || !newPhotoUrl.trim()}
                  className="px-4 py-1.5 bg-[#493D35] text-[#F5F0E6] rounded-lg text-xs font-semibold hover:bg-[#382E28] disabled:opacity-50 min-h-[36px]"
                >
                  {isUploadingPhoto ? 'Adding...' : 'Insert Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for clicked photograph */}
      {selectedPhotoForLightbox && (
        <PhotoLightbox
          photo={selectedPhotoForLightbox}
          allPhotos={memory.photos}
          memoryTitle={memory.title}
          isCover={memory.coverPhotoId === selectedPhotoForLightbox.id}
          students={students}
          isUnlocked={isUnlocked}
          onRequestUnlock={(actionDesc) => {
            setPasswordModalAction(actionDesc);
            setPendingCallback(null);
            setIsPasswordModalOpen(true);
          }}
          onClose={() => setSelectedPhotoForLightbox(null)}
          onNavigate={(nextPhoto) => setSelectedPhotoForLightbox(nextPhoto)}
          onUpdateDetails={async (photoId, updates) => {
            await onUpdatePhoto(photoId, updates);
            setSelectedPhotoForLightbox((prev) => (prev ? { ...prev, ...updates } : null));
          }}
          onDeletePhoto={async (photoId) => {
            await onDeletePhoto(photoId);
            setSelectedPhotoForLightbox(null);
          }}
        />
      )}

      {/* Memory Password Modal Interceptor */}
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
