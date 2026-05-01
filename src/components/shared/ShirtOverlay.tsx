import type { ClubKit } from '../../types/entities';

interface ShirtOverlayProps {
  kit: ClubKit;
  logoSrc?: string;
  sizePx: number;
}

// Shirt geometry derived from the actual DiceBear avataaars SVG output
// (viewBox 0 0 280 280). The shirtCrewNeck path is rendered with two
// nested transforms — the outer translate(8) shifts everything 8px right,
// the inner translate(0 170) drops the shirt below the head. The shirt
// outline in absolute coords:
//
//   Top-left collar corner:   (107, 200.35)  → (38.2, 71.6) in 0–100 space
//   Top-right collar corner:  (174, 200.35)  → (62.1, 71.6)
//   Collar dip centre:        (140.5, 221.83) → (50.2, 79.2)
//   Bottom-left:              (40, 280)       → (14.3, 100)
//   Bottom-right:              (240, 280)     → (85.7, 100)
//
// Use those numbers directly so the trim sits exactly on the shirt edge
// rather than guessing a curve.
const COLLAR_LEFT_X = 38;
const COLLAR_RIGHT_X = 62;
const COLLAR_TOP_Y = 72;
const COLLAR_DIP_Y = 79;

// Shirt body silhouette — collar on top, fans outward to the wide bottom.
const SHIRT_BODY_PATH =
  `M ${COLLAR_LEFT_X} ${COLLAR_TOP_Y} ` +
  `Q 50 ${COLLAR_DIP_Y} ${COLLAR_RIGHT_X} ${COLLAR_TOP_Y} ` +
  `L 86 100 L 14 100 Z`;

// Collar trim is the same arc, drawn as a stroke.
const COLLAR_TRIM_PATH =
  `M ${COLLAR_LEFT_X} ${COLLAR_TOP_Y} ` +
  `Q 50 ${COLLAR_DIP_Y} ${COLLAR_RIGHT_X} ${COLLAR_TOP_Y}`;

// Bottom-hem trim — drawn as filled rects so they read as visible bands,
// not hairline strokes. Two of them with a gap in the middle so the look
// reads as hem-on-each-side, not a single belt. Extended to the actual
// shirt outline edges (x=14 and x=86 in 0–100 space) per "shift outside".
const HEM_Y = 96.5;
const HEM_HEIGHT = 3;
const HEM_LEFT = { x: 14, w: 27 };   // x range 14–41
const HEM_RIGHT = { x: 59, w: 27 };  // x range 59–86

// Crest sits on the viewer's right of the chest.
const CREST = { x: 58, y: 84, w: 11, h: 11 };

// Stripe layout. Stripes are clipped to the body path above so they
// follow the collar curve at the top and the shirt's outward fan at the
// bottom automatically.
const STRIPE_COUNT = 5;
const STRIPE_LEFT = 14;
const STRIPE_RIGHT = 86;
const STRIPE_TOP = COLLAR_TOP_Y;
const STRIPE_BOTTOM = 100;

export function ShirtOverlay({ kit, logoSrc, sizePx }: ShirtOverlayProps) {
  // No mix-blend-mode — multiply makes white pixels transparent
  // (white × any = any), which would erase white trim on coloured shirts.
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
            const bodyW = STRIPE_RIGHT - STRIPE_LEFT;
            const stripeW = bodyW / (STRIPE_COUNT * 2 + 1);
            const x = STRIPE_LEFT + stripeW + i * stripeW * 2;
            return (
              <rect
                key={i}
                x={x}
                y={STRIPE_TOP}
                width={stripeW}
                height={STRIPE_BOTTOM - STRIPE_TOP}
                fill={kit.accent}
              />
            );
          })}
        </g>
      )}
      {kit.pattern === 'plain' && (
        <>
          {/* Collar trim — thin curved line tracing the actual neckline. */}
          <path
            d={COLLAR_TRIM_PATH}
            stroke={kit.accent}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
          {/* Bottom-hem trims — filled bands just above the name plate. */}
          <rect x={HEM_LEFT.x} y={HEM_Y} width={HEM_LEFT.w} height={HEM_HEIGHT} fill={kit.accent} />
          <rect x={HEM_RIGHT.x} y={HEM_Y} width={HEM_RIGHT.w} height={HEM_HEIGHT} fill={kit.accent} />
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
