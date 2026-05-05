import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { animated, useSpring, to } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import type { Player } from '../../types/entities';
import { getCardEffectTier } from '../../utils/cardTier';

// ─── Tilt + gesture model ───
// Fulcrum at the back-center of the card. Pointer position relative to card
// center drives rotateX/rotateY. Pointer/drag at the top-right corner →
// top-right corner pops toward the viewer.
const MAX_TILT_DEG = 18;

// Tap vs swipe thresholds.
const TAP_DISTANCE_PX = 8;   // total movement under this counts as tap
const TAP_DURATION_MS = 250; // and only if released within this window
const SWIPE_DISTANCE_PX = 70;
const SWIPE_VELOCITY = 0.4;

export type SwipeDirection = 'left' | 'right' | 'down';

export interface InteractiveCardProps {
  player: Player;
  // Kept for type compatibility — InteractiveCard no longer uses pull-down
  // dismiss internally. The host modal owns its own close affordances.
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
  const startTimeRef = useRef(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Glare position derived from current tilt — simulates light reflecting off
  // the surface. Stored as a percentage [0,100].
  const [glare, setGlare] = useState({ px: 50, py: 50 });

  const updateGlareFromTilt = useCallback((rotX: number, rotY: number) => {
    const px = 50 + (rotY / MAX_TILT_DEG) * 50;
    const py = 50 - (rotX / MAX_TILT_DEG) * 50;
    setGlare({ px: clamp(px, 0, 100), py: clamp(py, 0, 100) });
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

  const handleTapFlip = useCallback(() => {
    if (!cardBack || reducedMotion || exitingRef.current) return;
    setIsFlipped((prev) => {
      const next = !prev;
      api.start({
        flipY: next ? 180 : 0,
        config: { mass: 1, tension: 220, friction: 24 },
      });
      return next;
    });
  }, [cardBack, reducedMotion, api]);

  // Spring in from entry side on mount.
  useEffect(() => {
    if (reducedMotion) return;
    if (enterFrom === 'left' || enterFrom === 'right') {
      api.start({ x: 0, scale: 1, opacity: 1, config: { tension: 320, friction: 30 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate off-screen for swipe. Used only by carousel onNext/onPrev.
  const animateOff = useCallback((direction: SwipeDirection, then: () => void) => {
    exitingRef.current = true;
    const w = window.innerWidth;
    api.start({
      x: direction === 'left' ? -w : direction === 'right' ? w : 0,
      opacity: 0.85,
      scale: 0.96,
      rotX: 0,
      rotY: 0,
      config: { tension: 380, friction: 26 },
      onRest: then,
    });
  }, [api]);

  // ─── Spring back to neutral on release / pointer-leave ───
  const settleToNeutral = useCallback(() => {
    api.start({
      rotX: 0,
      rotY: 0,
      scale: 1,
      config: { mass: 1, tension: 170, friction: 22 },
    });
    updateGlareFromTilt(0, 0);
  }, [api, updateGlareFromTilt]);

  // ─── Apply tilt from a normalized [0,1] pointer position over the card ───
  const applyTiltFromNormalized = useCallback((cx: number, cy: number, scale = 1) => {
    const rotX = (0.5 - clamp(cy, 0, 1)) * MAX_TILT_DEG;
    const rotY = (clamp(cx, 0, 1) - 0.5) * MAX_TILT_DEG;
    updateGlareFromTilt(rotX, rotY);
    api.start({
      rotX,
      rotY,
      scale,
      config: { mass: 1, tension: 280, friction: 28 },
    });
  }, [api, updateGlareFromTilt]);

  // ─── Hover tilt (mouse / pen, no drag) ───
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (reducedMotion || exitingRef.current) return;
    if (e.pointerType === 'touch') return; // touch is handled by useDrag
    if (e.buttons !== 0) return;             // skip while dragging
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    applyTiltFromNormalized(cx, cy, 1);
  }, [reducedMotion, applyTiltFromNormalized]);

  const handlePointerLeave = useCallback(() => {
    if (reducedMotion || exitingRef.current) return;
    settleToNeutral();
  }, [reducedMotion, settleToNeutral]);

  // ─── Drag gesture (touch + active mouse drag) ───
  const bind = useDrag(
    (state) => {
      const { down, first, last, canceled, movement: [mx, my], velocity: [vx, vy], event } = state;
      if (reducedMotion || exitingRef.current) return;

      // Stop the modal backdrop / siblings from also seeing the gesture.
      if (event && 'stopPropagation' in event) {
        try { (event as Event).stopPropagation(); } catch { /* noop */ }
      }

      if (first) {
        startTimeRef.current = performance.now();
      }

      if (down) {
        // Live tilt — drag movement maps to a fraction of the card size so the
        // tilt feels consistent across card sizes.
        const el = containerRef.current;
        const w = el?.clientWidth || 220;
        const h = el?.clientHeight || 320;
        const cx = 0.5 + clamp(mx / w, -0.5, 0.5);
        const cy = 0.5 + clamp(my / h, -0.5, 0.5);
        applyTiltFromNormalized(cx, cy, 1.02);
        return;
      }

      if (!last || canceled) return;

      const duration = performance.now() - startTimeRef.current;

      // 1. Tap — small movement + short duration → flip the card.
      if (Math.abs(mx) < TAP_DISTANCE_PX && Math.abs(my) < TAP_DISTANCE_PX && duration < TAP_DURATION_MS) {
        settleToNeutral();
        handleTapFlip();
        return;
      }

      // 2. Horizontal swipe → carousel navigation.
      const horizontalIntent = Math.abs(mx) > Math.abs(my) * 1.4;
      const horizontalCommit = Math.abs(mx) > SWIPE_DISTANCE_PX || Math.abs(vx) > SWIPE_VELOCITY;
      if (horizontalIntent && horizontalCommit) {
        if (mx < 0 && onNext) {
          animateOff('left', onNext);
          return;
        }
        if (mx > 0 && onPrev) {
          animateOff('right', onPrev);
          return;
        }
      }

      // 3. Otherwise — drift back to neutral. Pull-down dismiss is gone; the
      //    modal owns close via its X button / Esc / backdrop tap.
      void vy;
      settleToNeutral();
    },
    {
      filterTaps: false,
      pointer: { touch: true },
      eventOptions: { passive: false },
    },
  );

  // ─── Transform strings ───
  const outerTransform = to(
    [spring.x, spring.y, spring.rotX, spring.rotY, spring.scale],
    (x, y, rx, ry, s) => `translate3d(${x}px, ${y}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`
  );

  const innerTransform = spring.flipY.to((fy: number) => `rotateY(${fy}deg)`);

  const sharedStyle = {
    transform: outerTransform,
    opacity: spring.opacity,
    '--plm-glare-x': `${glare.px}%`,
    '--plm-glare-y': `${glare.py}%`,
    willChange: 'transform, opacity',
    perspective: 1000,
    touchAction: 'none' as const,
  } as unknown as React.CSSProperties;

  const overlays = (
    <>
      {!reducedMotion && <SheenLayer />}
      {!reducedMotion && (tier === 'holo' || tier === 'cosmic') && <HoloLayer />}
      {!reducedMotion && tier === 'cosmic' && <CosmicLayer />}
    </>
  );

  // Block stray click bubbling so it never reaches the modal backdrop on
  // browsers that synthesize click after a touch drag.
  const stopClick = (e: React.MouseEvent) => e.stopPropagation();

  if (cardBack) {
    return (
      <animated.div
        {...bind()}
        ref={containerRef}
        className="plm-relative plm-select-none"
        style={{ ...sharedStyle, transformStyle: 'preserve-3d' as const }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={stopClick}
        aria-label={isFlipped ? 'Flip card to front' : 'Flip card to back'}
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
      className="plm-relative plm-select-none"
      style={sharedStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={stopClick}
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
