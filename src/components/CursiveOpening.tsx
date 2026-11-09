import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Play, FastForward } from 'lucide-react';

interface CursiveOpeningProps {
  onComplete: () => void;
  standalone?: boolean;
}

export const CursiveOpening: React.FC<CursiveOpeningProps> = ({ onComplete, standalone = false }) => {
  const [progress, setProgress] = useState(0); // 0 to 1
  const [penPos, setPenPos] = useState<{ x: number; y: number; angle: number } | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const pathRef = useRef<SVGPathElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // SVG dimensions for the cursive title
  const viewBoxWidth = 860;
  const viewBoxHeight = 240;

  // Authentic cursive stroke coordinates for "KMCult'26"
  // Stroke 1: K (capital calligraphic stem and loop)
  // Stroke 2: M (flowing arches)
  // Stroke 3: C (grand loop into u-l-t)
  // Stroke 4: apostrophe (')
  // Stroke 5: 26 (sweeping 2 and looped 6)
  const cursivePath = `
    M 75 160 C 72 130 80 85 88 55 C 92 40 102 38 108 52 C 114 68 116 110 112 170 C 110 185 104 190 98 186
    M 175 62 C 150 90 120 125 102 140 C 125 145 155 170 178 190
    M 215 125 C 220 95 235 90 248 110 C 260 135 255 178 250 190 C 265 140 285 92 305 110 C 318 125 315 170 310 190 C 322 145 340 100 360 110 C 375 122 372 170 368 190
    M 405 135 C 400 95 440 85 455 110 C 445 155 420 185 440 190 C 458 190 475 160 485 140
    M 495 135 C 498 165 505 188 525 188 C 540 188 548 165 550 135 C 552 165 558 188 578 188 C 592 188 600 168 605 140
    M 615 65 C 615 120 612 170 622 188 C 628 190 635 185 645 170
    M 598 115 L 638 115
    M 658 50 C 662 50 668 56 665 65 C 662 75 652 85 648 88
    M 690 95 C 695 72 730 65 745 85 C 755 100 740 125 700 165 L 755 165
    M 810 80 C 785 100 770 135 775 165 C 780 188 805 190 818 178 C 830 165 830 142 815 135 C 795 125 780 145 780 160
  `;

  useEffect(() => {
    // Slight pause at start for clean presentation
    const timer = setTimeout(() => {
      setIsStarted(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isStarted || !pathRef.current) return;

    const path = pathRef.current;
    const totalLength = path.getTotalLength();
    const duration = 3800; // 3.8 seconds smooth handwriting
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Easing: natural penman pacing
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setProgress(ease);

      // Sample pen position on the SVG curve
      const currentLength = ease * totalLength;
      const point = path.getPointAtLength(currentLength);

      // Sample ahead for tangent angle
      const lookAhead = Math.min(totalLength, currentLength + 2);
      const pointAhead = path.getPointAtLength(lookAhead);
      const angle = Math.atan2(pointAhead.y - point.y, pointAhead.x - point.x) * (180 / Math.PI);

      setPenPos({ x: point.x, y: point.y, angle });

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsFinished(true);
        // Completed stroke, pause and transition
        setTimeout(() => {
          onComplete();
        }, 1200);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isStarted, onComplete]);

  const handleSkip = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setProgress(1);
    setIsFinished(true);
    onComplete();
  };

  return (
    <div className="relative min-h-[480px] w-full flex flex-col items-center justify-center py-12 px-4 overflow-hidden select-none">
      {/* Background paper texture & warm glow */}
      <div className="absolute inset-0 bg-[#F5F0E6] pointer-events-none" />
      <div className="absolute w-[600px] h-[300px] bg-[#E8DDC9]/50 rounded-full blur-3xl -top-20 pointer-events-none" />

      {/* Skip button for immediate access */}
      {!standalone && !isFinished && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8B735E] hover:text-[#493D35] bg-[#E8DDC9]/60 hover:bg-[#E8DDC9] rounded-md transition-colors border border-[#D6C4A8]/60"
        >
          <span>Skip to Login</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Top subtle vintage crest / year badge */}
      <div className={`transition-opacity duration-1000 mb-2 ${isStarted ? 'opacity-100' : 'opacity-0'}`}>
        <p className="text-xs uppercase tracking-[0.25em] text-[#8B735E] font-medium font-serif">
          The MBBS Batch Memory Archive
        </p>
      </div>

      {/* Main Calligraphic Canvas */}
      <div className="relative w-full max-w-[860px] aspect-[860/240] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-full filter drop-shadow-[0_2px_4px_rgba(73,61,53,0.15)]"
          style={{ overflow: 'visible' }}
        >
          {/* Subtle guide hairline for vintage draft paper feel */}
          <line
            x1="50"
            y1="190"
            x2="840"
            y2="190"
            stroke="#D6C4A8"
            strokeWidth="0.8"
            strokeDasharray="4 6"
            opacity="0.5"
          />

          {/* Reference path for length computation */}
          <path
            ref={pathRef}
            d={cursivePath}
            fill="none"
            stroke="transparent"
            strokeWidth="1"
          />

          {/* Animated Inked Stroke */}
          {pathRef.current && (
            <path
              d={cursivePath}
              fill="none"
              stroke="#493D35"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathRef.current.getTotalLength()}
              strokeDashoffset={pathRef.current.getTotalLength() * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-75"
            />
          )}

          {/* Animated Calligraphy Agent (Quill & Nib) */}
          {penPos && !isFinished && (
            <g
              transform={`translate(${penPos.x}, ${penPos.y}) rotate(${Math.min(30, Math.max(-30, penPos.angle - 40))})`}
              className="transition-transform duration-75"
            >
              {/* Fresh Ink Droplet at Nib */}
              <circle cx="0" cy="0" r="3.2" fill="#493D35" />
              <circle cx="0" cy="0" r="6" fill="#8B735E" opacity="0.3" className="animate-ping" />

              {/* Ink Nib (Golden Brass) */}
              <path
                d="M 0 0 L -8 -22 L 8 -22 Z"
                fill="#8B735E"
                stroke="#493D35"
                strokeWidth="0.8"
              />
              <line x1="0" y1="0" x2="0" y2="-18" stroke="#F5F0E6" strokeWidth="0.8" />

              {/* Vintage Quill Feather body extending upwards */}
              <path
                d="M -8 -22 Q -22 -65 -3 -110 Q 15 -70 8 -22 Z"
                fill="#66715C"
                opacity="0.85"
                stroke="#493D35"
                strokeWidth="0.8"
              />
              <path
                d="M 0 -22 Q -5 -65 0 -105"
                stroke="#E8DDC9"
                strokeWidth="1.2"
                fill="none"
              />

              {/* Trailing golden ink sparkle */}
              <circle cx="-3" cy="-10" r="1.5" fill="#D6C4A8" opacity="0.8" />
            </g>
          )}
        </svg>
      </div>

      {/* Completed Title Typography & Subtitle revelation */}
      <div
        className={`mt-6 text-center transition-all duration-1000 ${
          isFinished || progress > 0.85
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-3'
        }`}
      >
        <h2 className="text-xl md:text-2xl font-serif text-[#493D35] tracking-wide italic font-medium">
          A Collective Chronicle of 150 Journeys
        </h2>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs md:text-sm text-[#8B735E] font-sans">
          <span>Kilpauk Medical College, Chennai</span>
          <span aria-hidden="true">·</span>
          <span>Batch of 2026</span>
          <span aria-hidden="true">·</span>
          <span>Shared Memory &amp; Swarm Workspace</span>
        </div>
      </div>
    </div>
  );
};
