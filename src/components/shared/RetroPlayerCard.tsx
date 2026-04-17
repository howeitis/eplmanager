import { useState, useRef, useCallback } from 'react';
import type { Player, PlayerStats, TransferRecord } from '../../types/entities';
import { getNationalityFlagUrl, getNationalityLabel, getClubLogoUrl } from '../../data/assets';
import { generateScoutSummary } from '../../engine/scoutSummary';

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
function getSerialNumber(id: string, overall: number): string {
  const h = hashPlayerId(id);
  // Total print run varies by rarity: commons have large print runs, gold smaller
  const printRun = overall >= 86 ? 1000 : overall >= 80 ? 2500 : overall >= 75 ? 5000 : 8500;
  const serial = (h % printRun) + 1;
  return `${String(serial).padStart(4, '0')}/${printRun}`;
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
  const isOnFire = (player.form ?? 0) >= 5;
  const overallColor = getOverallColor(player.overall, player.age);
  const borderColor = getCardBorderColor(player.overall, player.age);
  const bgGradient = getCardBgGradient(player.overall, player.age);
  const heroStat = (isGold || futureStar) ? getHeroStat(player.stats) : null;
  const serialNumber = getSerialNumber(player.id, player.overall);
  const trophies = player.trophiesWon || [];

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
      className={`${sizeClasses[size]} plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 ${animated ? 'plm-animate-card-flip' : ''} ${!disableFlip ? 'plm-cursor-pointer' : ''} plm-select-none ${isShimmerGold ? 'plm-animate-border-shimmer' : ''} ${isOnFire ? 'plm-animate-fire-glow' : ''}`}
      style={{
        background: bgGradient,
        border: `3px solid ${borderColor}`,
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
            className="plm-absolute plm-opacity-[0.08]"
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
            className="plm-absolute plm-opacity-[0.06] plm-blur-[1px]"
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

      {/* ─── Sparkle overlay for wonderkid (u21 80+) ─── */}
      {futureStar === 'wonderkid' && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[3] plm-overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="plm-absolute plm-animate-sparkle-pulse"
              style={{
                left: `${15 + i * 14}%`,
                top: `${10 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.2}s`,
                fontSize: size === 'xl' ? 14 : 9,
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
          className="plm-absolute plm-z-[15] plm-flex plm-items-center plm-justify-center plm-rounded-full plm-shadow-md"
          style={{
            top: size === 'xl' ? 10 : 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: size === 'xl' ? 32 : size === 'lg' ? 26 : 22,
            height: size === 'xl' ? 32 : size === 'lg' ? 26 : 22,
            background: 'rgba(255,255,255,0.92)',
            border: `1.5px solid ${borderColor}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
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
            className={`${fs.ovr} plm-font-display plm-font-black plm-leading-none`}
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
          className={`${fs.name} plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-1`}
          style={{ color: isLightColor(clubColors?.primary || borderColor) ? '#1A1A1A' : '#FFFFFF' }}
        >
          {player.name}{isCaptain ? ' ©' : ''}
        </div>
      </div>

      {/* Nationality + Age */}
      <div className="plm-flex plm-justify-center plm-items-center plm-gap-1 plm-mt-0.5 plm-relative plm-z-[5]">
        <span className={`${fs.pos} plm-uppercase plm-tracking-wider plm-font-semibold`} style={{ color: borderColor }}>
          {getNationalityLabel(player.nationality)}
        </span>
        <span style={{ color: borderColor }}>&middot;</span>
        <span className={`${fs.pos} plm-uppercase plm-tracking-wider plm-font-semibold`} style={{ color: borderColor }}>
          Age {player.age}
        </span>
      </div>

      {/* Full club name */}
      {clubName && (
        <div className="plm-flex plm-justify-center plm-px-2 plm-mt-0.5 plm-relative plm-z-[5]">
          <span
            className={`${fs.pos} plm-uppercase plm-tracking-wider plm-font-semibold plm-text-center plm-leading-tight`}
            style={{ color: borderColor }}
          >
            {clubName}
          </span>
        </div>
      )}

      {/* Stats grid */}
      <div className="plm-mx-2.5 plm-mt-0.5 plm-grid plm-grid-cols-3 plm-gap-x-1 plm-gap-y-0 plm-relative plm-z-[5]">
        {STAT_KEYS.map((stat) => {
          const value = player.stats[stat];
          const isHero = heroStat?.key === stat && isGold;
          return (
            <div key={stat} className="plm-flex plm-items-center plm-justify-between plm-px-1">
              <span
                className={`${fs.stat} plm-font-bold plm-uppercase`}
                style={{ color: isHero ? '#DC2626' : borderColor }}
              >
                {stat}
              </span>
              <span
                className={`${fs.stat} plm-font-black plm-tabular-nums`}
                style={{
                  color: isHero ? '#DC2626' : '#1A1A1A',
                  textShadow: isHero ? '0 0 6px rgba(220,38,38,0.4)' : undefined,
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scout summary bio — all card tiers, md+ sizes, fills remaining space */}
      {size !== 'sm' && (
        <div
          className="plm-absolute plm-left-2.5 plm-right-2.5 plm-z-[5]"
          style={{ bottom: size === 'xl' ? 22 : 18 }}
        >
          <div
            className="plm-rounded plm-px-1.5 plm-py-1"
            style={{
              background: 'rgba(255, 252, 245, 0.85)',
              border: `1px solid ${borderColor}33`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
          >
            <p
              className={`${
                size === 'xl' ? 'plm-text-xs' : size === 'lg' ? 'plm-text-[10px]' : 'plm-text-[9px]'
              } plm-italic plm-leading-snug plm-text-center`}
              style={{ color: '#2B2620' }}
            >
              {generateScoutSummary(player, { recentTransfers })}
            </p>
          </div>
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


      {/* ─── Homegrown wax seal on club crest area ─── */}
      {player.homegrown && clubId && size !== 'sm' && (
        <div
          className="plm-absolute plm-z-[16]"
          style={{
            bottom: size === 'xl' ? 52 : size === 'lg' ? 42 : 34,
            right: size === 'xl' ? 10 : 8,
          }}
        >
          <div
            className="plm-flex plm-items-center plm-justify-center plm-rounded-full plm-font-black plm-text-white"
            style={{
              width: size === 'xl' ? 26 : size === 'lg' ? 22 : 18,
              height: size === 'xl' ? 26 : size === 'lg' ? 22 : 18,
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

      {/* ─── Serial number bottom-left ─── */}
      {size !== 'sm' && (
        <div
          className="plm-absolute plm-bottom-1 plm-left-2 plm-z-[5]"
        >
          <span
            className="plm-font-mono plm-opacity-50"
            style={{ fontSize: size === 'xl' ? 9 : 7, color: borderColor }}
          >
            {serialNumber}
          </span>
        </div>
      )}

      {/* Corner star decoration */}
      <div className="plm-absolute plm-bottom-1 plm-right-1.5 plm-opacity-20 plm-z-[5]">
        <svg width={size === 'sm' ? 16 : 20} height={size === 'sm' ? 16 : 20} viewBox="0 0 24 24" fill={borderColor}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>
  );
}
