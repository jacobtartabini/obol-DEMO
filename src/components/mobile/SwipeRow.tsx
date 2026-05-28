import { ReactNode, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SwipeRowProps {
  children: ReactNode;
  /** Action(s) shown when the user swipes left to right of the row. */
  rightActions?: ReactNode;
  onTap?: () => void;
  className?: string;
}

/**
 * iOS-style swipeable row. Touch left to reveal trailing actions.
 * Pure-React, no extra deps; uses pointer events + transform.
 */
export function SwipeRow({ children, rightActions, onTap, className }: SwipeRowProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const moved = useRef(false);
  const REVEAL = 132; // px revealed for actions
  const ACTIVATE = 60;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startX.current = e.clientX;
    startOffset.current = offset;
    moved.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 6) moved.current = true;
    let next = startOffset.current + dx;
    if (next > 0) next = 0;
    if (next < -REVEAL - 40) next = -REVEAL - 40;
    setOffset(next);
  };
  const onPointerUp = () => {
    startX.current = null;
    setOffset((curr) => (curr < -ACTIVATE ? -REVEAL : 0));
  };

  return (
    <div className={cn('relative overflow-hidden touch-pan-y select-none', className)}>
      {/* Action layer */}
      {rightActions && (
        <div
          className="absolute right-0 top-0 bottom-0 flex items-stretch"
          style={{ width: REVEAL }}
        >
          {rightActions}
        </div>
      )}
      <div
        className={cn(
          'relative bg-card transition-transform',
          startX.current === null ? 'duration-200 ease-out' : 'duration-0',
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (moved.current) return;
          if (offset !== 0) {
            setOffset(0);
            return;
          }
          onTap?.();
        }}
      >
        {children}
      </div>
    </div>
  );
}
