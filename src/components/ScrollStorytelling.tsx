import React, { useState, useEffect, useRef } from 'react';
import { IrregularHeart } from './IrregularHeart.tsx';

interface ScrollStorytellingProps {
  onComplete: () => void;
}

const message = `Hello guys,

I am David obviously from the same batch as you.

This is a website created solely for our batch and our batch ONLY.

So go on, create memories watch how its reconstructed on a scrap book by agents and enjoy the experience.

And ofcourse guys, plzz be yourself, unhinged what not.

With lots of love

--David`;

// Split by words but maintain spacing information
const words = message.split(/(\s+)/);

export const ScrollStorytelling: React.FC<ScrollStorytellingProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const { top, height } = containerRef.current.getBoundingClientRect();
        
        // Use a container-relative progress calculation
        const viewportHeight = window.innerHeight;
        const scrollDistance = height - viewportHeight;
        
        const progress = Math.min(1, Math.max(0, -top / scrollDistance));
        setScrollProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isMessageComplete = scrollProgress >= 0.99;

  return (
    <div ref={containerRef} className="min-h-[400vh] w-full p-8 sm:p-20 flex flex-col items-center">
      <div className="sticky top-[20vh] w-full max-w-2xl font-handwritten text-2xl sm:text-3xl text-[#221C18] leading-relaxed whitespace-pre-line">
        {words.map((word, i) => {
          const startProgress = (i / words.length) * 0.95;
          const endProgress = startProgress + 0.05;
          
          const opacity = Math.min(1, Math.max(0.1, (scrollProgress - startProgress) / (endProgress - startProgress)));
          
          return (
            <span key={i} style={{ opacity: opacity }} className="transition-opacity duration-150">
              {word}
              {word.trim() === 'love' && <IrregularHeart />}
            </span>
          );
        })}
        
        {isMessageComplete && (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button
              onClick={onComplete}
              className="ink-button text-lg font-bold uppercase tracking-wider px-8 py-4"
            >
              Join KMCult&apos;26
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
