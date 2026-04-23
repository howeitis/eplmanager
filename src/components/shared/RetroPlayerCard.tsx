import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import type { Player, PlayerStats, TransferRecord } from '../../types/entities';
import { getNationalityFlagUrl, getNationalityLabel, getClubLogoUrl } from '../../data/assets';
import { generateScoutSummaryParts } from '../../engine/scoutSummary';

// ─── Emoji pool ───

const PLAYER_EMOJIS: string[] = [
  // Standard man — 5 skin tones
  '\u{1F468}\u{1F3FB}', '\u{1F468}\u{1F3FC}', '\u{1F468}\u{1F3FD}',
  '\u{1F468}\u{1F3FE}', '\u{1F468}\u{1F3FF}',
  // Man curly hair — 5 skin tones
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B1}', '\u{1F468}\u{1F3FC}\u{200D}\u{1F9B1}',
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B1}', '\u{1F468}\u{1F3FE}\u{200D}\u{1F9B1}',
  '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B1}',
  // Man bald — 5 skin tones
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B2}', '\u{1F468}\u{1F3FC}\u{200D}\u{1F9B2}',
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B2}', '\u{1F468}\u{1F3FE}\u{200D}\u{1F9B2}',
  '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B2}',
  // Man red hair — 5 skin tones
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B0}', '\u{1F468}\u{1F3FC}\u{200D}\u{1F9B0}',
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B0}', '\u{1F468}\u{1F3FE}\u{200D}\u{1F9B0}',
  '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B0}',
  // Man white/grey hair — 5 skin tones
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B3}', '\u{1F468}\u{1F3FC}\u{200D}\u{1F9B3}',
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B3}', '\u{1F468}\u{1F3FE}\u{200D}\u{1F9B3}',
  '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B3}',
  // Beard (🧔) — 5 skin tones
  '\u{1F9D4}\u{1F3FB}', '\u{1F9D4}\u{1F3FC}', '\u{1F9D4}\u{1F3FD}',
  '\u{1F9D4}\u{1F3FE}', '\u{1F9D4}\u{1F3FF}',
  // Blond man (👱‍♂️) — 5 skin tones
  '\u{1F471}\u{1F3FB}\u{200D}\u{2642}\u{FE0F}', '\u{1F471}\u{1F3FC}\u{200D}\u{2642}\u{FE0F}',
  '\u{1F471}\u{1F3FD}\u{200D}\u{2642}\u{FE0F}', '\u{1F471}\u{1F3FE}\u{200D}\u{2642}\u{FE0F}',
  '\u{1F471}\u{1F3FF}\u{200D}\u{2642}\u{FE0F}',
  // Standard woman — 2 skin tones
  '\u{1F469}\u{1F3FB}', '\u{1F469}\u{1F3FF}',
  // Woman curly hair — 5 skin tones
  '\u{1F469}\u{1F3FB}\u{200D}\u{1F9B1}', '\u{1F469}\u{1F3FC}\u{200D}\u{1F9B1}',
  '\u{1F469}\u{1F3FD}\u{200D}\u{1F9B1}', '\u{1F469}\u{1F3FE}\u{200D}\u{1F9B1}',
  '\u{1F469}\u{1F3FF}\u{200D}\u{1F9B1}',
  // Woman red hair — 2 skin tones
  '\u{1F469}\u{1F3FC}\u{200D}\u{1F9B0}', '\u{1F469}\u{1F3FE}\u{200D}\u{1F9B0}',
  // Woman white/grey hair — 5 skin tones
  '\u{1F469}\u{1F3FB}\u{200D}\u{1F9B3}', '\u{1F469}\u{1F3FC}\u{200D}\u{1F9B3}',
  '\u{1F469}\u{1F3FD}\u{200D}\u{1F9B3}', '\u{1F469}\u{1F3FE}\u{200D}\u{1F9B3}',
  '\u{1F469}\u{1F3FF}\u{200D}\u{1F9B3}',
  // Woman bald — 5 skin tones
  '\u{1F469}\u{1F3FB}\u{200D}\u{1F9B2}', '\u{1F469}\u{1F3FC}\u{200D}\u{1F9B2}',
  '\u{1F469}\u{1F3FD}\u{200D}\u{1F9B2}', '\u{1F469}\u{1F3FE}\u{200D}\u{1F9B2}',
  '\u{1F469}\u{1F3FF}\u{200D}\u{1F9B2}',
  // Blond woman (👱‍♀️) — 2 skin tones
  '\u{1F471}\u{1F3FB}\u{200D}\u{2640}\u{FE0F}', '\u{1F471}\u{1F3FF}\u{200D}\u{2640}\u{FE0F}',
];

