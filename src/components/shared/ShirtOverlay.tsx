import type { ClubKit } from '../../types/entities';

interface ShirtOverlayProps {
  kit: ClubKit;
  logoSrc?: string;
  sizePx: number;
}

// Body silhouette in 0–100 fractional viewBox units. The top edge curves
// downward in the middle to mimic the avataaars shirt collar — so vertical
// stripes get clipped along the collar curve, and the plain-kit collar
// trim follows the same shape.
//
// Collar sits up at the neckline (y=70) with a 10-unit dip in the middle
// for a pronounced V/U look. Stripes start at y=70 too and naturally meet
// the bottom of the curve.
const COLLAR_LEFT_X = 28;
const COLLAR_RIGHT_X = 72;
const COLLAR_TOP_Y = 70;
const COLLAR_DIP_Y = 80;

const SHIRT_BODY_PATH =
  `M ${COLLAR_LEFT_X} ${COLLAR_TOP_Y} ` +
  `Q 50 ${COLLAR_DIP_Y} ${COLLAR_RIGHT_X} ${COLLAR_TOP_Y} ` +
  `L 78 100 L 22 100 Z`;

// The collar trim is just the top arc of the body path, drawn as a stroke.
const COLLAR_TRIM_PATH =
  `M ${COLLAR_LEFT_X} ${COLLAR_TOP_Y} ` +
  `Q 50 ${COLLAR_DIP_Y} ${COLLAR_RIGHT_X} ${COLLAR_TOP_Y}`;

// Bottom-hem trim — two short horizontal strokes at the very bottom of the
// visible shirt, just above the name plate. Gap in the middle so they read
// as hem ends rather than a single belt across the chest.
const HEM_LEFT_PATH = 'M 24 97 L 44 97';
const HEM_RIGHT_PATH = 'M 56 97 L 76 97';

// Crest sits on the viewer's right of the chest, sized big enough to read.
const CREST = { x: 58, y: 84, w: 11, h: 11 };

// Stripe layout — stripes are clipped to the body path above, so they
// follow the collar curve at the top automatically.
const STRIPE_COUNT = 5;
const SHIRT_BODY_LEFT = 22;
const SHIRT_BODY_RIGHT = 78;
const SHIRT_BODY_BOTTOM = 100;

export function ShirtOverlay({ kit, logoSrc, sizePx }: ShirtOverlayProps) {
  // Note: no mix-blend-mode on the SVG. Multiply makes white pixels
  // transparent (white × any = any), which makes white trim vanish
  // entirely on coloured shirts.
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
                y={COLLAR_TOP_Y}
                width={stripeW}
                height={SHIRT_BODY_BOTTOM - COLLAR_TOP_Y}
                fill={kit.accent}
              />
            );
          })}
        </g>
      )}
      {kit.pattern === 'plain' && (
        <>
          {/* Collar trim — thin curved line at the neckline. */}
          <path
            d={COLLAR_TRIM_PATH}
            stroke={kit.accent}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
          {/* Bottom-hem trims — two short horizontals just above the name plate. */}
          <path
            d={HEM_LEFT_PATH}
            stroke={kit.accent}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={HEM_RIGHT_PATH}
            stroke={kit.accent}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
        </>
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
