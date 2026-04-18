import { useState, useRef, useCallback } from 'react';
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
function getFutureStarTier(player: Player): 'wonderkid' | 'star' | null {
  if (player.age > 21) return null;
  if (player.overall >= 80) return 'wonderkid';
  if (player.overall >= 75) return 'star';
  return null;
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

// Very subtle form-driven drop shadow — greens for hot, reds for cold.
// form is clamped to [-5, 5] by the engine.
function getFormDropShadow(form: number): string | null {
  if (form >= 4) return '0 0 14px 1px rgba(6,78,59,0.5)';       // dark green
  if (form === 3) return '0 0 12px 1px rgba(21,128,61,0.42)';    // mid green
  if (form === 2) return '0 0 10px 1px rgba(34,197,94,0.32)';    // green
  if (form === 1) return '0 0 8px 1px rgba(134,239,172,0.32)';   // light green
  if (form === 0) return null;                                   // neutral
  if (form === -1) return '0 0 8px 1px rgba(252,165,165,0.32)';  // light red
  if (form === -2) return '0 0 10px 1px rgba(239,68,68,0.32)';   // red
  if (form === -3) return '0 0 12px 1px rgba(220,38,38,0.42)';   // mid red
  return '0 0 14px 1px rgba(127,29,29,0.5)';                     // dark red
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
  const cardRef = useRef<HTMLDivElement>(null);

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

  // ─── Bottom-right corner shape ───
  // Wonderkid → twinkling star, gold (80+) → star, silver (65+) → diamond, else → circle.
  // Plus overlay text: 8+ trophies → LEGEND, 90+ overall → ICON, wonderkid → FUTURE STAR.
  const cornerShape: 'circle' | 'diamond' | 'star' | 'twinkling-star' =
    futureStar === 'wonderkid'
      ? 'twinkling-star'
      : player.overall >= 80
      ? 'star'
      : player.overall >= 65
      ? 'diamond'
      : 'circle';
  const cornerOverlay =
    trophies.length >= 8
      ? 'LEGEND'
      : player.overall >= 90
      ? 'ICON'
      : futureStar === 'wonderkid'
      ? 'FUTURE STAR'
      : null;

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

  // ─── Card back (just the clean game logo) ───
  if (isFlipped) {
    return (
      <div
        ref={cardRef}
        className={`${sizeClasses[size]} plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 plm-cursor-pointer plm-select-none`}
        style={{
          background: isGold
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)'
            : 'linear-gradient(135deg, #2d2a26 0%, #3d3a36 50%, #2d2a26 100%)',
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
      className={`${sizeClasses[size]} plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 ${animated ? 'plm-animate-card-flip' : ''} ${!disableFlip ? 'plm-cursor-pointer' : ''} plm-select-none ${isShimmerGold ? 'plm-animate-border-shimmer' : ''}`}
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
      {/* ─── Club crest watermark (ALL card tiers when clubId provided) ─── */}
      {clubId && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1] plm-overflow-hidden">
          <img
            src={getClubLogoUrl(clubId)}
            alt=""
            className="plm-absolute plm-opacity-[0.16]"
            style={{
              width: '50%',
              height: 'auto',
              bottom: '15%',
              right: '-5%',
            }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* ─── National flag watermark (gold cards only) ─── */}
      {isGold && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1] plm-overflow-hidden">
          <img
            src={getNationalityFlagUrl(player.nationality)}
            alt=""
            className="plm-absolute plm-opacity-[0.14]"
            style={{
              width: '80%',
              height: 'auto',
              top: '10%',
              left: '10%',
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

      {/* ─── Sparkle overlay for wonderkid (u21 80+) or elite (90+) ─── */}
      {(futureStar === 'wonderkid' || player.overall >= 90) && (
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
      <div className="plm-flex plm-justify-between plm-items-start plm-px-2.5 plm-pt-2 plm-relative plm-z-[5]">
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
          {/* WK badge under flag */}
          {futureStar === 'wonderkid' && size !== 'sm' && (
            <div className="plm-flex plm-justify-end plm-mt-0.5">
              <div
                className="plm-flex plm-items-center plm-justify-center plm-rounded-full plm-text-white plm-font-black"
                style={{
                  width: size === 'xl' ? 22 : 16,
                  height: size === 'xl' ? 22 : 16,
                  background: 'radial-gradient(circle at 40% 40%, #FFD700, #FF8C00)',
                  border: '1.5px solid #D97706',
                  boxShadow: '0 0 6px rgba(255,165,0,0.7)',
                  fontSize: size === 'xl' ? 9 : 7,
                }}
                title="Wonderkid"
              >
                WK
              </div>
            </div>
          )}
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

      {/* Face emoji */}
      <div className="plm-flex plm-justify-center plm-relative plm-z-[5]">
        <div
          className={`${fs.emoji} plm-leading-none`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
        >
          {getPlayerEmoji(player.id)}
        </div>
      </div>

      {/* Name plate */}
      <div
        className="plm-mx-2.5 plm-py-1 plm-rounded plm-text-center plm-relative plm-z-[5]"
        style={{
          backgroundColor: clubColors?.primary || borderColor,
          borderBottom: `2px solid ${clubColors?.secondary || overallColor}`,
        }}
      >
        <div
          key={`name-${player.id}`}
          className={`${fs.name} plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-1 plm-animate-name-write`}
          style={{ color: isLightColor(clubColors?.primary || borderColor) ? '#1A1A1A' : '#FFFFFF' }}
        >
          {player.name}{isCaptain ? ' ©' : ''}
        </div>
      </div>

      {/* Editorial meta line: nationality · age · club — foil-stamped metallic */}
      <div
        className="plm-flex plm-justify-center plm-items-center plm-mt-1 plm-px-3 plm-relative plm-z-[5]"
        style={{ columnGap: size === 'xl' ? 14 : size === 'lg' ? 10 : 8 }}
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
              className={`${fs.pos} plm-uppercase plm-font-semibold plm-truncate`}
              style={{ color: foilStampColor, letterSpacing: '0.18em' }}
            >
              {clubName}
            </span>
          </>
        )}
      </div>

      {/* Stats grid — 6 columns, label over value, tabular bold numbers.
          Only the single top stat (≥90) gets the dark-magenta elite accent. */}
      <div className="plm-mx-2.5 plm-mt-1.5 plm-grid plm-grid-cols-6 plm-gap-x-1 plm-relative plm-z-[5]">
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

      {/* Bio paragraph — scout summary, no label */}
      {size !== 'sm' && summaryParts && (
        <div
          className="plm-absolute plm-left-2.5 plm-right-2.5 plm-z-[5]"
          style={{ bottom: size === 'xl' ? 22 : 18 }}
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


      {/* ─── Serial number bottom-left ─── */}
      {size !== 'sm' && (
        <div
          key={`serial-${player.id}`}
          className="plm-absolute plm-bottom-1 plm-left-2 plm-z-[5] plm-animate-stamp-in"
        >
          <span
            className="plm-font-mono plm-font-bold"
            style={{ fontSize: size === 'xl' ? 9 : 7, color: '#DC2626' }}
          >
            {serialNumber}
          </span>
        </div>
      )}

      {/* ─── Corner shape with achievement text overlaid on top ─── */}
      <div className="plm-absolute plm-bottom-1 plm-right-1.5 plm-z-[5]">
        <div className="plm-relative plm-flex plm-items-center plm-justify-center">
          <CornerShape
            shape={cornerShape}
            color={overallColor}
            borderColor={borderColor}
            size={
              cornerOverlay
                ? (size === 'xl' ? 46 : size === 'lg' ? 40 : size === 'md' ? 36 : 28)
                : (size === 'sm' ? 16 : 20)
            }
          />
          {cornerOverlay && (
            <span
              className="plm-absolute plm-inset-0 plm-flex plm-items-center plm-justify-center plm-font-display plm-font-black plm-uppercase plm-pointer-events-none"
              style={{
                fontSize: size === 'xl' ? 9 : size === 'lg' ? 8 : 7,
                color: '#DC2626',
                textShadow: '0 0 3px rgba(255,255,255,0.85), 0 0 1px rgba(255,255,255,1)',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              {cornerOverlay}
            </span>
          )}
        </div>
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
  shape: 'circle' | 'diamond' | 'star' | 'twinkling-star';
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
  if (shape === 'twinkling-star') {
    return (
      <div className="plm-animate-twinkle-star">
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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