function hashPlayerId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getPlayerEmoji(id: string): string {
  return PLAYER_EMOJIS[hashPlayerId(id) % PLAYER_EMOJIS.length];
}

const STAT_KEYS: (keyof PlayerStats)[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];

// Emoji stickers that match each stat
const STAT_EMOJI: Record<string, string> = {
  ATK: '⚡',
  DEF: '🛡️',
  MOV: '💨',
  PWR: '💪',
  MEN: '🧠',
  SKL: '✨',
};

// ─── Serial number from hash ───
// Denominator is fixed at 8500 for every player so it stays constant across
// saves and season-to-season progression. The numerator is derived from the
// player id hash.
const SERIAL_PRINT_RUN = 8500;
function getSerialNumber(id: string): string {
  const h = hashPlayerId(id);
  const serial = (h % SERIAL_PRINT_RUN) + 1;
  return `${String(serial).padStart(4, '0')}/${SERIAL_PRINT_RUN}`;
}

// ─── Card tier: future stars ───
// Any u21 player rated 75+ counts as a future star. The very best
// (u21 + 82+) are promoted to "starboy" and get the louder treatment.
function getFutureStarTier(player: Player): 'starboy' | 'future-star' | null {
  if (player.age > 21) return null;
  if (player.overall >= 82) return 'starboy';
  if (player.overall >= 75) return 'future-star';
  return null;
}

// Map full club names to the shortened form used on player cards.
const CLUB_SHORT_NAMES: Record<string, string> = {
  'Manchester City': 'City',
  'Manchester United': 'United',
  'Tottenham Hotspur': 'Tottenham',
  'Newcastle United': 'Newcastle',
  'Aston Villa': 'Villa',
  'Brighton & Hove Albion': 'Brighton',
  'West Ham United': 'West Ham',
  'AFC Bournemouth': 'Bournemouth',
  'Crystal Palace': 'Palace',
  'Wolverhampton Wanderers': 'Wolves',
  'Nottingham Forest': 'Forest',
  'Leeds United': 'Leeds',
};

function shortenClubName(name: string | undefined): string | undefined {
  if (!name) return name;
  return CLUB_SHORT_NAMES[name] ?? name;
}

// ─── Color helpers ───

function getOverallColor(overall: number, age?: number): string {
  // Future star mixed silver-gold for u21 75-80
  if (age !== undefined && age <= 21 && overall >= 75 && overall < 80) {
    return '#D4AF37'; // mixed silver-gold
  }
  if (overall >= 80) return '#FFD700';
  if (overall >= 75) return '#C0C0C0';
  if (overall >= 65) return '#CD7F32';
  return '#8B7355';
}

function getCardBorderColor(overall: number, age?: number): string {
  if (age !== undefined && age <= 21 && overall >= 75 && overall < 80) {
    return '#B8980A'; // mixed silver-gold border
  }
  if (overall >= 80) return '#B8860B';
  if (overall >= 75) return '#808080';
  if (overall >= 65) return '#8B4513';
  return '#6B5B45';
}

function getCardBgGradient(overall: number, age?: number): string {
  // Future star (u21, 75-80): mixed silver-gold gradient
  if (age !== undefined && age <= 21 && overall >= 75 && overall < 80) {
    return 'linear-gradient(135deg, #FFF8DC 0%, #C0C0C0 25%, #FFD700 50%, #C0C0C0 75%, #FFF8DC 100%)';
  }
  if (overall >= 80) return 'linear-gradient(135deg, #FFF8DC 0%, #FFD700 30%, #FFF8DC 50%, #FFD700 70%, #FFF8DC 100%)';
  if (overall >= 75) return 'linear-gradient(135deg, #F5F5F5 0%, #C0C0C0 30%, #F5F5F5 50%, #C0C0C0 70%, #F5F5F5 100%)';
  if (overall >= 65) return 'linear-gradient(135deg, #FFF3E0 0%, #CD7F32 30%, #FFF3E0 50%, #CD7F32 70%, #FFF3E0 100%)';
  return 'linear-gradient(135deg, #FAF0E6 0%, #D2B48C 30%, #FAF0E6 50%, #D2B48C 70%, #FAF0E6 100%)';
}

// Foil-stamped metallic ink that complements each card tier. Deeper,
// higher-contrast shades so the stamp reads as embossed metallic on the
// card's base color rather than re-using the bright overall hue.
function getFoilStampColor(overall: number, age?: number): string {
  if (age !== undefined && age <= 21 && overall >= 75 && overall < 80) {
    return '#6B5A14'; // antique champagne foil (future star)
  }
  if (overall >= 80) return '#7A5A10'; // deep antique gold foil
  if (overall >= 75) return '#3F3F46'; // brushed pewter foil
  if (overall >= 65) return '#5A3418'; // burnished copper foil
  return '#4A3A2E'; // dark sepia foil
}

