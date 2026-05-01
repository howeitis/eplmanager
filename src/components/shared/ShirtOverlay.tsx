import type { ClubKit } from '../../types/entities';

interface ShirtOverlayProps {
  kit: ClubKit;
  logoSrc?: string;
  sizePx: number;
}

// Body silhouette in 0–100 fractional viewBox units. The top edge curves
// downward in the middle to mimic the avataaars shirt collar — that way
// vertical stripes get clipped along the collar curve instead of cutting
// straight across the neckline.
//
// The whole region starts at y≈82 (well below the shoulder line) so any
// hair that hangs down from the head sits visibly in front of jersey
// elements, rather than the overlay painting on top of the hair.
const SHIRT_BODY_PATH =
  'M 28 82 Q 50 92 72 82 L 78 100 L 22 100 Z';

// Crest sits on the viewer's right of the chest, sized big enough to read.
const CREST = { x: 58, y: 84, w: 11, h: 11 };

// Stripe layout — stripes are clipped to the body path above, so they
// follow the collar curve at the top automatically.
const STRIPE_COUNT = 5;
const SHIRT_BODY_LEFT = 22;
const SHIRT_BODY_RIGHT = 78;
const SHIRT_BODY_TOP = 80;
const SHIRT_BODY_BOTTOM = 100;

export function ShirtOverlay({ kit, logoSrc, sizePx }: ShirtOverlayProps) {
  // Note: no mix-blend-mode on the SVG. Multiply makes white pixels
  // transparent (white × any = any), which made white sleeves vanish
  // on coloured shirts in the previous iteration.
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: 'absolute',
        inset: 0,
        width: sizePx,
        height: sizePx,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      {kit.pattern === 'vertical-stripes' && (
        <g clipPath="url(#shirt-body-clip)">
          <defs>
            <clipPath id="shirt-body-clip">
              <path d={SHIRT_BODY_PATH} />
            </clipPath>
          </defs>
          {Array.from({ length: STRIPE_COUNT }).map((_, i) => {
            const bodyW = SHIRT_BODY_RIGHT - SHIRT_BODY_LEFT;
            const stripeW = bodyW / (STRIPE_COUNT * 2 + 1);
            const x = SHIRT_BODY_LEFT + stripeW + i * stripeW * 2;
            return (
              <rect
                key={i}
                x={x}
                y={SHIRT_BODY_TOP}
                width={stripeW}
                height={SHIRT_BODY_BOTTOM - SHIRT_BODY_TOP}
                fill={kit.accent}
              />
            );
          })}
        </g>
      )}
      {logoSrc && (
        <image
          href={logoSrc}
          x={CREST.x}
          y={CREST.y}
          width={CREST.w}
          height={CREST.h}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
    </svg>
  );
}
