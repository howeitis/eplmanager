import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import type { Player, PlayerStats, TransferRecord } from '@/types/entities';
import { getNationalityFlagUrl, getNationalityLabel, getClubLogoUrl, getNationalTeamLogoUrl, getBrandLogoUrl, getAssetBasePath } from '@/data/assets';
import { generateScoutSummaryParts } from '@/engine/scoutSummary';
import { getStatLabel } from '@/utils/statLabels';
import { getPlayerFaceUri } from '@/utils/avatarFace';
import { CLUBS } from '@/data/clubs';
import {
  cardTierFromOverall,
  getTierAccentColor,
  getTierBorderColor,
  getTierBgGradient,
  getTierFoilColor,
  isLightColor,
} from '@/utils/tierColors';
import { ShirtOverlay } from './ShirtOverlay';

const CLUB_BY_ID = new Map(CLUBS.map((c) => [c.id, c]));

function hashPlayerId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const STAT_KEYS: (keyof PlayerStats)[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];

// Emoji stickers that match each stat slot. Keys are storage names; the
// label rendered on the card is position-aware (getStatLabel) so a GK shows
// DIV/HAN/KIC/REF/MEN/POS while reusing the same six slots underneath.
const STAT_EMOJI_OUTFIELD: Record<string, string> = {
  ATK: '⚡',
  DEF: '🛡️',
  MOV: '💨',
  PWR: '💪',
  MEN: '🧠',
  SKL: '✨',
};
const STAT_EMOJI_GK: Record<string, string> = {
  ATK: '🪂', // Diving
  DEF: '🧤', // Handling
  MOV: '🦵', // Kicking
  PWR: '⚡', // Reflexes
  MEN: '🧠', // Mentality
  SKL: '🎯', // Position
};
function getStatEmoji(position: string, key: string): string {
  const table = position === 'GK' ? STAT_EMOJI_GK : STAT_EMOJI_OUTFIELD;
  return table[key] || '⭐';
}

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

