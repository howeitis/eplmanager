import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { animated, useSpring, config as springConfig } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import type { Player } from '../../types/entities';
import { getCardEffectTier } from '../../utils/cardTier';

// ─── Gesture thresholds ───
// Pull-down triggers dismiss when the user drags the card more than ~30% of
// viewport height OR releases with a strong downward velocity. The same logic
// applies to horizontal swipes for next/prev.
const DISMISS_DISTANCE_RATIO = 0.3;
const SWIPE_DISTANCE_RATIO = 0.25;
const VELOCITY_TRIGGER = 0.6;

// Maximum tilt in degrees. Subtle enough to feel premium, strong enough to
// read as 3D parallax.
const MAX_TILT_DEG = 14;

export type SwipeDirection = 'left' | 'right' | 'down';

export interface InteractiveCardProps {
  /** The player being shown — drives the effect tier (sheen/holo/cosmic). */
  player: Player;
  /** Pull-down to dismiss callback. If absent, dismiss gesture is disabled. */
  onDismiss?: () => void;
  /** Hard left swipe — next card. If absent, gesture is disabled. */
  onNext?: () => void;
  /** Hard right swipe — previous card. If absent, gesture is disabled. */
  onPrev?: () => void;
  /** Side the card should enter from (set by parent on navigation). */
  enterFrom?: 'left' | 'right' | null;
  /** The card front (typically <RetroPlayerCard />). */
  children: ReactNode;
  /** Optional card back. When provided, tap-to-flip is enabled with true CSS
   *  3D (preserve-3d + backface-visibility). */
  cardBack?: ReactNode;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function InteractiveCard({
  player,
  onDismiss,
  onNext,
  onPrev,
  enterFrom = null,
  children,
  cardBack,
}: InteractiveCardProps) {
  const tier = getCardEffectTier(player);
  const reducedMotion = useRef(prefersReducedMotion()).current;
  const containerRef = useRef<HTMLDivElement>(null);
  const exitingRef = useRef(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Pointer-driven CSS vars for sheen/holo/cosmic gradients. We bypass spring
  // for these so they track the finger 1:1 (no perceptible lag) while the
  // tilt itself stays springy.
  const [glare, setGlare] = useState({ px: 50, py: 50 });

  const [spring, api] = useSpring(() => {
    if (reducedMotion) {
      return { x: 0, y: 0, rotX: 0, rotY: 0, flipY: 0, scale: 1, opacity: 1 };
    }
    if (enterFrom === 'left') {
      return { x: -window.innerWidth, y: 0, rotX: 0, rotY: 0, flipY: 0, scale: 0.95, opacity: 0 };
    }
    if (enterFrom === 'right') {
      return { x: window.innerWidth, y: 0, rotX: 0, rotY: 0, flipY: 0, scale: 0.95, opacity: 0 };
    }
    return { x: 0, y: 0, rotX: 0, rotY: 0, flipY: 0, scale: 1, opacity: 1 };
  });

  // Tap-to-flip: toggles the card between front and back via a 180° Y rotation.
  const handleTapFlip = useCallback(() => {
    if (!cardBack || reducedMotion || exitingRef.current) return;
    const next = !isFlipped;
    setIsFlipped(next);
    api.start({
      flipY: next ? 180 : 0,
      config: { tension: 260, friction: 24 },
    });
  }, [cardBack, reducedMotion, isFlipped, api]);

  // Spring in from the entry side on mount.
  useEffect(() => {
    if (reducedMotion) return;
    if (enterFrom === 'left' || enterFrom === 'right') {
      // Fast, decisive snap-in — high tension so the card arrives quickly,
      // moderate friction so it doesn't overshoot.
      api.start({ x: 0, scale: 1, opacity: 1, config: { tension: 320, friction: 30 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateOff = (direction: SwipeDirection, then: () => void) => {
    exitingRef.current = true;
    const w = window.innerWidth;
    const h = window.innerHeight;
    api.start({
      x: direction === 'left' ? -w : direction === 'right' ? w : 0,
      y: direction === 'down' ? h : 0,
      // Keep opacity near-full during exit so the card doesn't look like it
      // "faded away" — it should feel like it flew off screen.
      opacity: 0.85,
      scale: 0.96,
      // High tension + low friction = fast, decisive exit. The card clears
      // the viewport quickly so the incoming card doesn't collide visually.
      config: { tension: 380, friction: 26 },
      onRest: () => {
        then();
      },
    });
  };

  const bind = useGesture(
    {
      onMove: ({ xy: [px, py], hovering, dragging }: { xy: [number, number]; hovering?: boolean; dragging?: boolean }) => {
        // Hover-tilt for desktop pointers when not actively dragging.
        if (reducedMotion || dragging || exitingRef.current) return;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const cx = (px - rect.left) / rect.width;
        const cy = (py - rect.top) / rect.height;
        const clampedX = Math.max(0, Math.min(1, cx));
        const clampedY = Math.max(0, Math.min(1, cy));
        setGlare({ px: clampedX * 100, py: clampedY * 100 });
        if (hovering !== false) {
          api.start({
            rotX: (0.5 - clampedY) * MAX_TILT_DEG,
            rotY: (clampedX - 0.5) * MAX_TILT_DEG,
            config: { tension: 300, friction: 22 },
          });
        }
      },
      onHover: ({ hovering }: { hovering?: boolean }) => {
        if (reducedMotion) return;
        if (!hovering && !exitingRef.current) {
          api.start({ rotX: 0, rotY: 0, config: springConfig.gentle });
          setGlare({ px: 50, py: 50 });
        }
      },
      onDrag: ({
        down,
        movement: [mx, my],
        velocity: [vx, vy],
        direction: [, dy],
        tap,
        last,
        xy: [px, py],
      }: {
        down: boolean;
        movement: [number, number];
        velocity: [number, number];
        direction: [number, number];
        tap: boolean;
        last: boolean;
        xy: [number, number];
      }) => {
        if (reducedMotion || tap || exitingRef.current) return;

        const el = containerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const cx = Math.max(0, Math.min(1, (px - rect.left) / rect.width));
            const cy = Math.max(0, Math.min(1, (py - rect.top) / rect.height));
            setGlare({ px: cx * 100, py: cy * 100 });
          }
        }

        if (down) {
          // Live tilt + position follow during drag. Tilt is exaggerated based
          // on movement so a hard swipe feels physical.
          api.start({
            x: mx,
            y: my,
            rotX: Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, -my * 0.05)),
            rotY: Math.max(-MAX_TILT_DEG, Math.min(MAX_TILT_DEG, mx * 0.05)),
            scale: 1,
            opacity: 1,
            config: springConfig.stiff,
          });
          return;
        }

        if (!last) return;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const dismissThresh = h * DISMISS_DISTANCE_RATIO;
        const swipeThresh = w * SWIPE_DISTANCE_RATIO;

        // Pull-down dismiss
        if (onDismiss && (my > dismissThresh || (vy > VELOCITY_TRIGGER && dy > 0))) {
          animateOff('down', onDismiss);
          return;
        }

        // Hard swipe left → next
        if (onNext && (mx < -swipeThresh || (vx > VELOCITY_TRIGGER && mx < 0))) {
          animateOff('left', onNext);
          return;
        }

        // Hard swipe right → prev
        if (onPrev && (mx > swipeThresh || (vx > VELOCITY_TRIGGER && mx > 0))) {
          animateOff('right', onPrev);
          return;
        }

        // No threshold hit — spring back to neutral.
        api.start({
          x: 0,
          y: 0,
          rotX: 0,
          rotY: 0,
          scale: 1,
          opacity: 1,
          config: springConfig.wobbly,
        });
      },
    },
    {
      drag: {
        filterTaps: true,
        threshold: 6,
        // Touch on iOS needs explicit pointer config to play nicely with
        // page scroll. The card sits inside a scrollable modal, so we
        // capture touch on the card surface.
        pointer: { touch: true },
      },
    },
  );

  // Build the outer container transform (position + tilt from gestures).
  const outerTransform = spring.x.to((x: number) => {
    const y = spring.y.get();
    const rx = spring.rotX.get();
    const ry = spring.rotY.get();
    const s = spring.scale.get();
    return `perspective(900px) translate3d(${x}px, ${y}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
  });

  // Inner transform handles the tap-to-flip rotation on a separate axis so
  // it composes cleanly with gesture tilt.
  const innerTransform = spring.flipY.to((fy: number) => `rotateY(${fy}deg)`);

  // When a cardBack is provided, we use true CSS 3D: both faces render
  // simultaneously inside a preserve-3d container, each with
  // backface-visibility: hidden. Tap flips the inner wrapper 180°.
  if (cardBack) {
    return (
      <animated.div
        {...bind()}
        ref={containerRef}
        className="plm-relative plm-touch-none plm-select-none"
        style={{
          transform: outerTransform,
          opacity: spring.opacity,
          '--plm-glare-x': `${glare.px}%`,
          '--plm-glare-y': `${glare.py}%`,
          willChange: 'transform, opacity',
          perspective: 900,
        } as unknown as React.CSSProperties}
      >
        <animated.div
          style={{
            transformStyle: 'preserve-3d',
            transform: innerTransform,
            willChange: 'transform',
          }}
          onClick={handleTapFlip}
          role="button"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTapFlip(); } }}
          aria-label={isFlipped ? 'Flip card to front' : 'Flip card to back'}
        >
          {/* Front face */}
          <div
            className="plm-relative plm-rounded-xl plm-overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {children}
            {!reducedMotion && <SheenLayer />}
            {!reducedMotion && (tier === 'holo' || tier === 'cosmic') && <HoloLayer />}
            {!reducedMotion && tier === 'cosmic' && <CosmicLayer />}
          </div>
          {/* Back face — pre-rotated 180° so it's hidden until flipped */}
          <div
            className="plm-absolute plm-inset-0 plm-rounded-xl plm-overflow-hidden"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            {cardBack}
          </div>
        </animated.div>
      </animated.div>
    );
  }

  // No cardBack — single-face mode (original behaviour).
  return (
    <animated.div
      {...bind()}
      ref={containerRef}
      className="plm-relative plm-touch-none plm-select-none"
      style={{
        transform: outerTransform,
        opacity: spring.opacity,
        '--plm-glare-x': `${glare.px}%`,
        '--plm-glare-y': `${glare.py}%`,
        willChange: 'transform, opacity',
      } as unknown as React.CSSProperties}
    >
      <div className="plm-relative plm-rounded-xl plm-overflow-hidden">
        {children}
        {!reducedMotion && <SheenLayer />}
        {!reducedMotion && (tier === 'holo' || tier === 'cosmic') && <HoloLayer />}
        {!reducedMotion && tier === 'cosmic' && <CosmicLayer />}
      </div>
    </animated.div>
  );
}

// ─── Overlay layers ───
// All layers are pointer-events: none and absolutely positioned over the card.
// They share the parent's CSS vars (--plm-glare-x, --plm-glare-y) so the
// gradients track the finger.

function SheenLayer() {
  return (
    <div
      className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[30]"
      style={{
        background:
          'radial-gradient(circle at var(--plm-glare-x) var(--plm-glare-y), rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 28%, transparent 55%)',
        mixBlendMode: 'overlay',
      }}
      aria-hidden="true"
    />
  );
}

function HoloLayer() {
  return (
    <>
      {/* Rainbow conic foil — rotates with finger via background-position. */}
      <div
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[31]"
        style={{
          background:
            'conic-gradient(from calc(var(--plm-glare-x) * 3.6deg) at var(--plm-glare-x) var(--plm-glare-y), #ff5e62, #ffd200, #21d4fd, #b721ff, #ff5e62)',
          mixBlendMode: 'color-dodge',
          opacity: 0.32,
        }}
        aria-hidden="true"
      />
      {/* Diagonal foil hatch — fixed pattern that the conic gradient blends
          through for that "plastic foil" texture. */}
      <div
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[32]"
        style={{
          background:
            'repeating-linear-gradient(115deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 6px)',
          mixBlendMode: 'overlay',
          opacity: 0.7,
        }}
        aria-hidden="true"
      />
    </>
  );
}

function CosmicLayer() {
  return (
    <>
      {/* Galaxy radial — strongest where the finger is, fading to deep purple. */}
      <div
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[33]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at var(--plm-glare-x) var(--plm-glare-y), rgba(255,255,255,0.45) 0%, rgba(168,85,247,0.35) 25%, rgba(59,130,246,0.25) 50%, transparent 75%)',
          mixBlendMode: 'screen',
          opacity: 0.55,
        }}
        aria-hidden="true"
      />
      {/* Star-field dots — subtle pinpricks of white. */}
      <div
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[34]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.85) 0.6px, transparent 0.8px), radial-gradient(rgba(255,255,255,0.65) 0.6px, transparent 0.8px)',
          backgroundSize: '40px 40px, 60px 60px',
          backgroundPosition: '0 0, 20px 30px',
          mixBlendMode: 'screen',
          opacity: 0.45,
        }}
        aria-hidden="true"
      />
    </>
  );
}