// Elite-stat accent — dark magenta foil. Only the single top stat qualifies.
const ELITE_STAT_THRESHOLD = 90;
const ELITE_STAT_COLOR = '#9D174D';

// Form-driven drop shadow — reads as an active energy field.
// Greens are vibrant electric emerald (not muted earth green); reds stay red.
// form is clamped to [-5, 5] by the engine.
function getFormDropShadow(form: number): string | null {
  if (form >= 4) return '0 0 14px 1px rgba(16,185,129,0.95)';    // vivid emerald
  if (form === 3) return '0 0 12px 1px rgba(16,185,129,0.80)';   // emerald
  if (form === 2) return '0 0 10px 1px rgba(52,211,153,0.65)';   // bright emerald
  if (form === 1) return '0 0 8px 1px rgba(52,211,153,0.45)';    // soft emerald
  if (form === 0) return null;                                   // neutral
  if (form === -1) return '0 0 8px 1px rgba(252,165,165,0.45)';  // light red
  if (form === -2) return '0 0 10px 1px rgba(239,68,68,0.55)';   // red
  if (form === -3) return '0 0 12px 1px rgba(220,38,38,0.65)';   // mid red
  return '0 0 14px 1px rgba(127,29,29,0.80)';                    // dark red
}

// Shift a hex color by an additive RGB offset (positive = lighten, negative = darken).
function shiftHex(hex: string, delta: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(hex.slice(1, 3), 16) + delta);
  const g = clamp(parseInt(hex.slice(3, 5), 16) + delta);
  const b = clamp(parseInt(hex.slice(5, 7), 16) + delta);
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function getHeroStat(stats: PlayerStats): { key: string; value: number } | null {
  let best: { key: string; value: number } | null = null;
  for (const key of STAT_KEYS) {
    if (!best || stats[key] > best.value) {
      best = { key, value: stats[key] };
    }
  }
  return best && best.value >= 90 ? best : null;
}

// ─── Props ───

export interface RetroPlayerCardProps {
  player: Player;
  clubId?: string;
  clubName?: string;
  clubColors?: { primary: string; secondary: string };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  /** Achievement stamps to display on gold cards */
  stamps?: string[];
  /** Recent transfers for scout summary context */
  recentTransfers?: TransferRecord[];
  /** Disable the flip interaction */
  disableFlip?: boolean;
  /** Whether this player is the team captain */
  isCaptain?: boolean;
}

