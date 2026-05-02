import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { animated, useSpring, config as springConfig } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import type { Player } from '../../types/entities';
import { getCardEffectTier } from '../../utils/cardTier';

// ─── Gesture thresholds ───
// Swipe detection on release: distance OR velocity.
const SWIPE_DISTANCE_PX = 80;
const SWIPE_VELOCITY = 0.5;

// Maximum tilt in degrees. Dramatic enough to feel like a real card in hand.
const MAX_TILT_DEG = 30;

export type SwipeDirection = 'left' | 'right' | 'down';

export interface InteractiveCardProps {
  player: Player;
  onDismiss?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  enterFrom?: 'left' | 'right' | null;
  children: ReactNode;
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

  // Glare position derived from tilt — simulates light reflecting off surface.
  const [glare, setGlare] = useState({ px: 50, py: 50 });

  const updateGlareFromTilt = useCallback((rotX: number, rotY: number) => {
    const px = 50 + (rotY / MAX_TILT_DEG) * 50;
    const py = 50 - (rotX / MAX_TILT_DEG) * 50;
    setGlare({
      px: Math.max(0, Math.min(100, px)),
      py: Math.max(0, Math.min(100, py)),
    });
  }, []);

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

  // Tap-to-flip
  const handleTapFlip = useCallback(() => {
    if (!cardBack || reducedMotion || exitingRef.current) return;
    const next = !isFlipped;
    setIsFlipped(next);
    api.start({
      flipY: next ? 180 : 0,
      config: { tension: 260, friction: 24 },
    });
  }, [cardBack, reducedMotion, isFlipped, api]);

