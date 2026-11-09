import React, { useEffect, useRef, useState } from 'react';

interface MultiAgentTitleTracingProps {
  title: string;
  onComplete: () => void;
  speedMultiplier?: number;
}

interface TracingAgentState {
  id: string;
  name: string;
  color: string;
  toolType: 'fountain_pen' | 'fineliner' | 'pencil';
  x: number;
  y: number;
  angle: number;
  active: boolean;
  charRange: [number, number]; // index range of characters this agent is writing
}

export const MultiAgentTitleTracing: React.FC<MultiAgentTitleTracingProps> = ({
  title,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Divide title length across 3 collaborating stationery agents
  const len = Math.max(1, title.length);
  const third = Math.ceil(len / 3);

  const [agents, setAgents] = useState<TracingAgentState[]>([
    {
      id: 'agent-fountain-pen',
      name: 'Brass Fountain Pen',
      color: '#493D35',
      toolType: 'fountain_pen',
      x: 60,
      y: 40,
      angle: -25,
      active: true,
      charRange: [0, Math.min(len, third)],
    },
    {
      id: 'agent-fineliner',
      name: 'Technical Fineliner',
      color: '#66715C',
      toolType: 'fineliner',
      x: 180,
      y: 40,
      angle: -35,
      active: true,
      charRange: [third, Math.min(len, third * 2)],
    },
    {
      id: 'agent-pencil',
      name: 'Graphite 2B',
      color: '#8B735E',
      toolType: 'pencil',
      x: 320,
      y: 40,
      angle: -20,
      active: true,
      charRange: [third * 2, len],
    },
  ]);

  useEffect(() => {
    const duration = 2800; // 2.8s collaborative tracing
    const startTime = performance.now();
    let frameId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Natural cursive handwriting velocity
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setProgress(ease);

      // Compute agent tip positions across title text bounding width
      const width = containerRef.current ? containerRef.current.clientWidth : 600;
      const charWidth = Math.min(32, Math.max(14, width / (len + 4)));
      const baseBaseline = 56;

      setAgents((prev) =>
        prev.map((ag, i) => {
          const [startChar, endChar] = ag.charRange;
          const rangeSpan = Math.max(1, endChar - startChar);
          const currentAgentChar = startChar + ease * rangeSpan;

          // Natural organic letter wave motion (sinusoidal script curves)
          const targetX = 30 + currentAgentChar * charWidth;
          const targetY = baseBaseline + Math.sin(ease * Math.PI * 6 + i * 2) * 8;
          const targetAngle = -30 + Math.cos(ease * Math.PI * 8) * 15;

          return {
            ...ag,
            x: targetX,
            y: targetY,
            angle: targetAngle,
            active: t < 1,
          };
        })
      );

      if (t < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setIsFinished(true);
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [title, onComplete]);

  // Compute revealed characters
  const visibleCharsCount = Math.floor(progress * title.length);
  const revealedTitle = title.slice(0, visibleCharsCount);
  const remainingTitle = title.slice(visibleCharsCount);

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto py-6 px-4 select-none">
      {/* Draft construction baseline */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 900 110"
          className="w-full max-w-3xl h-20 sm:h-28 overflow-visible filter drop-shadow-[0_2px_4px_rgba(73,61,53,0.12)]"
        >
          {/* Subtle paper construction guide rule */}
          <line
            x1="20"
            y1="76"
            x2="880"
            y2="76"
            stroke="#D6C4A8"
            strokeWidth="0.8"
            strokeDasharray="4 6"
            opacity="0.35"
          />

          {/* Underlay shadow cursive trace */}
          <text
            x="50%"
            y="72"
            textAnchor="middle"
            className="font-serif italic text-2xl sm:text-4xl font-bold fill-transparent"
            stroke="rgba(214, 196, 168, 0.4)"
            strokeWidth="1.2"
            strokeDasharray="3 4"
          >
            {title}
          </text>

          {/* Inked collaborative title with stroke-dash effect */}
          <text
            x="50%"
            y="72"
            textAnchor="middle"
            className="font-serif italic text-2xl sm:text-4xl font-bold"
            fill="#493D35"
            stroke="#493D35"
            strokeWidth="1.2"
            style={{
              clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
              transition: 'clip-path 75ms linear',
            }}
          >
            {title}
          </text>

          {/* Collaborative Stationery Agents with Physical Nibs Tracing the Text */}
          {!isFinished &&
            agents.map((ag) => (
              <g
                key={ag.id}
                transform={`translate(${ag.x}, ${ag.y}) rotate(${ag.angle})`}
                className="pointer-events-none transition-transform duration-75"
              >
                {/* Physical Writing Nib Body */}
                <path
                  d="M 0 0 L -6 -24 L 6 -24 Z"
                  fill="#2E2620"
                  stroke="#D6C4A8"
                  strokeWidth="0.8"
                />
                {/* Nib split */}
                <line x1="0" y1="0" x2="0" y2="-16" stroke="#FAF6EE" strokeWidth="0.6" opacity="0.8" />
                {/* Ink tip contact dot */}
                <circle cx="0" cy="0" r="2.2" fill={ag.color} />
                {/* Stylus Shaft */}
                <rect x="-3" y="-38" width="6" height="14" rx="1" fill="#493D35" />

                {/* Floating label tag */}
                <text
                  x="10"
                  y="-26"
                  transform={`rotate(${-ag.angle})`}
                  className="text-[9px] font-mono fill-[#8B735E] select-none"
                >
                  {ag.name}
                </text>
              </g>
            ))}
        </svg>
      </div>

      {/* Tracing Subtitle Status */}
      <div className="text-center mt-2 flex items-center justify-center gap-2 text-xs font-handwritten text-[#8B735E]">
        <span>Collaborative Multi-Agent Inking</span>
        <span aria-hidden="true">·</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
    </div>
  );
};
