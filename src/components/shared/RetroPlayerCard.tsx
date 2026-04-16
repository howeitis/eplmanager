import { useState, useRef, useCallback } from 'react';
import type { Player, PlayerStats, TransferRecord } from '../../types/entities';
import { getNationalityFlagUrl, getNationalityLabel, getClubLogoUrl } from '../../data/assets';
import { generateScoutSummary } from '../../engine/scoutSummary';

// ─── Emoji pool ───

const PLAYER_EMOJIS: string[] = [
  '\u{1F468}\u{1F3FB}', '\u{1F468}\u{1F3FC}', '\u{1F468}\u{1F3FD}',
  '\u{1F468}\u{1F3FE}', '\u{1F468}\u{1F3FF}',
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B1}', '\u{1F468}\u{1F3FC}\u{200D}\u{1F9B1}',
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B1}', '\u{1F468}\u{1F3FE}\u{200D}\u{1F9B1}',
  '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B1}',
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B2}', '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B2}',
  '\u{1F468}\u{1F3FE}\u{200D}\u{1F9B2}', '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B2}',
  '\u{1F468}\u{1F3FB}\u{200D}\u{1F9B0}', '\u{1F468}\u{1F3FC}\u{200D}\u{1F9B0}',
  '\u{1F468}\u{1F3FD}\u{200D}\u{1F9B3}', '\u{1F468}\u{1F3FF}\u{200D}\u{1F9B3}',
  '\u{1F9D4}\u{1F3FB}', '\u{1F9D4}\u{1F3FD}', '\u{1F9D4}\u{1F3FE}', '\u{1F9D4}\u{1F3FF}',
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

// ─── Color helpers ───

function getOverallColor(overall: number): string {
  if (overall >= 85) return '#FFD700';
  if (overall >= 75) return '#C0C0C0';
  if (overall >= 65) return '#CD7F32';
  return '#8B7355';
}

function getCardBorderColor(overall: number): string {
  if (overall >= 85) return '#B8860B';
  if (overall >= 75) return '#808080';
  if (overall >= 65) return '#8B4513';
  return '#6B5B45';
}

