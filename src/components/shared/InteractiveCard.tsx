import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { animated, useSpring, to } from '@react-spring/web';
import type { Player } from '@/types/entities';
import { getCardEffectTier } from '@/utils/cardTier';

// ─── Tilt model ───
// Fulcrum at the center of the card. Pointer position relative to card
// center drives rotateX/rotateY. Finger/cursor near the bottom edge → bottom
// tilts away from the viewer, top tilts toward. Works on both mouse (hover)
// and touch (drag). Tap-to-flip uses both pointerUp and onClick for reliability.
const MAX_TILT_DEG = 30;

// Movement threshold that disqualifies a tap (treats it as a drag/scroll).
const TAP_DISTANCE_PX = 12;

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

/** Imperative API exposed via ref so a parent button can drive the flip
 *  without relying on the card's own gesture handling. */
export interface InteractiveCardHandle {
  flip: () => void;
  isFlipped: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export const InteractiveCard = forwardRef<InteractiveCardHandle, InteractiveCardProps>(function InteractiveCard({
  player,
  onNext: _onNext,
  onPrev: _onPrev,
  enterFrom = null,
  children,
  cardBack,
}, ref) {
  const tier = getCardEffectTier(player);
  const reducedMotion = useRef(prefersReducedMotion()).current;
  const containerRef = useRef<HTMLDivElement>(null);
  const exitingRef = useRef(false);
  const tapStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // Debounce: prevent double-fire from pointerUp + click both triggering flip.
  const lastFlipTimeRef = useRef(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Glare position derived from current tilt. The sheen appears on the edge
  // tilted TOWARD the viewer (opposite side from the pointer), simulating light
  // catching the raised surface.
  const [glare, setGlare] = useState({ px: 50, py: 50 });

  const updateGlareFromTilt = useCallback((rotX: number, rotY: number) => {
    // Invert: sheen tracks the raised edge, not the pointer position.
    const px = 50 - (rotY / MAX_TILT_DEG) * 50;
    const py = 50 + (rotX / MAX_TILT_DEG) * 50;
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
    if (!cardBack || exitingRef.current) return;
    // Debounce: prevent double-fire within 400ms
    const now = performance.now();
    if (now - lastFlipTimeRef.current < 400) return;
    lastFlipTimeRef.current = now;
    setIsFlipped((prev) => {
      const next = !prev;
      // Reduced-motion: jump straight to the target so the back face still
      // becomes visible — just without the spring animation.
      api.start({
        flipY: next ? 180 : 0,
        immediate: reducedMotion,
        config: { mass: 1, tension: 220, friction: 24 },
      });
      return next;
    });
  }, [cardBack, reducedMotion, api]);

  // Imperative flip hook for a parent-rendered button. Bypasses the gesture
  // path entirely so the back face is always reachable, even on browsers
  // where pointer/tap events on the card don't behave predictably.
  useImperativeHandle(
    ref,
    () => ({
      flip: handleTapFlip,
      isFlipped,
    }),
    [handleTapFlip, isFlipped],
  );

  // Spring in from entry side on mount.
  useEffect(() => {
    if (reducedMotion) return;
    if (enterFrom === 'left' || enterFrom === 'right') {
      api.start({ x: 0, scale: 1, opacity: 1, config: { tension: 320, friction: 30 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Spring back to neutral — slow, graceful ease ───
  const settleToNeutral = useCallback(() => {
    api.start({
      rotX: 0,
      rotY: 0,
      scale: 1,
      config: { mass: 2, tension: 60, friction: 18 },
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

  // ─── Tilt (mouse hover + touch drag) ───
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (reducedMotion || exitingRef.current) return;
    // Mouse: only tilt on hover (no button pressed). Touch: always tilt.
    if (e.pointerType === 'mouse' && e.buttons !== 0) return;
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

  // ─── Pointer tracking for tap detection + flip ───
  // Tap detection runs even with reduced motion so the back face stays
  // reachable — only the tilt/spring animation honors the OS preference.
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (exitingRef.current) return;
    tapStartRef.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (exitingRef.current) return;
    const start = tapStartRef.current;
    tapStartRef.current = null;
    if (start) {
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx < TAP_DISTANCE_PX && dy < TAP_DISTANCE_PX) {
        // Fire flip directly from pointerUp (works on desktop, sometimes mobile)
        handleTapFlip();
      }
    }
    // Settle tilt back to neutral when touch ends (mouse settles on leave).
    if (e.pointerType === 'touch' && !reducedMotion) {
      settleToNeutral();
    }
  }, [reducedMotion, handleTapFlip, settleToNeutral]);

  const handlePointerCancel = useCallback(() => {
    tapStartRef.current = null;
    settleToNeutral();
  }, [settleToNeutral]);

  // ─── Click handler: fires reliably on touch after ~300ms delay ───
  // Serves as a fallback for mobile browsers where pointerUp may not trigger the flip.
  // The debounce in handleTapFlip prevents double-fire when both pointerUp and click work.
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // prevent modal backdrop dismiss
    handleTapFlip();
  }, [handleTapFlip]);

  // ─── Transform strings ───
  // Separate position/opacity from 3D transforms so opacity never breaks preserve-3d.
  const positionTransform = to(
    [spring.x, spring.y],
    (x, y) => `translate3d(${x}px, ${y}px, 0)`
  );

  const tiltTransform = to(
    [spring.rotX, spring.rotY, spring.scale],
    (rx, ry, s) => `rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`
  );

  const innerTransform = spring.flipY.to((fy: number) => `rotateY(${fy}deg)`);

  const overlays = (
    <>
      {!reducedMotion && <SheenLayer />}
      {!reducedMotion && (tier === 'holo' || tier === 'cosmic') && <HoloLayer />}
      {!reducedMotion && tier === 'cosmic' && <CosmicLayer />}
    </>
  );

  if (cardBack) {
    return (
      // Outermost: event handling + perspective provider
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        className="plm-relative plm-select-none"
        style={{
          perspective: '1000px',
          touchAction: 'pan-y',
          cursor: 'pointer',
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTapFlip();
          }
        }}
        aria-label={isFlipped ? 'Show card front' : 'Show card back'}
        aria-pressed={isFlipped}
      >
        {/* Position + opacity layer (does NOT need preserve-3d) */}
        <animated.div
          style={{
            transform: positionTransform,
            opacity: spring.opacity,
            willChange: 'transform, opacity',
          }}
        >
          {/* Tilt layer (3D chain starts here) */}
          <animated.div
            style={{
              transform: tiltTransform,
              transformStyle: 'preserve-3d',
              willChange: 'transform',
              '--plm-glare-x': `${glare.px}%`,
              '--plm-glare-y': `${glare.py}%`,
            } as unknown as React.CSSProperties}
          >
            {/* Flip layer */}
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
        </animated.div>
      </div>
    );
  }

  // Simple path (no flip)
  return (
    <div
      ref={containerRef}
      className="plm-relative plm-select-none"
      style={{ perspective: '1000px', touchAction: 'pan-y' }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
    >
      <animated.div
        style={{
          transform: tiltTransform,
          opacity: spring.opacity,
          willChange: 'transform, opacity',
          '--plm-glare-x': `${glare.px}%`,
          '--plm-glare-y': `${glare.py}%`,
        } as unknown as React.CSSProperties}
      >
        <div className="plm-relative plm-rounded-xl plm-overflow-hidden">
          {children}
          {overlays}
        </div>
      </animated.div>
    </div>
  );
});

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
