import { useEffect, useState, type RefObject } from 'react';

interface ScrollPipIndicatorProps {
  /** Number of segments — typically one per card in the scroller. */
  count: number;
  /** Ref to the scrollable host element. */
  scrollRef: RefObject<HTMLElement | null>;
  /** Optional accent color for the active pip — defaults to charcoal. */
  accent?: string;
  className?: string;
}

/**
 * Modern segmented scroll indicator — replaces the browser's native
 * scrollbar with a row of pills. The active pip elongates and fills with
 * the accent color; the inactive ones stay as small dimmed dots. The
 * active index is derived from the host's scrollLeft over the per-card
 * step width.
 */
export function ScrollPipIndicator({ count, scrollRef, accent, className }: ScrollPipIndicatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || count <= 1) return;

    const compute = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) {
        setActiveIndex(0);
        return;
      }
      // Distribute the scroll range across (count - 1) steps so the first
      // pip is active at scrollLeft = 0 and the last at scrollLeft = max.
      const step = max / (count - 1);
      const idx = Math.round(el.scrollLeft / step);
      setActiveIndex(Math.max(0, Math.min(count - 1, idx)));
    };

    compute();
    el.addEventListener('scroll', compute, { passive: true });
    const ro = new ResizeObserver(compute);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', compute);
      ro.disconnect();
    };
  }, [count, scrollRef]);

  if (count <= 1) return null;

  return (
    <div
      className={`plm-flex plm-items-center plm-justify-center plm-gap-1.5 ${className ?? ''}`}
      role="presentation"
      aria-hidden
    >
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex;
        return (
          <span
            key={i}
            className="plm-h-1 plm-rounded-full plm-transition-all plm-duration-300"
            style={{
              width: isActive ? 20 : 5,
              backgroundColor: isActive ? (accent ?? '#1A1A1A') : '#D6D1C8',
              opacity: isActive ? 1 : 0.7,
            }}
          />
        );
      })}
    </div>
  );
}
