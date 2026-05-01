import type { ClubKit } from '../../types/entities';

interface ShirtOverlayProps {
  kit: ClubKit;
  logoSrc?: string;
  sizePx: number;
}

// Body silhouette in 0–100 fractional viewBox units. The top edge curves
// downward in the middle to mimic the avataaars shirt collar, so vertical
// stripes get clipped along the collar curve rather than cutting straight
// across the neckline.
//
// Collar is a shallow dip — top edges sit at y≈78, dipping to y≈86 in the
// middle. That puts stripes meeting the bottom of the avataaars collar
// (instead of well below it) while still leaving room for hair to hang in
// front of the overlay at the shoulder line.
const COLLAR_LEFT_X = 28;
const COLLAR_RIGHT_X = 72;
const COLLAR_TOP_Y = 78;
const COLLAR_DIP_Y = 86;

const SHIRT_BODY_PATH =
  `M ${COLLAR_LEFT_X} ${COLLAR_TOP_Y} ` +
  `Q 50 ${COLLAR_DIP_Y} ${COLLAR_RIGHT_X} ${COLLAR_TOP_Y} ` +
  `L 78 100 L 22 100 Z`;

// Collar-trim path traces the same curve, drawn as a stroke. Plain-pattern
// clubs use this as a thin neckline accent in their kit's accent colour.
const COLLAR_TRIM_PATH =
  `M ${COLLAR_LEFT_X} ${COLLAR_TOP_Y} ` +
  `Q 50 ${COLLAR_DIP_Y} ${COLLAR_RIGHT_X} ${COLLAR_TOP_Y}`;

// Cuff trims — short diagonal strokes at the end of each sleeve, angled
// outward to follow the avataaars sleeve direction. Tuned to sit on the
// sleeve fabric, not below it on bare skin.
const CUFF_LEFT_PATH = 'M 17 85 L 28 82';   // viewer's left, player's right arm
const CUFF_RIGHT_PATH = 'M 72 82 L 83 85';  // viewer's right, player's left arm

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
          {/* Collar trim — thin curved line following the neckline. */}
          <path
            d={COLLAR_TRIM_PATH}
            stroke={kit.accent}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
          {/* Sleeve cuff trims — short diagonals at the sleeve ends. */}
          <path
            d={CUFF_LEFT_PATH}
            stroke={kit.accent}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={CUFF_RIGHT_PATH}
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
