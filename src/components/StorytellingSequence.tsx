import React, { useState, useEffect } from 'react';

interface StorytellingSequenceProps {
  onComplete: () => void;
}

export const StorytellingSequence: React.FC<StorytellingSequenceProps> = ({ onComplete }) => {
  const fullText = `Hello guys,

I am David obviously from the same batch as you.

This is a website created solely for our batch an our batch ONLY.

So go on, create memories watch how its reconstructed on a scrap book by agents and enjoy the experience.

And ofcourse guys, plzz be yourself, unhinged what not.

With lots of love

--David`;

  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(fullText.substring(0, index));
      index++;
      if (index > fullText.length) {
        clearInterval(interval);
        setIsTypingComplete(true);
      }
    }, 20); // Faster than reading speed, not excessive

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="font-handwritten text-xl sm:text-2xl text-[#493D35] whitespace-pre-line max-w-xl">
        {displayedText}
      </div>
      
      {isTypingComplete && (
        <div className="mt-12 animate-in fade-in duration-700">
          <button
            onClick={onComplete}
            className="ink-button text-lg font-bold uppercase tracking-wider px-8 py-4"
          >
            Join KMCult'26
          </button>
        </div>
      )}
    </div>
  );
};
