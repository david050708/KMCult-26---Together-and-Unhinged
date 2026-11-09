import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

export interface HandwrittenTitleHandle {
  startAnimation: () => void;
  resetAnimation: () => void;
  skipAnimation: () => void;
}

interface HandwrittenTitleProps {
  isDocked: boolean;
  onWritingComplete?: () => void;
  onDockComplete?: () => void;
  onClickLogo?: () => void;
}

/**
 * The permanent, stroke-drawn handwritten title for "KMCult'26".
 * Preserved throughout the entire application lifecycle:
 * Starts in center of page -> Written physically with a sleek writing tip -> Glides & scales directly into top header!
 *
 * Exact title: KMCult'26
 * Clear distinct characters:
 * - K (distinct stem & arms)
 * - M (three arches)
 * - C (rounded bowl)
 * - u (double undercurves)
 * - l (tall ascender loop to crest)
 * - t (crisp upright stem & horizontal crossbar)
 * - ' (apostrophe immediately following t)
 * - 2 (swan neck curve & base)
 * - 6 (descending back & closed bowl)
 */
export const HandwrittenTitle = forwardRef<HandwrittenTitleHandle, HandwrittenTitleProps>(({
  isDocked,
  onWritingComplete,
  onClickLogo,
}, ref) => {
  const [progress, setProgress] = useState(isDocked ? 1 : 0);
  const [tipPos, setTipPos] = useState<{ x: number; y: number; angle: number } | null>(null);
  const [isWritingActive, setIsWritingActive] = useState(!isDocked);
  const [isStrokeFinished, setIsStrokeFinished] = useState(isDocked);

  const pathRef = useRef<SVGPathElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // SVG viewBox dimensions
  const viewBoxW = 660;
  const viewBoxH = 160;

  // Exact cursive stroke paths for "KMCult'26"
  // Completely clear and unmistakable: K - M - C - u - l - t - crossbar - ' - 2 - 6
  const cursiveTitlePath = `
    M 50 36 C 48 65 48 100 50 128 C 48 132 44 130 42 126
    M 110 38 C 96 55 76 74 58 84 C 76 90 98 108 116 128
    M 132 98 C 138 68 152 44 164 44 C 170 44 172 70 172 128
    M 172 82 C 180 56 194 48 204 48 C 210 48 212 75 212 128
    M 212 82 C 220 58 234 52 244 52 C 252 52 254 78 254 128 C 254 134 260 132 266 122
    M 282 64 C 276 46 292 40 304 40 C 316 40 286 68 282 96 C 278 122 298 132 314 126 C 324 122 330 112 336 102
    M 336 102 C 338 116 344 128 354 128 C 366 128 368 108 368 88 C 368 106 372 128 384 128 C 392 128 398 118 402 102
    M 402 102 C 408 65 422 22 432 22 C 438 22 430 46 426 78 C 422 105 422 124 428 128 C 434 132 440 126 446 110
    M 446 110 C 452 86 458 52 460 36 C 462 36 460 78 460 110 C 460 125 466 130 472 126 C 478 122 484 112 488 102
    M 450 68 L 474 68
    M 488 32 C 492 30 495 33 494 38 C 492 46 486 52 482 54
    M 508 56 C 510 42 526 36 538 46 C 548 56 538 76 516 108 C 510 116 506 126 508 128 L 556 128
    M 598 36 C 584 60 572 90 574 110 C 576 122 586 128 596 126 C 606 124 612 114 612 104 C 612 92 602 84 590 84 C 578 84 574 96 574 108
  `;

  const runWriting = () => {
    if (!pathRef.current) return;
    const path = pathRef.current;
    const totalLength = path.getTotalLength();
    const duration = 3200; // 3.2 seconds fluid cursive writing
    const startTime = performance.now();

    setIsWritingActive(true);
    setIsStrokeFinished(false);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Natural handwriting velocity curve
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setProgress(ease);

      // Calculate writing tip position & tangent angle
      const currentLen = ease * totalLength;
      const point = path.getPointAtLength(currentLen);
      const lookAhead = Math.min(totalLength, currentLen + 2);
      const nextPoint = path.getPointAtLength(lookAhead);
      const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);

      setTipPos({ x: point.x, y: point.y, angle });

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsStrokeFinished(true);
        setTimeout(() => {
          setIsWritingActive(false);
          if (onWritingComplete) onWritingComplete();
        }, 700);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  useImperativeHandle(ref, () => ({
    startAnimation: () => {
      setProgress(0);
      runWriting();
    },
    resetAnimation: () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setProgress(0);
      setIsStrokeFinished(false);
      setIsWritingActive(true);
    },
    skipAnimation: () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setProgress(1);
      setIsStrokeFinished(true);
      setIsWritingActive(false);
      if (onWritingComplete) onWritingComplete();
    }
  }));

  useEffect(() => {
    if (!isDocked && progress === 0) {
      const delay = setTimeout(() => {
        runWriting();
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [isDocked]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 select-none pointer-events-auto transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isDocked
          ? 'top-2.5 left-4 sm:left-6 md:left-8 translate-x-0 translate-y-0 scale-[0.38] origin-top-left'
          : 'top-[36vh] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100 origin-center'
      }`}
      onClick={isDocked && onClickLogo ? onClickLogo : undefined}
      style={{ cursor: isDocked ? 'pointer' : 'default' }}
      title={isDocked ? "KMCult'26 · Kilpauk Medical College, Chennai" : undefined}
    >
      <div className="relative w-[340px] sm:w-[520px] md:w-[680px] aspect-[660/160]">
        <svg
          viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
          className="w-full h-full overflow-visible filter drop-shadow-[0_2px_4px_rgba(73,61,53,0.18)]"
        >
          {/* Subtle paper draft guide line (visible during centered writing, vanishes when docked) */}
          {!isDocked && (
            <line
              x1="30"
              y1="130"
              x2="630"
              y2="130"
              stroke="#D6C4A8"
              strokeWidth="0.8"
              strokeDasharray="4 6"
              opacity="0.35"
            />
          )}

          {/* Reference path for stroke length calculation */}
          <path
            ref={pathRef}
            d={cursiveTitlePath}
            fill="none"
            stroke="transparent"
            strokeWidth="1"
          />

          {/* The Actual Inked Stroke of "KMCult'26" */}
          {pathRef.current && (
            <path
              d={cursiveTitlePath}
              fill="none"
              stroke="#493D35"
              strokeWidth={isDocked ? 6.2 : 5.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathRef.current.getTotalLength()}
              strokeDashoffset={pathRef.current.getTotalLength() * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-75"
            />
          )}

          {/* 
            SIMPLER WRITING-TIP ANIMATION (Requirement 3):
            Replaced large fountain pen with a sleek, minimal, elegant writing nib tip.
            Focus is 100% on the cursive title strokes flowing onto the paper.
          */}
          {tipPos && isWritingActive && !isStrokeFinished && (
            <g
              transform={`translate(${tipPos.x}, ${tipPos.y}) rotate(${Math.min(15, Math.max(-60, tipPos.angle - 35))})`}
              className="pointer-events-none transition-opacity duration-300"
            >
              {/* Sleek writing nib outline */}
              <path
                d="M 0 0 L -6 -24 L 6 -24 Z"
                fill="#2E2620"
                stroke="#D6C4A8"
                strokeWidth="0.8"
              />
              {/* Metallic nib center split */}
              <line x1="0" y1="0" x2="0" y2="-16" stroke="#E8DDC9" strokeWidth="0.6" opacity="0.8" />
              {/* Slender pen shaft guide */}
              <rect x="-3" y="-38" width="6" height="14" rx="1" fill="#493D35" />
              {/* Contact point ink glow */}
              <circle cx="0" cy="0" r="2.2" fill="#493D35" />
              <circle cx="0" cy="0" r="1.2" fill="#D6C4A8" opacity="0.6" />
            </g>
          )}
        </svg>

        {/* Subtitle during centered writing, fades out when docked */}
        {!isDocked && (
          <div
            className={`mt-4 text-center transition-all duration-700 ${
              progress > 0.85 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-xs sm:text-sm font-serif italic text-[#493D35] font-semibold tracking-wide">
              Kilpauk Medical College, Chennai
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8B735E] font-medium mt-0.5">
              MBBS Batch of 2026 Archive
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

HandwrittenTitle.displayName = 'HandwrittenTitle';
