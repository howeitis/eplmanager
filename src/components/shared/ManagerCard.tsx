import type { ManagerProfile } from '../../types/entities';
import { getNationalityFlagUrl, getNationalityLabel } from '../../data/assets';

const PHILOSOPHY_SHORT: Record<string, string> = {
  attacking: 'ATK',
  possession: 'POS',
  pragmatic: 'PRA',
  defensive: 'DEF',
  developmental: 'DEV',
  'rotation-heavy': 'ROT',
};

const BACKGROUND_SHORT: Record<string, string> = {
  'former-pro': 'Ex-Pro',
  'lower-league-pro': 'Lower Lg',
  'academy-coach': 'Academy',
  journalist: 'Press',
  analyst: 'Analyst',
  'never-played': 'Outsider',
};


function getRepColor(rep: number): string {
  if (rep >= 80) return '#FFD700';
  if (rep >= 60) return '#C0C0C0';
  if (rep >= 40) return '#CD7F32';
  return '#8B7355';
}

function getRepLabel(rep: number): string {
  if (rep >= 80) return 'World Class';
  if (rep >= 60) return 'Established';
  if (rep >= 40) return 'Developing';
  if (rep >= 20) return 'Unproven';
  return 'Unknown';
}

interface ManagerCardProps {
  manager: ManagerProfile;
  clubName?: string;
  clubColors?: { primary: string; secondary: string };
  seasonNumber?: number;
}

export function ManagerCard({
  manager,
  clubName,
  clubColors,
  seasonNumber,
}: ManagerCardProps) {
  const repColor = getRepColor(manager.reputation);
  const borderColor = repColor === '#FFD700' ? '#B8860B' : repColor === '#C0C0C0' ? '#808080' : repColor === '#CD7F32' ? '#8B4513' : '#6B5B45';

  const bgGradient = manager.reputation >= 80
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)'
    : manager.reputation >= 60
    ? 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4e 50%, #1a1a2e 100%)'
    : 'linear-gradient(135deg, #2d2a26 0%, #3d3a36 50%, #2d2a26 100%)';

  return (
    <div
      className="plm-w-52 plm-h-72 plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0"
      style={{
        background: bgGradient,
        border: `3px solid ${borderColor}`,
      }}
    >
      {/* Shimmer for high rep */}
      {manager.reputation >= 70 && (
        <div className="plm-absolute plm-inset-0 plm-overflow-hidden plm-pointer-events-none plm-z-10">
          <div
            className="plm-absolute plm-top-0 plm-h-full plm-w-1/3 plm-animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            }}
          />
        </div>
      )}

      {/* Top: REP + Flag */}
      <div className="plm-flex plm-justify-between plm-items-start plm-px-2.5 plm-pt-2">
        <div className="plm-text-center">
          <div
            className="plm-text-3xl plm-font-display plm-font-black plm-leading-none"
            style={{ color: repColor, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
          >
            {manager.reputation}
          </div>
          <div
            className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-mt-0.5"
            style={{ color: borderColor }}
          >
            REP
          </div>
        </div>
        <div className="plm-text-right plm-mt-0.5">
          <img
            src={getNationalityFlagUrl(manager.nationality)}
            alt={getNationalityLabel(manager.nationality)}
            className="plm-inline-block plm-w-6 plm-h-4 plm-rounded-sm plm-object-cover"
          />
        </div>
      </div>

      {/* Avatar */}
      <div className="plm-flex plm-justify-center plm-mt-1">
        <div
          className="plm-text-4xl plm-leading-none"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        >
          {manager.avatar}
        </div>
      </div>

      {/* Name plate */}
      <div
        className="plm-mx-2.5 plm-mt-1.5 plm-py-1 plm-rounded plm-text-center"
        style={{
          backgroundColor: clubColors?.primary || '#333',
          borderBottom: `2px solid ${clubColors?.secondary || repColor}`,
        }}
      >
        <div
          className="plm-text-sm plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-1"
          style={{ color: isLightColor(clubColors?.primary || '#333') ? '#1A1A1A' : '#FFFFFF' }}
        >
          {manager.name}
        </div>
      </div>

      {/* Nationality + Club */}
      <div className="plm-flex plm-justify-center plm-items-center plm-gap-1 plm-mt-1">
        <span className="plm-text-[9px] plm-uppercase plm-tracking-wider plm-font-semibold" style={{ color: borderColor }}>
          {manager.nationality}
        </span>
        {clubName && (
          <>
            <span style={{ color: borderColor }}>&middot;</span>
            <span className="plm-text-[9px] plm-uppercase plm-tracking-wider plm-font-semibold plm-truncate plm-max-w-20" style={{ color: borderColor }}>
              {clubName}
            </span>
          </>
        )}
      </div>

      {/* Manager stats grid */}
      <div className="plm-mx-2.5 plm-mt-1.5 plm-grid plm-grid-cols-3 plm-gap-x-1 plm-gap-y-0.5">
        <StatItem label="AGE" value={`${manager.age}`} color={borderColor} />
        <StatItem label="STYLE" value={PHILOSOPHY_SHORT[manager.philosophy] || '???'} color={borderColor} />
        <StatItem label="BG" value={BACKGROUND_SHORT[manager.playingBackground] || '???'} color={borderColor} />
        <StatItem label="W" value={`${manager.totalLeagueTitles}`} color={borderColor} />
        <StatItem label="CUP" value={`${manager.totalFaCups}`} color={borderColor} />
        <StatItem label="GM" value={`${manager.totalGamesManaged}`} color={borderColor} />
      </div>

      {/* Reputation badge */}
      <div className="plm-flex plm-justify-center plm-mt-1.5">
        <span
          className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-px-2 plm-py-0.5 plm-rounded-full"
          style={{
            backgroundColor: repColor + '30',
            color: repColor,
            border: `1px solid ${repColor}50`,
          }}
        >
          {getRepLabel(manager.reputation)}
        </span>
      </div>

      {/* Season badge */}
      {seasonNumber && (
        <div className="plm-absolute plm-bottom-1 plm-right-1.5">
          <span className="plm-text-[8px] plm-text-warm-500 plm-uppercase plm-tracking-wider">
            S{seasonNumber}
          </span>
        </div>
      )}

      {/* Star decoration */}
      <div className="plm-absolute plm-bottom-1 plm-left-1.5 plm-opacity-20">
        <svg width={20} height={20} viewBox="0 0 24 24" fill={repColor}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="plm-flex plm-items-center plm-justify-between plm-px-1">
      <span className="plm-text-[10px] plm-font-bold plm-uppercase" style={{ color }}>
        {label}
      </span>
      <span className="plm-text-[10px] plm-font-black plm-tabular-nums plm-text-white">
        {value}
      </span>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
