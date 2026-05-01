import type { ClubKit } from '../../types/entities';

interface ShirtOverlayProps {
  kit: ClubKit;
  logoSrc?: string;
  sizePx: number;
}

// Approximate shirt geometry of the DiceBear avataaars body, in 0–100
// fractional units. Sleeves on avataaars angle outward from the shoulders,
// so they're rendered as trapezoidal paths rather than rectangles. Hand-
// tuned against rendered output; if avataaars changes its body silhouette
// these paths need re-tuning.
//
// Body silhouette (rough): widens from shoulders (x≈30..70 at y≈75) to
// hips (x≈22..78 at y≈100).
const SHIRT_BODY_PATH = 'M 30 75 L 70 75 L 78 100 L 22 100 Z';

// Sleeve trapezoids — wider at shoulder, taper outward toward the elbow.
// Viewer's left = player's right side.
const LEFT_SLEEVE_PATH = 'M 30 75 L 22 75 L 14 95 L 24 95 Z';
const RIGHT_SLEEVE_PATH = 'M 70 75 L 78 75 L 86 95 L 76 95 Z';

// Crest sits on the viewer's right of the shirt, mid-chest.
const CREST = { x: 60, y: 81, w: 7, h: 7 };

// For stripes we need the body bounds for spacing the rects across.
const SHIRT_BODY_LEFT = 26;
const SHIRT_BODY_RIGHT = 74;
const SHIRT_BODY_TOP = 75;
const SHIRT_BODY_BOTTOM = 100;
const STRIPE_COUNT = 5;

export function ShirtOverlay({ kit, logoSrc, sizePx }: ShirtOverlayProps) {
  // Note: no mix-blend-mode on the SVG. Multiply makes white pixels
  // transparent (white × any = any), so white sleeves on a coloured shirt
  // would vanish entirely — which was the "sleeves disappear behind the
  // model" bug. Painting the patterns directly gives the cleanest result
  // for the cartoon avataaars style.
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
      {kit.pattern === 'sleeves' && (
        <>
          <path d={LEFT_SLEEVE_PATH} fill={kit.accent} />
          <path d={RIGHT_SLEEVE_PATH} fill={kit.accent} />
        </>
      )}
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
