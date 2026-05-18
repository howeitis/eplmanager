import { useEffect, useRef, useState } from 'react';
import type { TacticCard } from '@/types/tactics';
import { MANAGER_SCHOOLS } from '@/types/tactics';
import {
  getTierAccentColor,
  getTierBorderColor,
  getTierBgGradient,
  getTierFoilColor,
} from '@/utils/tierColors';

interface TacticCardFaceProps {
  card: TacticCard;
  /**
   * When true, plays the entrance flip-in animation. Wired by PackOpening to
   * fire only on the first reveal so cycling between cards doesn't restart
   * the animation. Mirrors the `animated` prop on `RetroPlayerCard`.
   */
  animated?: boolean;
  /** When set, disables the tap-to-flip interaction (used inside PackOpening). */
  disableFlip?: boolean;
}

const FLIP_DEBOUNCE_MS = 400;

/**
 * Tactic-card visual idiom — parallel to `RetroPlayerCard` but tactic-shaped.
 * Front: card name, slot pill, description, tier badge, optional school chip.
 * Back: ATK/DEF/FORM mods, condition label, EPL Manager logo watermark.
 *
 * Sized to match `RetroPlayerCard size="xl"` (21rem × 31rem) so it slots
 * cleanly into the existing pack-opening footprint without layout shift.
 */
