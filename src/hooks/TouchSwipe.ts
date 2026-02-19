
import { useRef } from 'react';

type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface SwipeHandlers {
  onSwipe: (direction: SwipeDirection) => void;
  threshold?: number;
}

export const useSwipe = ({ onSwipe, threshold = 50 }: SwipeHandlers) => {
  const touchStart = useRef({ x: 0, y: 0 });

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > threshold) {
        onSwipe(dx > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(dy) > threshold) {
        onSwipe(dy > 0 ? 'down' : 'up');
      }
    }
  };

  return { onTouchStart, onTouchEnd };
};
