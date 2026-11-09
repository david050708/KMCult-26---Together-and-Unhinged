import React from 'react';

// Recreated SVG path based on the user's reference sketch.
// Uses freehand, slightly irregular paths to mimic the graphite pencil sketch character
// with transparent background and no internal fill as requested.
export const IrregularHeart = () => (
  <svg width="24" height="24" viewBox="0 0 100 100" className="inline-block ml-1 align-middle" style={{ verticalAlign: '-0.2em' }}>
    <path
      d="M50,90 C30,70 10,50 10,30 C10,15 20,5 35,5 C45,5 50,15 50,15 C50,15 55,5 65,5 C80,5 90,15 90,30 C90,50 70,70 50,90 Z"
      fill="none"
      stroke="#493D35"
      strokeWidth="6"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <path
      d="M48,88 C32,72 12,52 12,32 C12,18 22,8 35,8 C45,8 50,18 50,18 C50,18 55,8 65,8 C78,8 88,18 88,32 C88,52 68,72 52,88"
      fill="none"
      stroke="#493D35"
      strokeWidth="4"
      strokeLinejoin="round"
      strokeLinecap="round"
      className="opacity-70"
    />
  </svg>
);