export function RetroPlayerCard({
  player,
  clubId,
  clubName,
  clubColors,
  size = 'md',
  animated = false,
  stamps = [],
  recentTransfers,
  disableFlip = false,
  isCaptain = false,
}: RetroPlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number } | null>(null);
  const [metaScale, setMetaScale] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const metaWrapRef = useRef<HTMLDivElement>(null);
  const metaInnerRef = useRef<HTMLDivElement>(null);

  const isGold = player.overall >= 80;
  const isShimmerGold = player.overall >= 86;
  const futureStar = getFutureStarTier(player);
  const overallColor = getOverallColor(player.overall, player.age);
  const borderColor = getCardBorderColor(player.overall, player.age);
  const bgGradient = getCardBgGradient(player.overall, player.age);
  const foilStampColor = getFoilStampColor(player.overall, player.age);
  // Top stat only — we highlight a single elite stat per card.
  const heroStat = getHeroStat(player.stats);
  const heroStatElite = heroStat !== null && heroStat.value >= 95;
  const formShadow = getFormDropShadow(player.form ?? 0);
  const serialNumber = getSerialNumber(player.id);
  const trophies = player.trophiesWon || [];
  const summaryParts = size !== 'sm' ? generateScoutSummaryParts(player, { recentTransfers }) : null;

  // ─── Bottom-right corner ornament ───
  // Highest tier wins: legend/icon → 👑, starboy/future star → ✨, gold → star,
  // silver → diamond, else → circle. The corner emoji replaces the SVG shape
  // when it's set, so the bottom-right ornament always reflects the top tier.
  const cornerOverlay =
    trophies.length >= 8
      ? 'LEGEND'
      : player.overall >= 90
      ? 'ICON'
      : futureStar === 'starboy'
      ? 'STARBOY'
      : futureStar === 'future-star'
      ? 'FUTURE STAR'
      : null;
  const cornerEmoji: string | null =
    cornerOverlay === 'LEGEND' || cornerOverlay === 'ICON'
      ? '👑'
      : cornerOverlay === 'STARBOY' || cornerOverlay === 'FUTURE STAR'
      ? '✨'
      : null;
  // Tier-to-shape: gold → star, silver → diamond, bronze + below → circle.
  // Bronze deliberately falls through to the circle so any non-silver/gold
  // card reads as the "basic" shape.
  const cornerShape: 'circle' | 'diamond' | 'star' =
    player.overall >= 80
      ? 'star'
      : player.overall >= 75
      ? 'diamond'
      : 'circle';

  const sizeClasses: Record<string, string> = {
    sm: 'plm-w-40 plm-h-56',
    md: 'plm-w-52 plm-h-72',
    lg: 'plm-w-64 plm-h-[22rem]',
    xl: 'plm-w-[21rem] plm-h-[31rem]',
  };

  const fontSizes: Record<string, Record<string, string>> = {
    sm: { ovr: 'plm-text-2xl', name: 'plm-text-xs', stat: 'plm-text-[9px]', pos: 'plm-text-[8px]', emoji: 'plm-text-3xl' },
    md: { ovr: 'plm-text-3xl', name: 'plm-text-sm', stat: 'plm-text-[10px]', pos: 'plm-text-[9px]', emoji: 'plm-text-4xl' },
    lg: { ovr: 'plm-text-4xl', name: 'plm-text-base', stat: 'plm-text-xs', pos: 'plm-text-[10px]', emoji: 'plm-text-5xl' },
    xl: { ovr: 'plm-text-5xl', name: 'plm-text-xl', stat: 'plm-text-sm', pos: 'plm-text-xs', emoji: 'plm-text-7xl' },
  };

  const fs = fontSizes[size];

  // Emoji sizing — 25% bigger than the default Tailwind text-*xl ramp,
  // with a further 15% bump on top so the face stays the visual anchor as
  // crests grow alongside it. The box height is tight against the glyph so
  // the bio paragraph below has more breathing room.
  const emojiFontPx: Record<string, number> = { sm: 44, md: 52, lg: 69, xl: 104 };
  const emojiBoxPx: Record<string, number> = { sm: 50, md: 66, lg: 86, xl: 116 };

  // Reserved vertical space at the bottom of the card so the bio centers
  // above the tallest bottom element (ICON/LEGEND text or corner shape).
  const bottomReservePx: Record<string, number> = { sm: 18, md: 24, lg: 26, xl: 30 };

  // ─── Foil glare effect (gold cards only) ───
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isGold || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePos({ x, y });
  }, [isGold]);

  const handleMouseLeave = useCallback(() => {
    setGlarePos(null);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isGold || !cardRef.current) return;
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setGlarePos({ x, y });
  }, [isGold]);

  const handleFlip = useCallback(() => {
    if (disableFlip) return;
    setIsFlipped((prev) => !prev);
  }, [disableFlip]);

  // Auto-scale the nationality · age · club meta line so it always fits on
  // one line, even for long country or club names.
  useLayoutEffect(() => {
    if (isFlipped) return;
    const wrap = metaWrapRef.current;
    const inner = metaInnerRef.current;
    if (!wrap || !inner) return;
    // Measure natural content width without scaling.
    const natural = inner.scrollWidth;
    const avail = wrap.clientWidth;
    if (!natural || !avail) return;
    const next = natural > avail ? Math.max(0.55, avail / natural) : 1;
    setMetaScale((prev) => (Math.abs(prev - next) > 0.005 ? next : prev));
  }, [player.nationality, player.age, clubName, size, isFlipped]);

  // ─── Card back (just the clean game logo) ───
  if (isFlipped) {
    return (
      <div
        ref={cardRef}
        className={`${sizeClasses[size]} plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 plm-cursor-pointer plm-select-none`}
        style={{
          // Unified premium navy back across all tiers — same design the
          // gold cards used, now applied to bronze and silver too.
          background:
            'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)',
          border: `3px solid ${borderColor}`,
          animation: 'plm-card-flip 0.4s ease-out',
        }}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip(); } }}
        aria-label="Flip card back to front"
      >
        {/* Decorative border */}
        <div
          className="plm-absolute plm-inset-3 plm-border-2 plm-rounded-lg plm-pointer-events-none"
          style={{ borderColor: borderColor + '40' }}
        />

        {/* EPL Manager logo — clean, centered */}
        <div className="plm-flex plm-flex-col plm-items-center plm-justify-center plm-h-full plm-gap-3">
          <img
            src="/epl_manager_logo.webp"
            alt="EPL Manager"
            className={`plm-object-contain plm-opacity-90 ${
              size === 'sm' ? 'plm-w-16 plm-h-16' : size === 'xl' ? 'plm-w-36 plm-h-36' : 'plm-w-24 plm-h-24'
            }`}
          />
          <span
            className={`${fs.pos} plm-font-display plm-font-bold plm-uppercase plm-tracking-widest plm-opacity-50`}
            style={{ color: overallColor }}
          >
            Premier League Manager
          </span>

          {/* Trophy stickers on card back — one per trophy won with user's club */}
          {trophies.length > 0 && (
            <div className="plm-flex plm-flex-col plm-items-center plm-gap-2 plm-px-3 plm-mt-2">
              <span
                className={`${fs.pos} plm-font-display plm-font-bold plm-uppercase plm-tracking-widest`}
                style={{ color: overallColor, opacity: 0.8 }}
              >
                Honours · {trophies.length}
              </span>
              <div className="plm-flex plm-flex-wrap plm-justify-center plm-gap-1.5 plm-max-w-full">
                {trophies.slice(0, 20).map((t, i) => (
                  <span
                    key={i}
                    title={`Season ${t.season} ${t.type === 'league' ? 'Premier League' : 'FA Cup'}`}
                    style={{
                      fontSize: size === 'xl' ? 22 : size === 'lg' ? 18 : size === 'md' ? 16 : 14,
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                    }}
                  >
                    {t.type === 'league' ? '🏆' : '🏅'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Subtle pattern */}
        <div
          className="plm-absolute plm-inset-0 plm-pointer-events-none plm-opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${overallColor} 10px, ${overallColor} 11px)`,
          }}
        />
      </div>
    );
  }

  // ─── Card front ───
  return (
    <div
      ref={cardRef}
      className={`${sizeClasses[size]} plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 plm-flex plm-flex-col ${animated ? 'plm-animate-card-flip' : ''} ${!disableFlip ? 'plm-cursor-pointer' : ''} plm-select-none ${isShimmerGold ? 'plm-animate-border-shimmer' : ''}`}
      style={{
        background: bgGradient,
        border: `3px solid ${borderColor}`,
        boxShadow: formShadow
          ? `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1), ${formShadow}`
          : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setGlarePos(null)}
      onClick={handleFlip}
      role={disableFlip ? undefined : 'button'}
      tabIndex={disableFlip ? undefined : 0}
      onKeyDown={disableFlip ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip(); } }}
      aria-label={disableFlip ? undefined : `${player.name} card — tap to flip`}
    >
      {/* ─── Background crest / flag layout ─────────────────────────────
          • Standard cards (<83): a single club crest centered behind the emoji.
          • Elite cards (83+): national flag on the left + club crest slightly
            right of center, both at the same height. Crest sits ahead of the
            flag on the z-axis. */}
      {clubId && player.overall < 83 && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1] plm-overflow-hidden">
          <img
            src={getClubLogoUrl(clubId)}
            alt=""
            className="plm-absolute plm-opacity-[0.18]"
            style={{
              width: '63%',
              height: 'auto',
              top: '10%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            aria-hidden="true"
          />
        </div>
      )}

      {player.overall >= 83 && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1] plm-overflow-hidden">
          <img
            src={getNationalityFlagUrl(player.nationality)}
            alt=""
            className="plm-absolute plm-opacity-[0.14]"
            style={{
              width: '48%',
              height: 'auto',
              top: '10%',
              left: '3%',
            }}
            aria-hidden="true"
          />
        </div>
      )}

      {player.overall >= 83 && clubId && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[2] plm-overflow-hidden">
          <img
            src={getClubLogoUrl(clubId)}
            alt=""
            className="plm-absolute plm-opacity-[0.2]"
            style={{
              width: '51%',
              height: 'auto',
              top: '10%',
              left: '49%',
            }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* ─── Foil glare overlay (gold cards) ─── */}
      {isGold && glarePos && (
        <div
          className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-20 plm-transition-opacity plm-duration-150"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.45) 0%, rgba(255,215,0,0.15) 30%, transparent 60%)`,
          }}
        />
      )}

      {/* Shimmer sweep overlay for 80+ cards */}
      {player.overall >= 80 && (
        <div className="plm-absolute plm-inset-0 plm-overflow-hidden plm-pointer-events-none plm-z-10">
          <div
            className="plm-absolute plm-top-0 plm-h-full plm-w-1/3 plm-animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            }}
          />
        </div>
      )}

      {/* ─── Sparkle overlay for any future star (u21 75+) or elite (90+) ─── */}
      {(futureStar !== null || player.overall >= 90) && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[3] plm-overflow-hidden">
          {[...Array(player.overall >= 90 ? 9 : 6)].map((_, i) => (
            <div
              key={i}
              className="plm-absolute plm-animate-sparkle-pulse"
              style={{
                left: `${10 + i * 10}%`,
                top: `${8 + (i % 4) * 22}%`,
                animationDelay: `${i * 0.18}s`,
                fontSize: size === 'xl' ? (player.overall >= 90 ? 16 : 14) : (player.overall >= 90 ? 11 : 9),
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      {/* ─── Hero stat emoji sticker — centered top, clear of OVR and flag ─── */}
      {heroStat && (isGold || futureStar) && size !== 'sm' && (
        <div
          className={`plm-absolute plm-z-[15] plm-flex plm-items-center plm-justify-center plm-rounded-full plm-shadow-md ${heroStatElite ? 'plm-animate-stat-glow' : ''}`}
          style={{
            top: size === 'xl' ? 10 : 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: size === 'xl' ? 32 : size === 'lg' ? 26 : 22,
            height: size === 'xl' ? 32 : size === 'lg' ? 26 : 22,
            background: 'rgba(255,255,255,0.92)',
            border: `1.5px solid ${heroStatElite ? ELITE_STAT_COLOR : borderColor}`,
            boxShadow: heroStatElite ? undefined : '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          <span style={{ fontSize: size === 'xl' ? 16 : size === 'lg' ? 13 : 11 }}>
            {STAT_EMOJI[heroStat.key] || '⭐'}
          </span>
        </div>
      )}

      {/* Top section: OVR + Position + Flag */}
      <div className="plm-flex plm-justify-between plm-items-start plm-px-2.5 plm-pt-1 plm-relative plm-z-[5]">
        <div className="plm-text-center">
          <div
            key={`ovr-${player.overall}`}
            className={`${fs.ovr} plm-font-display plm-font-black plm-leading-none ${player.overall >= 85 ? 'plm-animate-stamp-in' : ''}`}
            style={{ color: overallColor, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
          >
            {player.overall}
          </div>
          <div
            className={`${fs.pos} plm-font-bold plm-uppercase plm-tracking-wider plm-mt-0.5`}
            style={{ color: borderColor }}
          >
            {player.position}
          </div>
          {/* Injury bandage */}
          {player.injured && (
            <div className="plm-text-[8px] plm-mt-0.5" title={`Injured: ${player.injuryWeeks}m`}>🩹</div>
          )}
          {/* Captain armband C */}
          {isCaptain && (
            <div
              className="plm-text-[8px] plm-font-black plm-mt-0.5 plm-leading-none"
              style={{ color: '#D97706' }}
              title="Captain"
            >
              (C)
            </div>
          )}
        </div>
        <div className="plm-text-right plm-mt-0.5">
          <img
            src={getNationalityFlagUrl(player.nationality)}
            alt={getNationalityLabel(player.nationality)}
            className={`plm-inline-block plm-rounded-sm plm-object-cover ${
              size === 'sm' ? 'plm-w-5 plm-h-3.5' : size === 'xl' ? 'plm-w-8 plm-h-6' : 'plm-w-6 plm-h-4'
            }`}
          />
          {/* Homegrown wax seal — tucked under the flag */}
          {player.homegrown && size !== 'sm' && (
            <div className="plm-flex plm-justify-end plm-mt-0.5">
              <div
                className="plm-flex plm-items-center plm-justify-center plm-rounded-full plm-font-black plm-text-white"
                style={{
                  width: size === 'xl' ? 22 : 16,
                  height: size === 'xl' ? 22 : 16,
                  background: 'radial-gradient(circle at 40% 40%, #dc2626, #7f1d1d)',
                  border: '1.5px solid #991b1b',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  fontSize: size === 'xl' ? 9 : 7,
                }}
                title="Homegrown"
              >
                HG
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Face emoji — fixed-height container so the name plate below never
          drifts up into the emoji glyph's descent. Sized 25% larger than the
          default Tailwind text-ramp so the emoji reads as the visual anchor. */}
      <div
        className="plm-flex plm-justify-center plm-items-end plm-relative plm-z-[5] plm-flex-shrink-0"
        style={{ height: emojiBoxPx[size] }}
      >
        <div
          className="plm-leading-none"
          style={{
            fontSize: emojiFontPx[size],
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
          }}
        >
          {getPlayerEmoji(player.id)}
        </div>
      </div>

      {/* Name plate — subtle linear gradient (darker edges → brighter center)
          with inner shadow for an embossed feel. */}
      {(() => {
        const baseName = clubColors?.primary || borderColor;
        const nameEdge = shiftHex(baseName, -28);
        const nameCenter = shiftHex(baseName, 18);
        return (
          <div
            className="plm-mx-2.5 plm-py-0.5 plm-rounded plm-text-center plm-relative plm-z-[5] plm-flex-shrink-0"
            style={{
              background: `linear-gradient(to right, ${nameEdge} 0%, ${nameCenter} 50%, ${nameEdge} 100%)`,
              borderBottom: `2px solid ${clubColors?.secondary || overallColor}`,
              boxShadow:
                'inset 0 1px 2px rgba(0,0,0,0.35), inset 0 -1px 2px rgba(0,0,0,0.22)',
            }}
          >
            <div
              key={`name-${player.id}`}
              className={`${fs.name} plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-1 plm-animate-name-write`}
              style={{
                color: isLightColor(baseName) ? '#1A1A1A' : '#FFFFFF',
                textShadow: isLightColor(baseName)
                  ? '0 1px 0 rgba(255,255,255,0.4)'
                  : '0 1px 1px rgba(0,0,0,0.45)',
              }}
            >
              {player.name}{isCaptain ? ' ©' : ''}
            </div>
          </div>
        );
      })()}

      {/* Editorial meta line: nationality · age · club — foil-stamped metallic.
          Content is auto-scaled via `metaScale` so long country/club names
          always fit on one line. */}
      <div
        ref={metaWrapRef}
        className="plm-mt-0.5 plm-px-3 plm-relative plm-z-[5] plm-flex-shrink-0 plm-overflow-hidden"
      >
        <div
          ref={metaInnerRef}
          className="plm-flex plm-justify-center plm-items-center plm-whitespace-nowrap"
          style={{
            columnGap: size === 'xl' ? 14 : size === 'lg' ? 10 : 8,
            transform: metaScale < 1 ? `scale(${metaScale})` : undefined,
            transformOrigin: 'center',
          }}
        >
          <span
            className={`${fs.pos} plm-uppercase plm-font-semibold plm-whitespace-nowrap`}
            style={{ color: foilStampColor, letterSpacing: '0.18em' }}
          >
            {getNationalityLabel(player.nationality)}
          </span>
          <span
            aria-hidden="true"
            className="plm-inline-block plm-rounded-full"
            style={{
              width: 3,
              height: 3,
              backgroundColor: foilStampColor,
              opacity: 0.7,
              flexShrink: 0,
            }}
          />
          <span
            className={`${fs.pos} plm-uppercase plm-font-semibold plm-whitespace-nowrap`}
            style={{ color: foilStampColor, letterSpacing: '0.18em' }}
          >
            Age {player.age}
          </span>
          {clubName && (
            <>
              <span
                aria-hidden="true"
                className="plm-inline-block plm-rounded-full"
                style={{
                  width: 3,
                  height: 3,
                  backgroundColor: foilStampColor,
                  opacity: 0.7,
                  flexShrink: 0,
                }}
              />
              <span
                className={`${fs.pos} plm-uppercase plm-font-semibold plm-whitespace-nowrap`}
                style={{ color: foilStampColor, letterSpacing: '0.18em' }}
              >
                {shortenClubName(clubName)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stats grid — 6 columns, label over value, tabular bold numbers.
          Only the single top stat (≥90) gets the dark-magenta elite accent. */}
      <div className="plm-mx-2.5 plm-mt-0.5 plm-grid plm-grid-cols-6 plm-gap-x-1 plm-relative plm-z-[5]">
        {STAT_KEYS.map((stat) => {
          const value = player.stats[stat];
          const isElite =
            heroStat?.key === stat && value >= ELITE_STAT_THRESHOLD;
          return (
            <div key={stat} className="plm-flex plm-flex-col plm-items-center plm-justify-center">
              <span
                className={`${fs.stat} plm-font-semibold plm-uppercase plm-leading-none`}
                style={{
                  color: isElite ? ELITE_STAT_COLOR : borderColor,
                  letterSpacing: '0.1em',
                  opacity: isElite ? 1 : 0.85,
                }}
              >
                {stat}
              </span>
              <span
                className={`${fs.stat} plm-font-black plm-tabular-nums plm-leading-none plm-mt-0.5`}
                style={{
                  color: isElite ? ELITE_STAT_COLOR : '#1A1A1A',
                  textShadow: isElite ? '0 0 6px rgba(157,23,77,0.35)' : undefined,
                  fontSize: '115%',
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bio paragraph — centered in the space between the stats row and the
          top of the tallest bottom element (reserved via paddingBottom). */}
      {size !== 'sm' && summaryParts ? (
        <div
          className="plm-flex-1 plm-flex plm-items-center plm-justify-center plm-px-2.5 plm-relative plm-z-[5] plm-min-h-0"
          style={{ paddingBottom: bottomReservePx[size] }}
        >
          <p
            className={`${
              size === 'xl' ? 'plm-text-xs' : size === 'lg' ? 'plm-text-[10px]' : 'plm-text-[9px]'
            } plm-italic plm-leading-snug plm-text-center`}
            style={{ color: '#2B2620' }}
          >
            {summaryParts.bio}
          </p>
        </div>
      ) : (
        // Still consume the flex slot so the bottom bar hugs the card bottom.
        <div className="plm-flex-1" />
      )}

      {/* ─── Achievement stamps (gold cards) ─── */}
      {isGold && stamps.length > 0 && (
        <div className="plm-absolute plm-top-1 plm-left-1 plm-z-[15] plm-flex plm-flex-col plm-gap-0.5">
          {stamps.slice(0, 3).map((stamp, i) => (
            <div
              key={i}
              className="plm-flex plm-items-center plm-justify-center plm-rounded-full plm-shadow-sm"
              style={{
                width: size === 'xl' ? 28 : size === 'lg' ? 24 : 20,
                height: size === 'xl' ? 28 : size === 'lg' ? 24 : 20,
                background: 'radial-gradient(circle, #FFD700 0%, #B8860B 100%)',
                border: '1.5px solid #8B6914',
                boxShadow: '0 0 4px rgba(255,215,0,0.4)',
              }}
              title={stamp}
            >
              <span style={{ fontSize: size === 'xl' ? 14 : size === 'lg' ? 12 : 10 }}>
                {stamp === 'Player of the Year' ? '🏆' :
                 stamp === 'Record Signing' ? '💰' :
                 stamp === 'Golden Boot' ? '👟' :
                 stamp === 'Clean Sheet King' ? '🧤' : '⭐'}
              </span>
            </div>
          ))}
        </div>
      )}


      {/* ─── Serial number bottom-left (metallic foil stamp) ─── */}
      {size !== 'sm' && (
        <div
          key={`serial-${player.id}`}
          className="plm-absolute plm-bottom-1 plm-left-2 plm-z-[5] plm-animate-stamp-in"
        >
          <span
            className="plm-font-mono plm-font-bold"
            style={{ fontSize: size === 'xl' ? 9 : 7, color: foilStampColor }}
          >
            {serialNumber}
          </span>
        </div>
      )}

      {/* ─── Centered achievement label at the bottom of the card ─── */}
      {cornerOverlay && size !== 'sm' && (
        <div
          className="plm-absolute plm-bottom-1 plm-left-1/2 plm-z-[6] plm-pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <span
            className="plm-font-display plm-font-black plm-uppercase plm-whitespace-nowrap"
            style={{
              fontSize: size === 'xl' ? 12 : size === 'lg' ? 11 : 10,
              color: '#DC2626',
              letterSpacing: '0.14em',
              WebkitTextStroke: '0.6px #DC2626',
              textShadow:
                '0 0 4px rgba(255,255,255,0.9), 0 1px 1px rgba(0,0,0,0.35)',
            }}
          >
            {cornerOverlay}
          </span>
        </div>
      )}

      {/* ─── Bottom-right corner ornament ───
          STARBOY/FUTURE STAR → ✨, LEGEND/ICON → 👑, otherwise the tier shape. */}
      <div className="plm-absolute plm-bottom-1 plm-right-1.5 plm-z-[5] plm-leading-none">
        {cornerEmoji ? (
          <span
            className={cornerEmoji === '✨' ? 'plm-animate-twinkle-star plm-inline-block' : 'plm-inline-block'}
            style={{
              fontSize: size === 'sm' ? 14 : size === 'xl' ? 22 : 18,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
            }}
            aria-hidden="true"
          >
            {cornerEmoji}
          </span>
        ) : (
          <CornerShape
            shape={cornerShape}
            color={overallColor}
            borderColor={borderColor}
            size={size === 'sm' ? 16 : 20}
          />
        )}
      </div>
    </div>
  );
}

function CornerShape({
  shape,
  color,
  borderColor,
  size,
}: {
  shape: 'circle' | 'diamond' | 'star';
  color: string;
  borderColor: string;
  size: number;
}) {
  if (shape === 'circle') {
    return (
      <div className="plm-opacity-30">
        <svg width={size} height={size} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" fill={borderColor} />
        </svg>
      </div>
    );
  }
  if (shape === 'diamond') {
    return (
      <div className="plm-opacity-40">
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2 L22 12 L12 22 L2 12 Z" fill={borderColor} />
        </svg>
      </div>
    );
  }
  // gold star
  return (
    <div className="plm-opacity-60">
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
  );
}
