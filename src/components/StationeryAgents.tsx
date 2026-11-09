import React from 'react';

export type StationeryType = 'pencil' | 'fountain_pen' | 'colored_pencil' | 'fineliner' | 'marker';

interface StationeryAgentProps {
  type: StationeryType;
  x: number;
  y: number;
  angle?: number; // tilt angle in degrees, default around -35deg for natural right-hand grip
  isWriting?: boolean;
  scale?: number;
  label?: string;
  className?: string;
}

/**
 * Physical stationery tools illustrated with high aesthetic fidelity.
 * Anchor point (0, 0) is precisely at the tip of the pencil lead / pen nib.
 */
export const StationeryAgent: React.FC<StationeryAgentProps> = ({
  type,
  x,
  y,
  angle = -35,
  isWriting = false,
  scale = 1,
  label,
  className = ''
}) => {
  return (
    <div
      className={`absolute pointer-events-none z-50 select-none will-change-transform ${className}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate3d(0, 0, 0) scale(${scale})`,
        transition: 'left 0.15s ease-out, top 0.15s ease-out',
      }}
    >
      <div
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0 0',
        }}
        className="relative"
      >
        {/* Render specific stationery tool with (0,0) as tip */}
        {type === 'pencil' && <GraphitePencilIllustration isWriting={isWriting} />}
        {type === 'fountain_pen' && <FountainPenIllustration isWriting={isWriting} />}
        {type === 'colored_pencil' && <ColoredPencilIllustration isWriting={isWriting} color="#66715C" />}
        {type === 'fineliner' && <FinelinerIllustration isWriting={isWriting} />}
        {type === 'marker' && <MarkerIllustration isWriting={isWriting} />}

        {/* Small stationery label badge */}
        {label && (
          <div
            className="absolute -top-12 left-10 bg-[#FCFBF7]/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono font-medium text-[#493D35] border border-[#D6C4A8] shadow-xs whitespace-nowrap"
            style={{ transform: `rotate(${-angle}deg)` }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 1. Classic Yellow-Ochre Hexagonal Graphite Pencil
 * Tip at (0, 0)
 */
export const GraphitePencilIllustration: React.FC<{ isWriting?: boolean }> = ({ isWriting }) => {
  return (
    <svg width="40" height="150" viewBox="-20 0 40 150" className="overflow-visible filter drop-shadow-[2px_6px_6px_rgba(73,61,53,0.25)]">
      {/* Dynamic contact graphite dust / tiny shadow at tip */}
      {isWriting && (
        <ellipse cx="0" cy="0" rx="2.5" ry="1.2" fill="#493D35" opacity="0.6" className="animate-ping" />
      )}

      {/* Graphite Lead Tip at (0, 0) */}
      <polygon points="0,0 -2.5,9 2.5,9" fill="#2E2824" />
      <polygon points="0,0 0,9 2.5,9" fill="#1A1715" />

      {/* Sharpened Cedar Wood Cone */}
      <polygon points="-2.5,9 -7,30 7,30 2.5,9" fill="#E8C79D" />
      <polygon points="0,9 0,30 7,30 2.5,9" fill="#DDB282" />
      {/* Wood grain scallops */}
      <path d="M -7,30 Q -3.5,24 0,30 Q 3.5,24 7,30" fill="#DDB282" opacity="0.6" />

      {/* Hexagonal Yellow-Ochre Pencil Barrel */}
      {/* Left facet (shaded) */}
      <polygon points="-7,30 -7,115 -2,115 -2,30" fill="#C9943C" />
      {/* Center facet (highlighted) */}
      <polygon points="-2,30 -2,115 3,115 3,30" fill="#E6AE4A" />
      {/* Right facet (core tone) */}
      <polygon points="3,30 3,115 7,115 7,30" fill="#B88533" />

      {/* Gold Foil Imprint */}
      <text x="0" y="75" fill="#6B4B18" fontSize="5" fontFamily="monospace" textAnchor="middle" transform="rotate(-90 0 75)" letterSpacing="1">
        KMC 2B
      </text>

      {/* Brass / Aluminum Ferrule */}
      <rect x="-7" y="115" width="14" height="14" fill="#C5A059" stroke="#9A7937" strokeWidth="0.5" />
      <line x1="-7" y1="120" x2="7" y2="120" stroke="#7A5F26" strokeWidth="0.8" />
      <line x1="-7" y1="124" x2="7" y2="124" stroke="#7A5F26" strokeWidth="0.8" />

      {/* Pink Rubber Eraser */}
      <rect x="-6.5" y="129" width="13" height="15" rx="3" fill="#E58E8A" />
      <rect x="-1" y="129" width="4" height="15" fill="#D87874" opacity="0.5" />
    </svg>
  );
};

/**
 * 2. Executive Fountain Pen with Dual-Tone Brass Nib
 * Tip at (0, 0)
 */
export const FountainPenIllustration: React.FC<{ isWriting?: boolean }> = ({ isWriting }) => {
  return (
    <svg width="44" height="160" viewBox="-22 0 44 160" className="overflow-visible filter drop-shadow-[2px_8px_8px_rgba(73,61,53,0.3)]">
      {/* Wet ink glistening at tip */}
      {isWriting && (
        <circle cx="0" cy="0" r="2.8" fill="#493D35" className="animate-pulse" />
      )}

      {/* Dual-Tone Brass Fountain Nib ending at (0, 0) */}
      <path
        d="M 0,0 L -4.5,14 Q -6.5,24 -8,32 L 8,32 Q 6.5,24 4.5,14 Z"
        fill="#D4AF37"
        stroke="#8B735E"
        strokeWidth="0.5"
      />
      {/* Silver inner flourish inlay */}
      <path
        d="M 0,4 L -2.5,14 Q -3.5,22 -4,28 L 4,28 Q 3.5,22 2.5,14 Z"
        fill="#E8E8E8"
      />
      {/* Ink Breather Hole & Central Slit */}
      <line x1="0" y1="0" x2="0" y2="20" stroke="#493D35" strokeWidth="0.75" />
      <circle cx="0" cy="20" r="1.5" fill="#493D35" />

      {/* Black Section Grip Collar */}
      <polygon points="-7,32 -6.5,50 6.5,50 7,32" fill="#2E2824" />
      <line x1="-6.5" y1="42" x2="6.5" y2="42" stroke="#493D35" strokeWidth="0.8" />

      {/* Gold Trim Ring */}
      <rect x="-7.5" y="50" width="15" height="3" fill="#D4AF37" stroke="#8B735E" strokeWidth="0.4" />

      {/* Deep Walnut / Ebonite Lacquer Barrel */}
      <polygon points="-7.5,53 -8.5,135 8.5,135 7.5,53" fill="#493D35" />
      {/* Subtle barrel highlight */}
      <polygon points="-2,53 -2.5,135 1.5,135 2,53" fill="#69574D" opacity="0.6" />

      {/* Golden End Cap / Finial */}
      <path d="M -8.5,135 Q 0,148 8.5,135 Z" fill="#D4AF37" />

      {/* Metallic Clip on Cap body */}
      <path d="M 6.5,60 L 8.5,62 L 7.5,115 L 5.5,112 Z" fill="#E8DDC9" stroke="#8B735E" strokeWidth="0.4" />
    </svg>
  );
};

/**
 * 3. Sage Green Coloured Pencil
 * Tip at (0, 0)
 */
export const ColoredPencilIllustration: React.FC<{ isWriting?: boolean; color?: string }> = ({ isWriting, color = '#66715C' }) => {
  return (
    <svg width="36" height="145" viewBox="-18 0 36 145" className="overflow-visible filter drop-shadow-[2px_6px_6px_rgba(73,61,53,0.22)]">
      {isWriting && (
        <circle cx="0" cy="0" r="2.2" fill={color} opacity="0.7" className="animate-ping" />
      )}

      {/* Coloured Pigment Core Tip */}
      <polygon points="0,0 -2.5,9 2.5,9" fill={color} />

      {/* Cedar Wood Cone */}
      <polygon points="-2.5,9 -6.5,28 6.5,28 2.5,9" fill="#E8C79D" />
      <polygon points="0,9 0,28 6.5,28 2.5,9" fill="#DDB282" />

      {/* Lacquered Body (Sage Green or Custom) */}
      <polygon points="-6.5,28 -6.5,132 -2,132 -2,28" fill="#525B4A" />
      <polygon points="-2,28 -2,132 2.5,132 2.5,28" fill={color} />
      <polygon points="2.5,28 2.5,132 6.5,132 6.5,28" fill="#454D3E" />

      {/* Dipped Rounded End */}
      <path d="M -6.5,132 Q 0,140 6.5,132 Z" fill={color} />
      <circle cx="0" cy="133" r="1.5" fill="#E8DDC9" />
    </svg>
  );
};

/**
 * 4. Technical Fine Liner (0.4mm needle tip)
 * Tip at (0, 0)
 */
export const FinelinerIllustration: React.FC<{ isWriting?: boolean }> = ({ isWriting }) => {
  return (
    <svg width="32" height="150" viewBox="-16 0 32 150" className="overflow-visible filter drop-shadow-[2px_6px_6px_rgba(73,61,53,0.25)]">
      {isWriting && (
        <circle cx="0" cy="0" r="1.8" fill="#1A1715" className="animate-pulse" />
      )}

      {/* 0.4mm Fine Needle Tip at (0, 0) */}
      <rect x="-0.75" y="0" width="1.5" height="5" fill="#1A1715" />

      {/* Stainless Steel Needle Support Collar */}
      <polygon points="-1.5,5 -2.5,15 2.5,15 1.5,5" fill="#C5C5C5" stroke="#777" strokeWidth="0.4" />

      {/* Matte Dark Polypropylene Body */}
      <polygon points="-5,15 -5.5,135 5.5,135 5,15" fill="#3D3B39" />
      {/* Silver Accent Stripe */}
      <rect x="-5.2" y="25" width="10.4" height="2" fill="#E8DDC9" />

      <text x="0" y="80" fill="#C5C5C5" fontSize="4.5" fontFamily="monospace" textAnchor="middle" transform="rotate(-90 0 80)">
        FINELINER 0.4
      </text>

      {/* Cap End Indicator */}
      <polygon points="-5.5,135 -4.5,142 4.5,142 5.5,135" fill="#1A1715" />
    </svg>
  );
};

/**
 * 5. Broad Chisel Marker
 * Tip at (0, 0)
 */
export const MarkerIllustration: React.FC<{ isWriting?: boolean }> = ({ isWriting }) => {
  return (
    <svg width="44" height="140" viewBox="-22 0 44 140" className="overflow-visible filter drop-shadow-[2px_7px_7px_rgba(73,61,53,0.25)]">
      {isWriting && (
        <rect x="-3" y="-1" width="6" height="2" fill="#8B735E" opacity="0.6" />
      )}

      {/* Angled Chisel Tip */}
      <polygon points="-3.5,0 3.5,3 4.5,12 -4.5,12" fill="#493D35" />

      {/* Plastic Collar */}
      <polygon points="-6,12 -7.5,24 7.5,24 6,12" fill="#2E2824" />

      {/* Wide Chunky Barrel */}
      <rect x="-9" y="24" width="18" height="100" rx="3" fill="#E8DDC9" stroke="#D6C4A8" strokeWidth="0.8" />
      {/* Accent Band */}
      <rect x="-9" y="45" width="18" height="15" fill="#8B735E" />
      <text x="0" y="55" fill="#F5F0E6" fontSize="5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
        MARKER
      </text>

      {/* Flat Bottom Plug */}
      <rect x="-8" y="124" width="16" height="6" rx="1" fill="#493D35" />
    </svg>
  );
};
