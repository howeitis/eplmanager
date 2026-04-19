import type { ManagerProfile } from '../../types/entities';
import { getNationalityFlagUrl, getNationalityLabel, getClubLogoUrl } from '../../data/assets';

const PHILOSOPHY_LABELS: Record<string, string> = {
  attacking: 'Attacking',
  possession: 'Possession',
  pragmatic: 'Pragmatic',
  defensive: 'Defensive',
  developmental: 'Developmental',
  'rotation-heavy': 'Rotation-Heavy',
};

// ─── Reputation-based card tier ───
// Mirrors the player card's overall → tier mapping so gold/silver/bronze
// reads the same way across player and manager cards.
type ManagerTier = 'elite' | 'gold' | 'silver' | 'bronze' | 'base';

function getReputationTier(reputation: number): ManagerTier {
  if (reputation >= 90) return 'elite';
  if (reputation >= 80) return 'gold';
  if (reputation >= 75) return 'silver';
  if (reputation >= 65) return 'bronze';
  return 'base';
}

function getTierColor(tier: ManagerTier): string {
  if (tier === 'elite' || tier === 'gold') return '#FFD700';
  if (tier === 'silver') return '#C0C0C0';
  if (tier === 'bronze') return '#CD7F32';
  return '#8B7355';
}

function getTierBorderColor(tier: ManagerTier): string {
  if (tier === 'elite' || tier === 'gold') return '#B8860B';
  if (tier === 'silver') return '#808080';
  if (tier === 'bronze') return '#8B4513';
  return '#6B5B45';
}

function getTierBgGradient(tier: ManagerTier): string {
  if (tier === 'elite' || tier === 'gold')
    return 'linear-gradient(135deg, #FFF8DC 0%, #FFD700 30%, #FFF8DC 50%, #FFD700 70%, #FFF8DC 100%)';
  if (tier === 'silver')
    return 'linear-gradient(135deg, #F5F5F5 0%, #C0C0C0 30%, #F5F5F5 50%, #C0C0C0 70%, #F5F5F5 100%)';
  if (tier === 'bronze')
    return 'linear-gradient(135deg, #FFF3E0 0%, #CD7F32 30%, #FFF3E0 50%, #CD7F32 70%, #FFF3E0 100%)';
  return 'linear-gradient(135deg, #FAF0E6 0%, #D2B48C 30%, #FAF0E6 50%, #D2B48C 70%, #FAF0E6 100%)';
}