export function TacticCardFace({ card, animated = false, disableFlip = false }: TacticCardFaceProps) {
  const [flipped, setFlipped] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const lastFlipAt = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleFlip = () => {
    if (disableFlip) return;
    const now = Date.now();
    if (now - lastFlipAt.current < FLIP_DEBOUNCE_MS) return;
    lastFlipAt.current = now;
    setFlipped((f) => !f);
  };

  const tier = card.tier;
  const accent = getTierAccentColor(tier);
  const border = getTierBorderColor(tier);
  const bgGradient = getTierBgGradient(tier);
  const foilColor = getTierFoilColor(tier);
  const isConditional = !!card.effect?.condition;

  const schoolKey = card.schools && card.schools.length > 0 ? card.schools[0] : null;
  const schoolMeta = schoolKey ? MANAGER_SCHOOLS[schoolKey] : null;

  const atk = card.effect?.atkMod ?? card.atkMod ?? 0;
  const def = card.effect?.defMod ?? card.defMod ?? 0;
  const form = card.effect?.formMod ?? 0;

  // Outer wrapper sets the 3D perspective; the inner flipper rotates.
  return (
    <button
      type="button"
      onClick={handleFlip}
      disabled={disableFlip}
      aria-label={flipped ? 'Show card front' : 'Show card details'}
      className={`plm-relative plm-w-[21rem] plm-h-[31rem] plm-rounded-xl plm-p-0 plm-bg-transparent plm-border-0 ${
        animated && !reduceMotion ? 'plm-animate-card-flip' : ''
      } ${disableFlip ? 'plm-cursor-default' : 'plm-cursor-pointer'}`}
      style={{ perspective: '1200px' }}
    >
      <div
        className="plm-relative plm-w-full plm-h-full plm-transition-transform plm-duration-500"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped && !reduceMotion ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ─── FRONT FACE ─── */}
        <div
          className="plm-absolute plm-inset-0 plm-rounded-xl plm-overflow-hidden plm-flex plm-flex-col"
          style={{
            backfaceVisibility: 'hidden',
            background: bgGradient,
            border: `3px solid ${border}`,
            boxShadow:
              '0 30px 60px -12px rgba(0,0,0,0.45), 0 18px 36px -18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          {/* Subtle inner border */}
          <div
            className="plm-absolute plm-inset-2 plm-rounded-lg plm-pointer-events-none"
            style={{ border: `1px solid ${border}55` }}
            aria-hidden="true"
          />

          {/* Top row: slot pill + tier badge */}
          <div className="plm-relative plm-flex plm-items-start plm-justify-between plm-p-4 plm-pb-2">
            <div
              className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-[0.3em] plm-px-2 plm-py-1 plm-rounded plm-bg-black/15"
              style={{ color: foilColor }}
            >
              {card.slot}
            </div>
            <div
              className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-wider plm-px-2 plm-py-1 plm-rounded"
              style={{ color: foilColor, border: `1px solid ${foilColor}55`, background: 'rgba(255,255,255,0.35)' }}
            >
              {tier}
            </div>
          </div>

          {/* Optional school chip — Phase C */}
          {schoolMeta && (
            <div className="plm-relative plm-px-4">
              <span
                className="plm-inline-block plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-[0.25em] plm-px-2 plm-py-1 plm-rounded plm-bg-black/20"
                style={{ color: foilColor }}
              >
                {schoolMeta.name}
              </span>
            </div>
          )}

          {/* Big card name */}
          <div className="plm-relative plm-flex-1 plm-flex plm-flex-col plm-justify-center plm-items-center plm-px-6 plm-text-center">
            <div
              className="plm-font-display plm-text-4xl plm-font-black plm-leading-tight plm-uppercase plm-tracking-tight"
              style={{
                color: foilColor,
                textShadow: '0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              {card.name}
            </div>
            <p
              className="plm-mt-4 plm-text-sm plm-italic plm-leading-snug plm-max-w-[16rem]"
              style={{ color: foilColor, opacity: 0.85 }}
            >
              {card.description}
            </p>
          </div>

          {/* Conditional/Always-on indicator + bottom accent */}
          <div className="plm-relative plm-px-4 plm-pb-4">
            <div className="plm-flex plm-items-center plm-justify-between">
              <span
                className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-widest"
                style={{ color: foilColor }}
              >
                {isConditional ? 'Conditional' : 'Always On'}
              </span>
              {!disableFlip && (
                <span className="plm-text-[10px] plm-uppercase plm-tracking-wider" style={{ color: foilColor, opacity: 0.7 }}>
                  Tap to flip
                </span>
              )}
            </div>
            <div
              className="plm-mt-2 plm-h-[3px] plm-w-full plm-rounded"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ─── BACK FACE ─── */}
        <div
          className="plm-absolute plm-inset-0 plm-rounded-xl plm-overflow-hidden plm-flex plm-flex-col plm-justify-between plm-p-5"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(160deg, #1a1f2e 0%, #2a3142 50%, #1a1f2e 100%)',
            border: `3px solid ${border}`,
            color: '#F5F5F5',
            boxShadow:
              '0 30px 60px -12px rgba(0,0,0,0.45), 0 18px 36px -18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Header */}
          <div className="plm-text-center">
            <div
              className="plm-text-[10px] plm-font-bold plm-tracking-[0.3em] plm-uppercase"
              style={{ color: accent }}
            >
              Effect
            </div>
            <div className="plm-font-display plm-text-2xl plm-mt-1 plm-leading-tight">
              {card.name}
            </div>
          </div>

          {/* Stat trio */}
          <div className="plm-grid plm-grid-cols-3 plm-gap-3 plm-text-center">
            <StatPill label="ATK" value={atk} accent={accent} />
            <StatPill label="DEF" value={def} accent={accent} />
            <StatPill label="FORM" value={form} accent={accent} />
          </div>

          {/* Condition label */}
          {isConditional && card.effect?.conditionLabel && (
            <div
              className="plm-rounded plm-px-3 plm-py-2 plm-text-center"
              style={{
                background: `${accent}1A`,
                border: `1px solid ${accent}55`,
              }}
            >
              <div
                className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-mb-0.5"
                style={{ color: accent }}
              >
                Fires In
              </div>
              <div className="plm-text-sm plm-italic">{card.effect.conditionLabel}</div>
            </div>
          )}
          {!isConditional && (
            <div className="plm-text-center plm-text-xs plm-italic plm-opacity-60">
              Always-on instruction.
            </div>
          )}

          {/* Footer mark */}
          <div className="plm-text-center">
            <div
              className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-[0.4em]"
              style={{ color: accent, opacity: 0.7 }}
            >
              EPL Manager
            </div>
            {!disableFlip && (
              <div className="plm-text-[10px] plm-mt-1 plm-opacity-50">Tap to flip back</div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function StatPill({ label, value, accent }: { label: string; value: number; accent: string }) {
  const tone =
    value > 0
      ? 'plm-text-emerald-300'
      : value < 0
        ? 'plm-text-red-300'
        : 'plm-text-warm-300';
  return (
    <div
      className="plm-rounded plm-py-2.5 plm-border"
      style={{
        background: 'rgba(255,255,255,0.05)',
        borderColor: `${accent}33`,
      }}
    >
      <div
        className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-mb-1"
        style={{ color: accent }}
      >
        {label}
      </div>
      <div className={`plm-text-2xl plm-font-bold plm-tabular-nums ${tone}`}>
        {value > 0 ? '+' : ''}
        {value}
      </div>
    </div>
  );
}