  // Spring in from entry side on mount.
  useEffect(() => {
    if (reducedMotion) return;
    if (enterFrom === 'left' || enterFrom === 'right') {
      api.start({ x: 0, scale: 1, opacity: 1, config: { tension: 320, friction: 30 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate off-screen for swipe/dismiss.
  const animateOff = useCallback((direction: SwipeDirection, then: () => void) => {
    exitingRef.current = true;
    const w = window.innerWidth;
    const h = window.innerHeight;
    api.start({
      x: direction === 'left' ? -w : direction === 'right' ? w : 0,
      y: direction === 'down' ? h : 0,
      opacity: 0.85,
      scale: 0.96,
      config: { tension: 380, friction: 26 },
      onRest: then,
    });
  }, [api]);

  // ─── Hover tilt (desktop only, pointer move without drag) ───
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (reducedMotion || exitingRef.current) return;
    // Skip if a button is pressed (user is dragging).
    if (e.buttons !== 0) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cx = (e.clientX - rect.left) / rect.width;   // 0→1
    const cy = (e.clientY - rect.top) / rect.height;    // 0→1
    const clX = Math.max(0, Math.min(1, cx));
    const clY = Math.max(0, Math.min(1, cy));
    const newRotX = (0.5 - clY) * MAX_TILT_DEG;
    const newRotY = (clX - 0.5) * MAX_TILT_DEG;
    updateGlareFromTilt(newRotX, newRotY);
    api.start({
      rotX: newRotX,
      rotY: newRotY,
      config: { tension: 300, friction: 22 },
    });
  }, [reducedMotion, updateGlareFromTilt, api]);

  const handlePointerLeave = useCallback(() => {
    if (reducedMotion || exitingRef.current) return;
    api.start({ rotX: 0, rotY: 0, config: springConfig.gentle });
    updateGlareFromTilt(0, 0);
  }, [reducedMotion, api, updateGlareFromTilt]);

  // ─── Drag gesture (touch + mouse) ───
  // All drag movement is expressed as TILT, not translation.
  // The card stays in place. On release, velocity/distance is checked for
  // swipe-to-next or dismiss gestures.
  const bind = useDrag(
    ({
      down,
      movement: [mx, my],
      velocity: [vx, vy],
      direction: [dx, dy],
      tap,
      first,
      xy: [px, py],
    }: {
      down: boolean;
      movement: [number, number];
      velocity: [number, number];
      direction: [number, number];
      tap: boolean;
      first: boolean;
      xy: [number, number];
    }) => {
      if (reducedMotion || exitingRef.current) return;

      // ── Tap → flip ──
      if (tap) {
        handleTapFlip();
        return;
      }

      if (down) {
        // Compute tilt from pointer position relative to card center.
        // This gives the "tilt where you touch" feel — touching top-right
        // tilts the card top-right, etc.
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const cx = (px - rect.left) / rect.width;
        const cy = (py - rect.top) / rect.height;
        const clX = Math.max(0, Math.min(1, cx));
        const clY = Math.max(0, Math.min(1, cy));
        const rotX = (0.5 - clY) * MAX_TILT_DEG;
        const rotY = (clX - 0.5) * MAX_TILT_DEG;
        updateGlareFromTilt(rotX, rotY);
        api.start({
          rotX,
          rotY,
          scale: first ? 1.02 : 1.02,   // subtle lift on touch
          config: { tension: 300, friction: 20 },
        });
        return;
      }

      // ── Release — check for swipe ──
      // Hard swipe left → next
      if (onNext && (mx < -SWIPE_DISTANCE_PX || (vx > SWIPE_VELOCITY && dx < 0))) {
        animateOff('left', onNext);
        return;
      }
      // Hard swipe right → prev
      if (onPrev && (mx > SWIPE_DISTANCE_PX || (vx > SWIPE_VELOCITY && dx > 0))) {
        animateOff('right', onPrev);
        return;
      }
      // Pull-down dismiss
      if (onDismiss && (my > 120 || (vy > SWIPE_VELOCITY && dy > 0))) {
        animateOff('down', onDismiss);
        return;
      }

      // No swipe — spring back to neutral.
      api.start({
        rotX: 0,
        rotY: 0,
        scale: 1,
        config: springConfig.wobbly,
      });
      updateGlareFromTilt(0, 0);
    },
    {
      filterTaps: true,
      threshold: 4,
      pointer: { touch: true },
    },
  );

  // ─── Transform strings ───
  // Outer: position (for swipe exit animation) + tilt from gestures.
  const outerTransform = spring.x.to((x: number) => {
    const y = spring.y.get();
    const rx = spring.rotX.get();
    const ry = spring.rotY.get();
    const s = spring.scale.get();
    return `translate3d(${x}px, ${y}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
  });

  // Inner: flip rotation (tap-to-flip 180°).
  const innerTransform = spring.flipY.to((fy: number) => `rotateY(${fy}deg)`);

  // ─── Render ───
  const sharedStyle = {
    transform: outerTransform,
    opacity: spring.opacity,
    '--plm-glare-x': `${glare.px}%`,
    '--plm-glare-y': `${glare.py}%`,
    willChange: 'transform, opacity',
    perspective: 900,
  } as unknown as React.CSSProperties;

  const overlays = (
    <>
      {!reducedMotion && <SheenLayer />}
      {!reducedMotion && (tier === 'holo' || tier === 'cosmic') && <HoloLayer />}
      {!reducedMotion && tier === 'cosmic' && <CosmicLayer />}
    </>
  );

  if (cardBack) {
    return (
      <animated.div
        {...bind()}
        ref={containerRef}
        className="plm-relative plm-touch-none plm-select-none"
        style={{ ...sharedStyle, transformStyle: 'preserve-3d' as const }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <animated.div
          style={{
            transformStyle: 'preserve-3d',
            transform: innerTransform,
            willChange: 'transform',
          }}
        >
          {/* Front face */}
          <div
            className="plm-relative plm-rounded-xl plm-overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {children}
            {overlays}
          </div>
          {/* Back face */}
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

  return (
    <animated.div
      {...bind()}
      ref={containerRef}
      className="plm-relative plm-touch-none plm-select-none"
      style={sharedStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="plm-relative plm-rounded-xl plm-overflow-hidden">
        {children}
        {overlays}
      </div>
    </animated.div>
  );
}

// ─── Overlay layers ───
// Positioned over the card, driven by CSS vars --plm-glare-x/y from tilt.

function SheenLayer() {
  return (
    <div
      className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[30]"
      style={{
        background:
          'radial-gradient(circle at var(--plm-glare-x) var(--plm-glare-y), rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 30%, transparent 60%)',
        mixBlendMode: 'overlay',
      }}
      aria-hidden="true"
    />
  );
}

function HoloLayer() {
  return (
    <>
      {/* Rainbow conic foil — rotates based on tilt angle. */}
      <div
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[31]"
        style={{
          background:
            'conic-gradient(from calc(var(--plm-glare-x) * 3.6deg) at var(--plm-glare-x) var(--plm-glare-y), #ff5e62, #ffd200, #21d4fd, #b721ff, #ff5e62)',
          mixBlendMode: 'color-dodge',
          opacity: 0.45,
        }}
        aria-hidden="true"
      />
      {/* Diagonal foil hatch — plastic foil texture. */}
      <div
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[32]"
        style={{
          background:
            'repeating-linear-gradient(115deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 6px)',
          mixBlendMode: 'overlay',
          opacity: 0.8,
        }}
        aria-hidden="true"
      />
    </>
  );
}

function CosmicLayer() {
  return (
    <>
      {/* Galaxy radial — strongest where tilt aims. */}
      <div
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[33]"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at var(--plm-glare-x) var(--plm-glare-y), rgba(255,255,255,0.55) 0%, rgba(168,85,247,0.4) 25%, rgba(59,130,246,0.3) 50%, transparent 75%)',
          mixBlendMode: 'screen',
          opacity: 0.6,
        }}
        aria-hidden="true"
      />
      {/* Star-field dots */}
      <div
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[34]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.9) 0.6px, transparent 0.8px), radial-gradient(rgba(255,255,255,0.7) 0.6px, transparent 0.8px)',
          backgroundSize: '40px 40px, 60px 60px',
          backgroundPosition: '0 0, 20px 30px',
          mixBlendMode: 'screen',
          opacity: 0.5,
        }}
        aria-hidden="true"
      />
    </>
  );
}