function getCardBgGradient(overall: number): string {
  if (overall >= 85) return 'linear-gradient(135deg, #FFF8DC 0%, #FFD700 30%, #FFF8DC 50%, #FFD700 70%, #FFF8DC 100%)';
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

// ─── Signature generator ───

function generateSignaturePath(name: string): string {
  // Deterministic "cursive" SVG path based on name hash
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(h, 31) + name.charCodeAt(i)) | 0;
  }
  h = Math.abs(h);

  const segments: string[] = [];
  let x = 10;
  const y = 25;
  segments.push(`M ${x} ${y}`);

  for (let i = 0; i < 8; i++) {
    const dx = 18 + ((h >> (i * 3)) & 7) * 2;
    const dy = -12 + ((h >> (i * 2 + 1)) & 7) * 4;
    const cx = x + dx * 0.4;
    const cy = y + dy;
    x += dx;
    segments.push(`Q ${cx} ${cy} ${x} ${y + ((h >> (i + 5)) & 3) - 1}`);
  }

  return segments.join(' ');
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
}: RetroPlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isGold = player.overall >= 85;
  const overallColor = getOverallColor(player.overall);
  const borderColor = getCardBorderColor(player.overall);
  const bgGradient = getCardBgGradient(player.overall);
  const heroStat = isGold ? getHeroStat(player.stats) : null;

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

  // ─── Card back ───
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

        {/* EPL Manager logo */}
        <div className="plm-flex plm-flex-col plm-items-center plm-justify-center plm-h-full plm-gap-3">
          <img
            src="/epl_manager_logo.webp"
            alt="EPL Manager"
            className={`plm-object-contain plm-opacity-80 ${
              size === 'sm' ? 'plm-w-16 plm-h-16' : size === 'xl' ? 'plm-w-32 plm-h-32' : 'plm-w-24 plm-h-24'
            }`}
          />
          <span
            className={`${fs.pos} plm-font-display plm-font-bold plm-uppercase plm-tracking-widest plm-opacity-50`}
            style={{ color: overallColor }}
          >
            Premier League Manager
          </span>
        </div>

        {/* Scout Summary (on back of lg/xl cards) */}
        {(size === 'lg' || size === 'xl') && (
          <div className="plm-absolute plm-bottom-4 plm-left-4 plm-right-4">
            <p
              className={`${size === 'xl' ? 'plm-text-xs' : 'plm-text-[10px]'} plm-text-warm-400 plm-italic plm-leading-relaxed plm-text-center`}
            >
              {generateScoutSummary(player, { recentTransfers })}
            </p>
          </div>
        )}

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
      className={`${sizeClasses[size]} plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 ${animated ? 'plm-animate-card-flip' : ''} ${!disableFlip ? 'plm-cursor-pointer' : ''} plm-select-none`}
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
      {/* ─── Dynamic watermarks (gold cards) ─── */}
      {isGold && (
        <>
          {/* National flag watermark */}
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
          {/* Club crest watermark */}
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
        </>
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

      {/* Shimmer overlay for high-rated cards */}
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
        </div>
        <div className="plm-text-right plm-mt-0.5">
          <img
            src={getNationalityFlagUrl(player.nationality)}
            alt={getNationalityLabel(player.nationality)}
            className={`plm-inline-block plm-rounded-sm plm-object-cover ${
              size === 'sm' ? 'plm-w-5 plm-h-3.5' : size === 'xl' ? 'plm-w-8 plm-h-6' : 'plm-w-6 plm-h-4'
            }`}
          />
        </div>
      </div>

      {/* Face emoji */}
      <div className="plm-flex plm-justify-center plm-mt-1 plm-relative plm-z-[5]">
        <div
          className={`${fs.emoji} plm-leading-none`}
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
        >
          {getPlayerEmoji(player.id)}
        </div>
      </div>

      {/* ─── Hero stat badge (90+ stat on gold cards) ─── */}
      {heroStat && isGold && (size === 'lg' || size === 'xl' || size === 'md') && (
        <div
          className="plm-absolute plm-z-[15] plm-flex plm-items-center plm-gap-0.5 plm-rounded-full plm-px-1.5 plm-py-0.5 plm-shadow-md"
          style={{
            top: size === 'xl' ? '38%' : '36%',
            right: size === 'xl' ? '8%' : '6%',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            border: '1.5px solid #B8860B',
            boxShadow: '0 0 8px rgba(255,215,0,0.5)',
          }}
        >
          <span className={`${fs.stat} plm-font-black plm-text-white`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {heroStat.key}
          </span>
          <span className={`${fs.stat} plm-font-black plm-text-white`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {heroStat.value}
          </span>
        </div>
      )}

      {/* Name plate */}
      <div
        className="plm-mx-2.5 plm-mt-1.5 plm-py-1 plm-rounded plm-text-center plm-relative plm-z-[5]"
        style={{
          backgroundColor: clubColors?.primary || borderColor,
          borderBottom: `2px solid ${clubColors?.secondary || overallColor}`,
        }}
      >
        <div
          className={`${fs.name} plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-1`}
          style={{ color: isLightColor(clubColors?.primary || borderColor) ? '#1A1A1A' : '#FFFFFF' }}
        >
          {player.name}
        </div>
      </div>

      {/* Nationality + Age */}
      <div className="plm-flex plm-justify-center plm-items-center plm-gap-1 plm-mt-1 plm-relative plm-z-[5]">
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
      <div className="plm-mx-2.5 plm-mt-1.5 plm-grid plm-grid-cols-3 plm-gap-x-1 plm-gap-y-0.5 plm-relative plm-z-[5]">
        {STAT_KEYS.map((stat) => {
          const value = player.stats[stat];
          const isHero = heroStat?.key === stat && isGold;
          return (
            <div key={stat} className="plm-flex plm-items-center plm-justify-between plm-px-1">
              <span
                className={`${fs.stat} plm-font-bold plm-uppercase`}
                style={{ color: isHero ? '#FFD700' : borderColor }}
              >
                {stat}
              </span>
              <span
                className={`${fs.stat} plm-font-black plm-tabular-nums`}
                style={{
                  color: isHero ? '#FFD700' : '#1A1A1A',
                  textShadow: isHero ? '0 0 6px rgba(255,215,0,0.6)' : undefined,
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Trait badge */}
      <div className="plm-flex plm-justify-center plm-mt-1.5 plm-relative plm-z-[5]">
        <span
          className={`${fs.pos} plm-font-bold plm-uppercase plm-tracking-wider plm-px-2 plm-py-0.5 plm-rounded-full`}
          style={{
            backgroundColor: borderColor + '30',
            color: borderColor,
            border: `1px solid ${borderColor}50`,
          }}
        >
          {player.trait}
        </span>
      </div>

      {/* ─── Procedural signature (gold cards, md+ sizes) ─── */}
      {isGold && size !== 'sm' && (
        <div className="plm-absolute plm-bottom-2 plm-left-2 plm-right-2 plm-z-[5] plm-pointer-events-none">
          <svg
            viewBox="0 0 160 40"
            className="plm-w-full plm-opacity-15"
            fill="none"
            stroke={borderColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d={generateSignaturePath(player.name)} />
          </svg>
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

      {/* Corner star decoration */}
      <div className="plm-absolute plm-bottom-1 plm-right-1.5 plm-opacity-20 plm-z-[5]">
        <svg width={size === 'sm' ? 16 : 20} height={size === 'sm' ? 16 : 20} viewBox="0 0 24 24" fill={borderColor}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>
  );
}