// Foil-stamped ink that reads as embossed metallic on the card base.
function getFoilStampColor(tier: ManagerTier): string {
  if (tier === 'elite' || tier === 'gold') return '#7A5A10';
  if (tier === 'silver') return '#3F3F46';
  if (tier === 'bronze') return '#5A3418';
  return '#4A3A2E';
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

// Philosophy → descriptor used in the auto-generated bio line.
const PHILOSOPHY_ADJECTIVE: Record<string, string> = {
  attacking: 'fearless',
  possession: 'methodical',
  pragmatic: 'pragmatic',
  defensive: 'disciplined',
  developmental: 'patient',
  'rotation-heavy': 'rotational',
};

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function numberWord(n: number): string {
  return n >= 0 && n < NUM_WORDS.length ? NUM_WORDS[n] : String(n);
}

function buildBio(manager: ManagerProfile): string {
  if (manager.bio && manager.bio.trim().length > 0) return manager.bio.trim();
  const adj = PHILOSOPHY_ADJECTIVE[manager.philosophy] || 'seasoned';
  const phil = PHILOSOPHY_LABELS[manager.philosophy] || manager.philosophy;
  const nat = getNationalityLabel(manager.nationality);
  const trophies = (manager.totalLeagueTitles || 0) + (manager.totalFaCups || 0);
  const seasons = Math.max(1, Math.round((manager.totalGamesManaged || 0) / 38));
  if (trophies === 0) {
    return `A ${adj} tactician from ${nat} leading out with a ${phil} ${manager.preferredFormation}.`;
  }
  return `A ${adj} tactician from ${nat} whose ${phil} ${manager.preferredFormation} has delivered ${numberWord(trophies)} ${trophies === 1 ? 'trophy' : 'trophies'} in ${numberWord(seasons)} season${seasons === 1 ? '' : 's'}.`;
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
  const totalTrophies = (manager.totalLeagueTitles || 0) + (manager.totalFaCups || 0);
  const tier = getReputationTier(manager.reputation);
  const tierColor = getTierColor(tier);
  const borderColor = getTierBorderColor(tier);
  const bgGradient = getTierBgGradient(tier);
  const foilColor = getFoilStampColor(tier);
  const isShimmer = tier === 'elite';
  const bio = buildBio(manager);

  const trophyEmojis = [
    ...Array(manager.totalLeagueTitles || 0).fill('🏆'),
    ...Array(manager.totalFaCups || 0).fill('🏅'),
  ].slice(0, 10);

  const clubLogoUrl = getClubLogoUrl(manager.clubId);

  return (
    <div
      className={`plm-w-56 plm-h-80 plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 plm-flex plm-flex-col ${isShimmer ? 'plm-animate-border-shimmer' : ''}`}
      style={{
        background: bgGradient,
        border: `3px solid ${borderColor}`,
      }}
    >
      {/* Shimmer sweep for elite */}
      {isShimmer && (
        <div className="plm-absolute plm-inset-0 plm-overflow-hidden plm-pointer-events-none plm-z-10">
          <div
            className="plm-absolute plm-top-0 plm-h-full plm-w-1/3 plm-animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
            }}
          />
        </div>
      )}

      {/* Club crest watermark — centered behind the avatar */}
      {clubLogoUrl && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1] plm-overflow-hidden">
          <img
            src={clubLogoUrl}
            alt=""
            className="plm-absolute plm-opacity-[0.16]"
            style={{ width: '60%', height: 'auto', top: '8%', left: '50%', transform: 'translateX(-50%)' }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Top: REP + Flag */}
      <div className="plm-flex plm-justify-between plm-items-start plm-px-2.5 plm-pt-1 plm-relative plm-z-[5]">
        <div className="plm-text-center">
          <div
            className="plm-text-3xl plm-font-display plm-font-black plm-leading-none"
            style={{ color: tierColor, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}
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

      {/* Avatar — tight to the top section so the bio below has room */}
      <div className="plm-flex plm-justify-center plm-relative plm-z-[5] plm-flex-shrink-0" style={{ height: 50 }}>
        <div
          className="plm-leading-none"
          style={{ fontSize: 44, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}
        >
          {manager.avatar}
        </div>
      </div>

      {/* Name plate */}
      <div
        className="plm-mx-2.5 plm-py-0.5 plm-rounded plm-text-center plm-relative plm-z-[5] plm-flex-shrink-0"
        style={{
          backgroundColor: clubColors?.primary || borderColor,
          borderBottom: `2px solid ${clubColors?.secondary || tierColor}`,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="plm-text-sm plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-1"
          style={{
            color: isLightColor(clubColors?.primary || borderColor) ? '#1A1A1A' : '#FFFFFF',
            textShadow: isLightColor(clubColors?.primary || borderColor)
              ? '0 1px 0 rgba(255,255,255,0.4)'
              : '0 1px 1px rgba(0,0,0,0.45)',
          }}
        >
          {manager.name}
        </div>
      </div>

      {/* Editorial meta line — nationality · club, foil-stamped */}
      <div className="plm-mt-0.5 plm-px-3 plm-relative plm-z-[5] plm-flex-shrink-0 plm-flex plm-justify-center plm-items-center plm-whitespace-nowrap plm-overflow-hidden" style={{ columnGap: 8 }}>
        <span
          className="plm-text-[9px] plm-uppercase plm-font-semibold plm-whitespace-nowrap plm-truncate"
          style={{ color: foilColor, letterSpacing: '0.16em' }}
        >
          {getNationalityLabel(manager.nationality)}
        </span>
        {clubName && (
          <>
            <span
              aria-hidden="true"
              className="plm-inline-block plm-rounded-full plm-flex-shrink-0"
              style={{ width: 3, height: 3, backgroundColor: foilColor, opacity: 0.7 }}
            />
            <span
              className="plm-text-[9px] plm-uppercase plm-font-semibold plm-whitespace-nowrap plm-truncate"
              style={{ color: foilColor, letterSpacing: '0.16em' }}
            >
              {clubName}
            </span>
          </>
        )}
      </div>

      {/* Stats — compact, 2x2 grid so the bio has room */}
      <div className="plm-mx-2.5 plm-mt-1 plm-grid plm-grid-cols-2 plm-gap-x-2 plm-gap-y-0.5 plm-relative plm-z-[5]">
        <StatRow label="Age" value={String(manager.age)} borderColor={borderColor} />
        <StatRow label="Form." value={manager.preferredFormation} borderColor={borderColor} />
        <StatRow label="Style" value={PHILOSOPHY_LABELS[manager.philosophy] || manager.philosophy} borderColor={borderColor} />
        <StatRow label="Games" value={String(manager.totalGamesManaged)} borderColor={borderColor} />
      </div>

      {/* Bio paragraph — fills remaining space, italic, centered */}
      <div className="plm-flex-1 plm-flex plm-items-center plm-justify-center plm-px-2.5 plm-relative plm-z-[5] plm-min-h-0 plm-pb-5">
        <p className="plm-text-[9px] plm-italic plm-leading-snug plm-text-center" style={{ color: '#2B2620' }}>
          {bio}
        </p>
      </div>

      {/* Trophy strip — just above footer when present */}
      {trophyEmojis.length > 0 && (
        <div className="plm-absolute plm-bottom-5 plm-left-2.5 plm-right-2.5 plm-flex plm-flex-wrap plm-gap-0.5 plm-z-[5]">
          {trophyEmojis.map((emoji, i) => (
            <span key={i} style={{ fontSize: 10, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}>{emoji}</span>
          ))}
        </div>
      )}

      {/* Season badge */}
      {seasonNumber && (
        <div className="plm-absolute plm-bottom-1 plm-right-2 plm-z-[5]">
          <span className="plm-text-[8px] plm-uppercase plm-tracking-wider" style={{ color: foilColor, opacity: 0.6 }}>
            S{seasonNumber}
          </span>
        </div>
      )}

      {/* Reputation-shape + Icon/Legend label (bottom-left) */}
      <div className="plm-absolute plm-bottom-1 plm-left-2 plm-z-[5] plm-flex plm-items-center plm-gap-1">
        <ManagerRepShape reputation={manager.reputation} tierColor={tierColor} borderColor={borderColor} />
        {totalTrophies >= 10 ? (
          <span
            className="plm-font-display plm-font-black plm-uppercase plm-tracking-wider"
            style={{ fontSize: 9, color: '#DC2626', textShadow: '0 0 3px rgba(255,255,255,0.8)', letterSpacing: '0.08em' }}
          >
            Legend
          </span>
        ) : totalTrophies >= 5 ? (
          <span
            className="plm-font-display plm-font-black plm-uppercase plm-tracking-wider"
            style={{ fontSize: 9, color: '#DC2626', textShadow: '0 0 3px rgba(255,255,255,0.8)', letterSpacing: '0.08em' }}
          >
            Icon
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StatRow({ label, value, borderColor }: { label: string; value: string; borderColor: string }) {
  return (
    <div className="plm-flex plm-justify-between plm-items-baseline plm-min-w-0">
      <span
        className="plm-text-[8px] plm-font-bold plm-uppercase plm-tracking-wider plm-flex-shrink-0"
        style={{ color: borderColor, opacity: 0.85 }}
      >
        {label}
      </span>
      <span className="plm-text-[11px] plm-font-black plm-tabular-nums plm-truncate plm-ml-1" style={{ color: '#1A1A1A' }}>
        {value}
      </span>
    </div>
  );
}

function ManagerRepShape({
  reputation,
  tierColor,
  borderColor,
}: {
  reputation: number;
  tierColor: string;
  borderColor: string;
}) {
  const size = 18;
  // Mirror the player corner-shape rules: gold → star, silver → diamond,
  // bronze + below → circle.
  if (reputation >= 80) {
    return (
      <div className="plm-opacity-60">
        <svg width={size} height={size} viewBox="0 0 24 24" fill={tierColor}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    );
  }
  if (reputation >= 75) {
    return (
      <div className="plm-opacity-50">
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path d="M12 2 L22 12 L12 22 L2 12 Z" fill={borderColor} />
        </svg>
      </div>
    );
  }
  return (
    <div className="plm-opacity-40">
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill={borderColor} />
      </svg>
    </div>
  );
}
