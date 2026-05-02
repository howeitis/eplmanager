import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { animated, useSpring, config as springConfig } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import type { Player } from '../../types/entities';
import { getCardEffectTier } from '../../utils/cardTier';

// ─── Gesture thresholds ───
const SWIPE_DISTANCE_PX = 60;  // px of cumulative drag movement to count as swipe
const SWIPE_VELOCITY = 0.35;   // px/ms — a brisk flick

// Maximum tilt in degrees. Very dramatic — like holding a real card.
const MAX_TILT_DEG = 45;

// How many px of drag movement maps to full tilt. A drag of TILT_RANGE px
// produces MAX_TILT_DEG degrees of tilt.
const TILT_RANGE_PX = 120;

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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
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
      px: clamp(px, 0, 100),
      py: clamp(py, 0, 100),
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

  // ─── Hover tilt (desktop only) ───
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (reducedMotion || exitingRef.current) return;
    if (e.buttons !== 0) return; // skip while dragging
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const cy = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const newRotX = (0.5 - cy) * MAX_TILT_DEG;
    const newRotY = (cx - 0.5) * MAX_TILT_DEG;
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

  // ─── Drag gesture ───
  // Drag movement = tilt. The card stays in place and tilts in the direction
  // of the drag (push model: drag down → top pops forward, drag left → right
  // side pops forward). On release, velocity/distance checked for swipe.
  const bind = useDrag(
    (state) => {
      const { down, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], tap, last, canceled } = state;

      if (reducedMotion || exitingRef.current) return;

      // ── Tap → flip (only on final event, not canceled) ──
      if (last && !canceled && tap) {
        handleTapFlip();
        return;
      }

      // ── Active drag: tilt based on movement direction ──
      // Drag down (my>0) → top pops forward (rotX < 0)
      // Drag up (my<0) → bottom pops forward (rotX > 0)
      // Drag right (mx>0) → left pops forward (rotY < 0)
      // Drag left (mx<0) → right pops forward (rotY > 0)
      if (down) {
        const rotX = clamp((-my / TILT_RANGE_PX) * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
        const rotY = clamp((mx / TILT_RANGE_PX) * MAX_TILT_DEG, -MAX_TILT_DEG, MAX_TILT_DEG);
        updateGlareFromTilt(rotX, rotY);
        api.start({
          rotX,
          rotY,
          scale: 1.02,
          config: { tension: 300, friction: 20 },
        });
        return;
      }

      // ── Release ──
      if (!last) return; // only act on the final release event

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
      if (onDismiss && (my > 100 || (vy > SWIPE_VELOCITY && dy > 0))) {
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
      threshold: 3,
      pointer: { touch: true },
    },
  );

  // ─── Transform strings ───
  const outerTransform = spring.x.to((x: number) => {
    const y = spring.y.get();
    const rx = spring.rotX.get();
    const ry = spring.rotY.get();
    const s = spring.scale.get();
    return `translate3d(${x}px, ${y}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
  });

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
          <div
            className="plm-relative plm-rounded-xl plm-overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {children}
            {overlays}
          </div>
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
