import { useEffect, useRef, useState, useCallback } from 'react';
import type { TacticCard } from '@/types/tactics';
import { MANAGER_SCHOOLS } from '@/types/tactics';
import {
  getTierAccentColor,
  getTierBorderColor,
  getTierBgGradient,
  getTierFoilColor,
} from '@/utils/tierColors';
import { getBrandLogoUrl } from '@/data/assets';

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
 * Phase B.5 / D tactic-card visual.
 *
 * Mirrors the design language of `RetroPlayerCard`: tier-colored border +
 * gradient background, a big "hero" stat in the top-left (the dominant
 * modifier in place of OVR), a slot pill (in place of position), a tier
 * chip top-right (in place of nationality flag), a tactical glyph in
 * place of the player portrait, then a name plate, condition/school
 * meta line, and stat-trio readout.
 *
 * Gold / elite / legendary cards get extra treatment:
 *  - foil shimmer + sparkle overlay
 *  - 👑 corner ornament for legendaries
 *  - hero-stat sticker (matches player-card behaviour)
 *
 * Sized to match `RetroPlayerCard size="xl"` (21rem × 31rem) so it slots
 * cleanly into the existing pack-opening footprint.
 */
export function TacticCardFace({ card, animated = false, disableFlip = false }: TacticCardFaceProps) {
  const [flipped, setFlipped] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLButtonElement>(null);
  const lastFlipAt = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleFlip = useCallback(() => {
    if (disableFlip) return;
    const now = Date.now();
    if (now - lastFlipAt.current < FLIP_DEBOUNCE_MS) return;
    lastFlipAt.current = now;
    setFlipped((f) => !f);
  }, [disableFlip]);

  const tier = card.tier;
  const accent = getTierAccentColor(tier);
  const borderColor = getTierBorderColor(tier);
  const bgGradient = getTierBgGradient(tier);
  const foilColor = getTierFoilColor(tier);
  const isConditional = !!card.effect?.condition;
  const isGold = tier === 'gold' || tier === 'elite';
  const isLegendary = !!card.legendary;

  const schoolKey = card.schools && card.schools.length > 0 ? card.schools[0] : null;
  const schoolMeta = schoolKey ? MANAGER_SCHOOLS[schoolKey] : null;

  const atk = card.effect?.atkMod ?? card.atkMod ?? 0;
  const def = card.effect?.defMod ?? card.defMod ?? 0;
  const form = card.effect?.formMod ?? 0;

  // Dominant modifier — picked as the absolute-largest of ATK / DEF / FORM
  // and shown in the OVR slot. Mirrors the way RetroPlayerCard surfaces
  // a single hero stat (the highest of the six). Format keeps the sign so
  // negative dominant mods (rare — Park The Bus etc.) read correctly.
  const heroStat = pickHeroStat(atk, def, form);

  // Glare sweep on gold tiers (mirrors RetroPlayerCard's interaction).
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isGold || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePos({ x, y });
  }, [isGold]);

  const handleMouseLeave = useCallback(() => {
    setGlarePos(null);
  }, []);

  return (
    <button
      type="button"
      ref={cardRef}
      onClick={handleFlip}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      disabled={disableFlip}
      aria-label={flipped ? 'Show card front' : 'Show card details'}
      className={`plm-relative plm-w-[21rem] plm-h-[31rem] plm-rounded-xl plm-p-0 plm-bg-transparent plm-border-0 plm-select-none ${
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
        {/* ═══════════ FRONT FACE ═══════════ */}
        <div
          className="plm-absolute plm-inset-0 plm-rounded-xl plm-overflow-hidden plm-flex plm-flex-col"
          style={{
            backfaceVisibility: 'hidden',
            background: bgGradient,
            border: `3px solid ${borderColor}`,
            boxShadow:
              '0 30px 60px -12px rgba(0,0,0,0.45), 0 18px 36px -18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          {/* Inner decorative border */}
          <div
            className="plm-absolute plm-inset-3 plm-rounded-lg plm-pointer-events-none plm-border-2"
            style={{ borderColor: borderColor + '40' }}
            aria-hidden="true"
          />

          {/* Sparkle overlay for gold / elite / legendary cards */}
          {(isGold || isLegendary) && (
            <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[3] plm-overflow-hidden">
              {[...Array(isLegendary ? 9 : 6)].map((_, i) => (
                <div
                  key={i}
                  className="plm-absolute plm-animate-sparkle-pulse"
                  style={{
                    left: `${10 + i * 10}%`,
                    top: `${8 + (i % 4) * 22}%`,
                    animationDelay: `${i * 0.18}s`,
                    fontSize: isLegendary ? 16 : 14,
                  }}
                  aria-hidden="true"
                >
                  ✨
                </div>
              ))}
            </div>
          )}

          {/* Glare sweep — only renders on gold tiers when pointer is over */}
          {isGold && glarePos && (
            <div
              className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-20 plm-transition-opacity plm-duration-150"
              style={{
                background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.45) 0%, rgba(255,215,0,0.15) 30%, transparent 60%)`,
              }}
              aria-hidden="true"
            />
          )}

          {/* Hero-stat sticker on gold/elite/legendary (mirrors player card) */}
          {(isGold || isLegendary) && (
            <div
              className="plm-absolute plm-z-[15] plm-flex plm-items-center plm-justify-center plm-rounded-full plm-shadow-md"
              style={{
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 32,
                height: 32,
                background: 'rgba(255,255,255,0.92)',
                border: `1.5px solid ${borderColor}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
              aria-hidden="true"
            >
              <span style={{ fontSize: 16 }}>
                {getHeroStatEmoji(heroStat.key)}
              </span>
            </div>
          )}

          {/* Legendary 👑 ornament — bottom-left, larger and more present */}
          {isLegendary && (
            <div
              className="plm-absolute plm-z-[14]"
              style={{ bottom: 12, left: 12, fontSize: 28, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
              aria-hidden="true"
            >
              👑
            </div>
          )}

          {/* ─── Top row: hero stat + slot + tier badge ─── */}
          <div className="plm-flex plm-justify-between plm-items-start plm-px-2.5 plm-pt-1 plm-relative plm-z-[5]">
            <div className="plm-text-center">
              <div
                className="plm-text-5xl plm-font-display plm-font-black plm-leading-none plm-tabular-nums"
                style={{ color: accent, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
              >
                {formatHeroValue(heroStat.value)}
              </div>
              <div
                className="plm-text-xs plm-font-bold plm-uppercase plm-tracking-wider plm-mt-0.5"
                style={{ color: borderColor }}
              >
                {heroStat.label}
              </div>
              <div
                className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-[0.2em] plm-mt-0.5 plm-opacity-70"
                style={{ color: foilColor }}
              >
                {card.slot}
              </div>
            </div>
            <div className="plm-flex plm-flex-col plm-items-end plm-gap-1.5">
              <div
                className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-wider plm-px-2 plm-py-1 plm-rounded"
                style={{
                  color: foilColor,
                  border: `1.5px solid ${foilColor}80`,
                  background: 'rgba(255,255,255,0.45)',
                }}
              >
                {tier}
              </div>
              {isLegendary && (
                <div
                  className="plm-text-[8px] plm-font-bold plm-uppercase plm-tracking-[0.25em] plm-px-1.5 plm-py-0.5 plm-rounded"
                  style={{
                    color: '#FFFFFF',
                    background: 'linear-gradient(135deg, #b8860b, #ffd700, #b8860b)',
                    boxShadow: '0 2px 6px rgba(184,134,11,0.45)',
                  }}
                >
                  Legendary
                </div>
              )}
            </div>
          </div>

          {/* ─── Center: tactical glyph (replaces player portrait) ─── */}
          <div
            className="plm-flex plm-justify-center plm-items-center plm-relative plm-z-[5] plm-flex-shrink-0"
            style={{ height: 116 }}
          >
            <div
              className="plm-flex plm-items-center plm-justify-center plm-rounded-full"
              style={{
                width: 116,
                height: 116,
                background: 'rgba(255,255,255,0.35)',
                border: `2px solid ${borderColor}55`,
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.18)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: 64,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))',
                  color: foilColor,
                  fontWeight: 900,
                }}
              >
                {getSlotGlyph(card)}
              </span>
            </div>
          </div>

          {/* ─── Name plate ─── */}
          <div
            className="plm-mx-2.5 plm-py-1 plm-rounded plm-text-center plm-relative plm-z-[5] plm-flex-shrink-0"
            style={{
              background: `linear-gradient(to right, ${borderColor} 0%, ${accent} 50%, ${borderColor} 100%)`,
              borderBottom: `2px solid ${accent}`,
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35), inset 0 -1px 2px rgba(0,0,0,0.22)',
            }}
          >
            <div
              className="plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-2 plm-text-xl"
              style={{
                color: '#1A1A1A',
                textShadow: '0 1px 0 rgba(255,255,255,0.4)',
              }}
            >
              {card.name}
            </div>
          </div>

          {/* ─── Meta line: school chip + always-on/conditional ─── */}
          <div className="plm-flex plm-items-center plm-justify-between plm-px-2.5 plm-mt-1 plm-relative plm-z-[5]">
            <span
              className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-[0.2em]"
              style={{ color: foilColor, opacity: 0.85 }}
            >
              {schoolMeta?.name ?? 'Neutral'}
            </span>
            <span
              className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-[0.2em]"
              style={{ color: foilColor, opacity: 0.85 }}
            >
              {isConditional ? 'Conditional' : 'Always On'}
            </span>
          </div>

          {/* ─── Description + stat trio ─── */}
          <div className="plm-flex-1 plm-flex plm-flex-col plm-justify-between plm-px-3 plm-pt-2 plm-pb-3 plm-relative plm-z-[5]">
            <p
              className="plm-text-sm plm-italic plm-leading-snug plm-text-center"
              style={{ color: foilColor, opacity: 0.9 }}
            >
              {card.description}
            </p>
            <div className="plm-grid plm-grid-cols-3 plm-gap-2 plm-mt-2">
              <MiniStatPip label="ATK" value={atk} foil={foilColor} border={borderColor} />
              <MiniStatPip label="DEF" value={def} foil={foilColor} border={borderColor} />
              <MiniStatPip label="FORM" value={form} foil={foilColor} border={borderColor} />
            </div>
            {!disableFlip && (
              <div
                className="plm-text-[10px] plm-text-center plm-mt-2 plm-uppercase plm-tracking-wider"
                style={{ color: foilColor, opacity: 0.5 }}
              >
                Tap to flip
              </div>
            )}
          </div>
        </div>

        {/* ═══════════ BACK FACE — unified premium navy ═══════════ */}
        <div
          className="plm-absolute plm-inset-0 plm-rounded-xl plm-overflow-hidden plm-flex plm-flex-col plm-items-center plm-justify-center plm-p-5 plm-gap-4"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background:
              'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)',
            border: `3px solid ${borderColor}`,
            color: '#F5F5F5',
            boxShadow:
              '0 30px 60px -12px rgba(0,0,0,0.45), 0 18px 36px -18px rgba(0,0,0,0.35)',
          }}
        >
          {/* Inner decorative border (matches front) */}
          <div
            className="plm-absolute plm-inset-3 plm-rounded-lg plm-pointer-events-none plm-border-2"
            style={{ borderColor: borderColor + '40' }}
            aria-hidden="true"
          />

          {/* Brand mark */}
          <div className="plm-flex plm-flex-col plm-items-center plm-gap-2 plm-relative plm-z-[1]">
            <img
              src={getBrandLogoUrl()}
              alt="EPL Manager"
              className="plm-w-24 plm-h-24 plm-object-contain plm-opacity-90"
            />
            <span
              className="plm-text-xs plm-font-display plm-font-bold plm-uppercase plm-tracking-widest plm-opacity-60"
              style={{ color: accent }}
            >
              Tactic Card · {tier}
            </span>
          </div>

          {/* Card name */}
          <div className="plm-text-center plm-relative plm-z-[1]">
            <div className="plm-font-display plm-text-2xl plm-font-bold plm-leading-tight">
              {card.name}
            </div>
            {isLegendary && (
              <div
                className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-[0.3em] plm-mt-1"
                style={{ color: '#FFD700' }}
              >
                ◆ Legendary ◆
              </div>
            )}
          </div>

          {/* Stat breakdown */}
          <div className="plm-grid plm-grid-cols-3 plm-gap-3 plm-w-full plm-text-center plm-relative plm-z-[1]">
            <BackStatPill label="ATK" value={atk} accent={accent} />
            <BackStatPill label="DEF" value={def} accent={accent} />
            <BackStatPill label="FORM" value={form} accent={accent} />
          </div>

          {/* Fires-when / unlock label */}
          {isConditional && card.effect?.conditionLabel && (
            <div
              className="plm-w-full plm-rounded plm-px-3 plm-py-2 plm-text-center plm-relative plm-z-[1]"
              style={{
                background: `${accent}1A`,
                border: `1px solid ${accent}55`,
              }}
            >
              <div
                className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-mb-0.5"
                style={{ color: accent }}
              >
                Fires When
              </div>
              <div className="plm-text-sm plm-italic">{card.effect.conditionLabel}</div>
            </div>
          )}
          {isLegendary && card.unlockLabel && (
            <div
              className="plm-w-full plm-rounded plm-px-3 plm-py-2 plm-text-center plm-relative plm-z-[1]"
              style={{
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.4)',
              }}
            >
              <div
                className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-mb-0.5"
                style={{ color: '#FFD700' }}
              >
                Unlocked By
              </div>
              <div className="plm-text-sm plm-italic">{card.unlockLabel}</div>
            </div>
          )}
          {!isConditional && !isLegendary && (
            <div className="plm-text-xs plm-italic plm-opacity-60 plm-relative plm-z-[1]">
              Always-on instruction.
            </div>
          )}

          {!disableFlip && (
            <div
              className="plm-text-[10px] plm-opacity-50 plm-uppercase plm-tracking-wider plm-relative plm-z-[1]"
            >
              Tap to flip back
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

interface HeroStat {
  key: 'atk' | 'def' | 'form';
  label: string;
  value: number;
}

/**
 * Pick the dominant stat (largest absolute value across ATK/DEF/FORM) for
 * the OVR-slot display. Ties break ATK → DEF → FORM so the same family at
 * different tiers renders consistently. Returns the +0 ATK placeholder
 * when the card has no mods at all (defensive — shouldn't happen).
 */
function pickHeroStat(atk: number, def: number, form: number): HeroStat {
  const stats: HeroStat[] = [
    { key: 'atk', label: 'ATK', value: atk },
    { key: 'def', label: 'DEF', value: def },
    { key: 'form', label: 'FORM', value: form },
  ];
  stats.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return stats[0];
}

function formatHeroValue(v: number): string {
  if (v > 0) return `+${v}`;
  return `${v}`;
}

function getHeroStatEmoji(key: HeroStat['key']): string {
  switch (key) {
    case 'atk':
      return '⚔️';
    case 'def':
      return '🛡️';
    case 'form':
      return '🔥';
  }
}

/**
 * Per-slot glyph that replaces the player portrait. Picked by family
 * keyword first (so "press" cards render a chevron, "compact" a shield,
 * etc.) then by slot as a fallback.
 */
function getSlotGlyph(card: TacticCard): string {
  if (card.slot === 'shape') return '◆';
  if (card.slot === 'tempo') return '〰';
  // Instruction: pick a glyph that hints at the card's flavour
  const fam = (card.family || card.id).toLowerCase();
  if (fam.includes('press') || fam.includes('quick') || fam.includes('tempo')) return '⚡';
  if (fam.includes('compact') || fam.includes('hold') || fam.includes('park') || fam.includes('time')) return '🛡';
  if (fam.includes('cup')) return '🏆';
  if (fam.includes('derby')) return '⚔';
  if (fam.includes('home')) return '🏠';
  if (fam.includes('away')) return '✈';
  if (fam.includes('underdog') || fam.includes('survival') || fam.includes('houdini')) return '⬆';
  if (fam.includes('bully') || fam.includes('big')) return '◉';
  if (fam.includes('stay') || fam.includes('possession')) return '◯';
  if (fam.includes('second')) return '↻';
  if (fam.includes('invincibles') || fam.includes('wenger')) return '◊';
  if (fam.includes('klopp') || fam.includes('sacchi')) return '⚡';
  if (fam.includes('total')) return '✦';
  if (fam.includes('cloughie') || fam.includes('mourinho')) return '🛡';
  if (fam.includes('double')) return '✦';
  if (fam.includes('pep')) return '◯';
  return '◆';
}

function MiniStatPip({
  label,
  value,
  foil,
  border,
}: {
  label: string;
  value: number;
  foil: string;
  border: string;
}) {
  const positive = value > 0;
  const negative = value < 0;
  const tone = positive ? '#0f5132' : negative ? '#842029' : foil;
  return (
    <div
      className="plm-rounded plm-py-1.5 plm-text-center"
      style={{
        background: 'rgba(255,255,255,0.45)',
        border: `1px solid ${border}33`,
      }}
    >
      <div
        className="plm-text-[8px] plm-font-bold plm-uppercase plm-tracking-wider"
        style={{ color: foil, opacity: 0.85 }}
      >
        {label}
      </div>
      <div className="plm-text-base plm-font-bold plm-tabular-nums" style={{ color: tone }}>
        {value > 0 ? '+' : ''}
        {value}
      </div>
    </div>
  );
}

function BackStatPill({ label, value, accent }: { label: string; value: number; accent: string }) {
  const tone = value > 0
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
