import type { ClubKit } from '../../types/entities';

interface ShirtOverlayProps {
  kit: ClubKit;
  logoSrc?: string;
  sizePx: number;
}

// Approximate shirt geometry of the DiceBear avataaars body, in 0–100
// fractional units. Hand-tuned against rendered output; if avataaars
// changes its body silhouette these constants will need re-tuning.
const SHIRT_BODY = { x: 26, y: 74, w: 48, h: 26 };
const LEFT_SLEEVE = { x: 16, y: 74, w: 12, h: 14 };   // viewer's left
const RIGHT_SLEEVE = { x: 72, y: 74, w: 12, h: 14 };  // viewer's right
// Crest sits on the viewer's right side of the shirt (the user's preference).
const CREST = { x: 60, y: 78, w: 7, h: 7 };

const STRIPE_COUNT = 5;

export function ShirtOverlay({ kit, logoSrc, sizePx }: ShirtOverlayProps) {
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
        mixBlendMode: 'multiply',
      }}
      aria-hidden="true"
    >
      {kit.pattern === 'sleeves' && (
        <>
          <rect
            x={LEFT_SLEEVE.x}
            y={LEFT_SLEEVE.y}
            width={LEFT_SLEEVE.w}
            height={LEFT_SLEEVE.h}
            fill={kit.accent}
            opacity={0.85}
          />
          <rect
            x={RIGHT_SLEEVE.x}
            y={RIGHT_SLEEVE.y}
            width={RIGHT_SLEEVE.w}
            height={RIGHT_SLEEVE.h}
            fill={kit.accent}
            opacity={0.85}
          />
        </>
      )}
      {kit.pattern === 'vertical-stripes' && (
        <g
          // Clip stripes to the shirt body so they don't bleed onto sleeves
          // or the neckline area.
          clipPath="url(#shirt-body-clip)"
        >
          <defs>
            <clipPath id="shirt-body-clip">
              <rect x={SHIRT_BODY.x} y={SHIRT_BODY.y} width={SHIRT_BODY.w} height={SHIRT_BODY.h} />
            </clipPath>
          </defs>
          {Array.from({ length: STRIPE_COUNT }).map((_, i) => {
            const stripeW = SHIRT_BODY.w / (STRIPE_COUNT * 2 + 1);
            const x = SHIRT_BODY.x + stripeW + i * stripeW * 2;
            return (
              <rect
                key={i}
                x={x}
                y={SHIRT_BODY.y}
                width={stripeW}
                height={SHIRT_BODY.h}
                fill={kit.accent}
                opacity={0.85}
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
          style={{ mixBlendMode: 'normal' }}
        />
      )}
    </svg>
  );
}
