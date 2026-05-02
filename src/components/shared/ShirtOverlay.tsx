import type { ClubKit } from '../../types/entities';

interface ShirtOverlayProps {
  kit: ClubKit;
  logoSrc?: string;
  sizePx: number;
}

// Shirt geometry derived from the actual DiceBear avataaars SVG output
// (viewBox 0 0 280 280, with translate(8) and translate(0,170) on the
// shirt group). Parsing the shirtCrewNeck path commands gives these
// outline points in 0–100 space:
//
//   Top-left collar corner:   (38.2, 71.6)
//   Top-right collar corner:  (62.1, 71.6)
//   Collar dip centre:        (50.2, 79.2)
//   Bottom-left:              (14.3, 100)
//   Bottom-right:             (85.7, 100)
//
// The collar arc is a *cubic* bezier in the source — control points:
//   left half:  start (38.2, 71.6), c1 (38.2, 75.8), c2 (43.6, 79.2), end (50.2, 79.2)
//   right half: start (50.2, 79.2), c1 (56.8, 79.2), c2 (62.1, 75.8), end (62.1, 71.6)
// (mirror symmetry, with control points at the corner X going straight
// down before curving inward to the dip).
//
// We trace this exact cubic for the trim instead of a Q approximation —
// the previous Q curve undershot the corners, leaving a visible skin
// gap above the trim.
const COLLAR_LEFT_X = 38.2;
const COLLAR_RIGHT_X = 62.1;
const COLLAR_TOP_Y = 71.6;
const COLLAR_DIP_X = 50.2;
const COLLAR_DIP_Y = 79.2;

// Body / clip path tracks the *actual* cubic curve so vertical stripes
// also follow the precise neckline.
const SHIRT_BODY_PATH =
  `M ${COLLAR_LEFT_X} ${COLLAR_TOP_Y} ` +
  `C ${COLLAR_LEFT_X} 75.8, 43.6 ${COLLAR_DIP_Y}, ${COLLAR_DIP_X} ${COLLAR_DIP_Y} ` +
  `C 56.8 ${COLLAR_DIP_Y}, ${COLLAR_RIGHT_X} 75.8, ${COLLAR_RIGHT_X} ${COLLAR_TOP_Y} ` +
  `L 86 100 L 14 100 Z`;

// Collar trim — the same cubic curve, but shifted DOWN by 1 unit so a
// strokeWidth-2 trim sits with its top edge flush with the shirt edge
// (no skin gap above the stroke) and its body entirely on shirt fabric.
const COLLAR_TRIM_OFFSET = 1;
const TRIM_TOP_Y = COLLAR_TOP_Y + COLLAR_TRIM_OFFSET;
const TRIM_DIP_Y = COLLAR_DIP_Y + COLLAR_TRIM_OFFSET;
const COLLAR_TRIM_PATH =
  `M ${COLLAR_LEFT_X} ${TRIM_TOP_Y} ` +
  `C ${COLLAR_LEFT_X} 76.8, 43.6 ${TRIM_DIP_Y}, ${COLLAR_DIP_X} ${TRIM_DIP_Y} ` +
  `C 56.8 ${TRIM_DIP_Y}, ${COLLAR_RIGHT_X} 76.8, ${COLLAR_RIGHT_X} ${TRIM_TOP_Y}`;

// Bottom-hem trim — filled rects on each side. Outer edges sit on the
// shirt's actual outline (x=14 and x=86); shortened by pulling the
// inside ends back toward the corners, so the hems read as bands at
// the corners with a wide gap in the middle.
const HEM_Y = 97.5;
const HEM_HEIGHT = 3;
const HEM_LEFT = { x: 14, w: 16 };   // x range 14–30
const HEM_RIGHT = { x: 70, w: 16 };  // x range 70–86

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
