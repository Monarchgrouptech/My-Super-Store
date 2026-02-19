import React, { useEffect, useState } from 'react';

interface TypingTextProps {
  texts: string[];
  speed?: number; // ms per character
  pause?: number; // ms between texts
}

export const TypingText: React.FC<TypingTextProps> = ({ texts, speed = 18, pause = 1300 }) => {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: number;

    const full = texts[index % texts.length];

    const tick = () => {
      if (!mounted) return;
      setDisplay(prev => {
        const next = isDeleting ? full.substring(0, prev.length - 1) : full.substring(0, prev.length + 1);
        return next;
      });

      if (!isDeleting && display === full) {
        // pause then start deleting
        timer = window.setTimeout(() => setIsDeleting(true), pause);
      } else if (isDeleting && display === '') {
        // move to next
        setIsDeleting(false);
        setIndex(prev => prev + 1);
      } else {
        timer = window.setTimeout(tick, isDeleting ? speed / 2 : speed);
      }
    };

    timer = window.setTimeout(tick, speed);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, isDeleting, index, texts, speed, pause]);

  return (
    <span className="typing-text">
      {display}
      <span className="typing-caret" aria-hidden>▌</span>
    </span>
  );
};

export default TypingText;