// Tier color palette lives in src/utils/tierColors.ts so the player card and
// manager card stay aligned. cardTierFromOverall(overall, age) covers the u21
// 75–79 "future-star" mixed silver-gold case as well as the standard bands.

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
  /** Force the card to render its back face (used by InteractiveCard 3D mode) */
  forceFlipped?: boolean;
  /** Whether this player is the team captain */
  isCaptain?: boolean;
  /** Memorial variant — desaturates the card and adds a RETIRED banner.
   *  Used for the end-of-season retirement pack. */
  retired?: boolean;
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
  forceFlipped = false,
  isCaptain = false,
  retired = false,
}: RetroPlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(forceFlipped);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number } | null>(null);
  const [metaScale, setMetaScale] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const metaWrapRef = useRef<HTMLDivElement>(null);
  const metaInnerRef = useRef<HTMLDivElement>(null);

  const isGold = player.overall >= 80;
  const isShimmerGold = player.overall >= 86;
  const futureStar = getFutureStarTier(player);
  const cardTier = cardTierFromOverall(player.overall, player.age);
  const overallColor = getTierAccentColor(cardTier);
  const borderColor = getTierBorderColor(cardTier);
  const bgGradient = getTierBgGradient(cardTier);
  const foilStampColor = getTierFoilColor(cardTier);
  // Top stat only — we highlight a single elite stat per card.
  const heroStat = getHeroStat(player.stats);
  const heroStatElite = heroStat !== null && heroStat.value >= 95;
  const formShadow = getFormDropShadow(player.form ?? 0);
  const serialNumber = getSerialNumber(player.id);
  const trophies = player.trophiesWon || [];
  const goldenBoots = player.goldenBoots ?? [];
  const hatTricks = player.hatTricks ?? 0;
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
    sm: { ovr: 'plm-text-2xl', name: 'plm-text-xs', stat: 'plm-text-[8.5px]', pos: 'plm-text-[8px]', emoji: 'plm-text-3xl' },
    md: { ovr: 'plm-text-3xl', name: 'plm-text-sm', stat: 'plm-text-[10px]', pos: 'plm-text-[9px]', emoji: 'plm-text-4xl' },
    lg: { ovr: 'plm-text-4xl', name: 'plm-text-base', stat: 'plm-text-xs', pos: 'plm-text-[10px]', emoji: 'plm-text-5xl' },
    xl: { ovr: 'plm-text-5xl', name: 'plm-text-xl', stat: 'plm-text-sm', pos: 'plm-text-xs', emoji: 'plm-text-7xl' },
  };

  const fs = fontSizes[size];

  // Meta line (nationality · age · club) is denser than the bare position
  // label on sm cards — give it its own font-size + spacing so the line
  // doesn't have to auto-scale into illegibility.
  const metaPos = size === 'sm' ? 'plm-text-[7px]' : fs.pos;
  const metaLetterSpacing = size === 'sm' ? '0.12em' : '0.18em';
  const metaColumnGap =
    size === 'xl' ? 14 : size === 'lg' ? 10 : size === 'sm' ? 5 : 8;

  // Portrait box height — kept tight against the avatar so the bio paragraph
  // below has more breathing room.
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
            src={getBrandLogoUrl()}
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

          {/* Golden Boot stamps on card back */}
          {goldenBoots.length > 0 && (
            <div className="plm-flex plm-flex-col plm-items-center plm-gap-1.5 plm-px-3 plm-mt-2">
              <span
                className={`${fs.pos} plm-font-display plm-font-bold plm-uppercase plm-tracking-widest`}
                style={{ color: '#D97706', opacity: 0.9 }}
              >
                Golden Boot · {goldenBoots.length}
              </span>
              <div className="plm-flex plm-flex-wrap plm-justify-center plm-gap-1.5">
                {goldenBoots.map((season, i) => (
                  <span
                    key={i}
                    title={`Golden Boot — Season ${season}`}
                    style={{
                      fontSize: size === 'xl' ? 22 : size === 'lg' ? 18 : size === 'md' ? 16 : 14,
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                    }}
                  >
                    👟
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hat-trick stamps on card back — cumulative career count. */}
          {hatTricks > 0 && (
            <div className="plm-flex plm-flex-col plm-items-center plm-gap-1.5 plm-px-3 plm-mt-2">
              <span
                className={`${fs.pos} plm-font-display plm-font-bold plm-uppercase plm-tracking-widest`}
                style={{ color: '#C2410C', opacity: 0.9 }}
              >
                Hat-tricks · {hatTricks}
              </span>
              <div className="plm-flex plm-flex-wrap plm-justify-center plm-gap-1.5">
                {Array.from({ length: Math.min(hatTricks, 20) }).map((_, i) => (
                  <span
                    key={i}
                    title="Hat-trick (3+ goals in a single match)"
                    style={{
                      fontSize: size === 'xl' ? 22 : size === 'lg' ? 18 : size === 'md' ? 16 : 14,
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                    }}
                  >
                    🎩
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
  // Memorial mode: desaturate + soften the form glow. The RETIRED banner is
  // painted on top in the JSX block at the bottom of the card.
  const retiredFilter = retired ? 'grayscale(0.85) brightness(0.92) contrast(0.95)' : undefined;
  return (
    <div
      ref={cardRef}
      className={`${sizeClasses[size]} plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 plm-flex plm-flex-col ${animated ? 'plm-animate-card-flip' : ''} ${!disableFlip ? 'plm-cursor-pointer' : ''} plm-select-none ${!retired && isShimmerGold ? 'plm-animate-border-shimmer' : ''}`}
      style={{
        background: bgGradient,
        border: `3px solid ${borderColor}`,
        filter: retiredFilter,
        boxShadow: formShadow && !retired
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

      {player.overall >= 83 && (() => {
        // Prefer the national team crest when we have one; otherwise fall back
        // to the country flag.
        const teamLogo = getNationalTeamLogoUrl(player.nationality);
        const isCrest = teamLogo !== null;
        const src = teamLogo || getNationalityFlagUrl(player.nationality);
        if (!src) return null;
        return (
          <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1] plm-overflow-hidden">
            <img
              src={src}
              alt=""
              className={`plm-absolute ${isCrest ? 'plm-opacity-[0.18]' : 'plm-opacity-[0.14]'}`}
              style={{
                width: isCrest ? '42%' : '48%',
                height: 'auto',
                top: isCrest ? '8%' : '10%',
                left: isCrest ? '6%' : '3%',
                objectFit: 'contain',
              }}
              aria-hidden="true"
            />
          </div>
        );
      })()}

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

      {/* ─── Sparkle overlay for any future star (u21 75+) or 85+ rating ─── */}
      {(futureStar !== null || player.overall >= 85) && (
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
            {getStatEmoji(player.position, heroStat.key)}
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

      {/* Player portrait — DiceBear avataaars SVG seeded by player.id.
          Fixed-height container so the name plate below never drifts up. */}
      <div
        className="plm-flex plm-justify-center plm-items-end plm-relative plm-z-[5] plm-flex-shrink-0"
        style={{ height: emojiBoxPx[size] }}
      >
        {/* Inner box pinned to the avatar's natural size so the kit overlay
            SVG (which uses inset:0) covers the avatar bounds exactly, not the
            full flex column. Without this wrapper the SVG stretched to the
            card width and rendered the crest at full-card size. */}
        {(() => {
          const clubData = clubId ? CLUB_BY_ID.get(clubId) : undefined;
          // Kit may force a specific shirt base colour (e.g. Tottenham brand
          // is navy but the shirt is white) — fall back to the team primary.
          const shirtColor = clubData?.kit?.base ?? clubColors?.primary;
          const logoSrc = clubData?.logo
            ? `${getAssetBasePath()}/Premier League Clubs Logos/${clubData.logo}`
            : undefined;
          return (
            <div
              style={{
                position: 'relative',
                width: emojiBoxPx[size],
                height: emojiBoxPx[size],
              }}
            >
              <img
                src={getPlayerFaceUri(player.id, {
                  shirtColor,
                  age: player.age,
                  nationality: player.nationality,
                  trait: player.trait,
                })}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{
                  height: emojiBoxPx[size],
                  width: emojiBoxPx[size],
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                }}
              />
              {clubData?.kit && (
                <ShirtOverlay
                  kit={clubData.kit}
                  logoSrc={logoSrc}
                  sizePx={emojiBoxPx[size]}
                />
              )}
            </div>
          );
        })()}
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
            columnGap: metaColumnGap,
            transform: metaScale < 1 ? `scale(${metaScale})` : undefined,
            transformOrigin: 'center',
          }}
        >
          <span
            className={`${metaPos} plm-uppercase plm-font-semibold plm-whitespace-nowrap`}
            style={{ color: foilStampColor, letterSpacing: metaLetterSpacing }}
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
            className={`${metaPos} plm-uppercase plm-font-semibold plm-whitespace-nowrap`}
            style={{ color: foilStampColor, letterSpacing: metaLetterSpacing }}
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
                className={`${metaPos} plm-uppercase plm-font-semibold plm-whitespace-nowrap`}
                style={{ color: foilStampColor, letterSpacing: metaLetterSpacing }}
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
          const label = getStatLabel(player.position, stat);
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
                {label}
              </span>
              <span
                className={`${fs.stat} plm-font-black plm-tabular-nums plm-leading-none plm-mt-0.5`}
                style={{
                  color: isElite ? ELITE_STAT_COLOR : '#1A1A1A',
                  textShadow: isElite ? '0 0 6px rgba(157,23,77,0.35)' : undefined,
                  fontSize: size === 'sm' ? undefined : '115%',
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

      {/* ─── RETIRED memorial banner ───
          Diagonal sash across the upper-right corner. Painted outside the
          grayscale layer so the text stays readable on every tier. */}
      {retired && (
        <>
          <div
            className="plm-absolute plm-z-[18] plm-pointer-events-none"
            style={{
              top: size === 'xl' ? 22 : size === 'lg' ? 18 : 14,
              right: size === 'xl' ? -42 : size === 'lg' ? -34 : -26,
              transform: 'rotate(35deg)',
              transformOrigin: 'center',
              background:
                'linear-gradient(135deg, #1F2937 0%, #111827 50%, #1F2937 100%)',
              color: '#FBBF24',
              padding: size === 'xl' ? '4px 56px' : size === 'lg' ? '3px 44px' : '2px 32px',
              fontFamily: 'Playfair Display, serif',
              fontSize: size === 'xl' ? 14 : size === 'lg' ? 12 : 10,
              fontWeight: 900,
              letterSpacing: '0.22em',
              boxShadow:
                '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(251,191,36,0.35), inset 0 -1px 0 rgba(0,0,0,0.4)',
              borderTop: '1px solid rgba(251,191,36,0.4)',
              borderBottom: '1px solid rgba(0,0,0,0.4)',
            }}
            aria-hidden="true"
          >
            RETIRED
          </div>
          <div
            className="plm-absolute plm-z-[17] plm-inset-0 plm-pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 80px rgba(0,0,0,0.35)',
            }}
            aria-hidden="true"
          />
        </>
      )}
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
