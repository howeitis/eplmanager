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

// ─── Trophy-based card tier ───

function getTrophyTier(trophies: number): 'bronze' | 'silver' | 'gold' | 'shiny-gold' {
  if (trophies >= 25) return 'shiny-gold';
  if (trophies >= 10) return 'gold';
  if (trophies >= 3) return 'silver';
  return 'bronze';
}

function getTierColor(tier: ReturnType<typeof getTrophyTier>): string {
  if (tier === 'shiny-gold' || tier === 'gold') return '#FFD700';
  if (tier === 'silver') return '#C0C0C0';
  return '#CD7F32';
}

function getTierBorderColor(tier: ReturnType<typeof getTrophyTier>): string {
  if (tier === 'shiny-gold' || tier === 'gold') return '#B8860B';
  if (tier === 'silver') return '#808080';
  return '#8B4513';
}

function getTierBgGradient(tier: ReturnType<typeof getTrophyTier>): string {
  if (tier === 'shiny-gold' || tier === 'gold') return 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)';
  if (tier === 'silver') return 'linear-gradient(135deg, #1a1a2e 0%, #2d2d4e 50%, #1a1a2e 100%)';
  return 'linear-gradient(135deg, #2d2a26 0%, #3d3a36 50%, #2d2a26 100%)';
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
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
  const tier = getTrophyTier(totalTrophies);
  const tierColor = getTierColor(tier);
  const borderColor = getTierBorderColor(tier);
  const bgGradient = getTierBgGradient(tier);
  const isShimmerGold = tier === 'shiny-gold';

  // Build trophy emoji string
  const trophyEmojis = [
    ...Array(manager.totalLeagueTitles || 0).fill('🏆'),
    ...Array(manager.totalFaCups || 0).fill('🏅'),
  ].slice(0, 10); // cap at 10 visible

  const clubLogoUrl = getClubLogoUrl(manager.clubId);

  return (
    <div
      className={`plm-w-56 plm-h-80 plm-relative plm-rounded-xl plm-overflow-hidden plm-shadow-lg plm-flex-shrink-0 ${isShimmerGold ? 'plm-animate-border-shimmer' : ''}`}
      style={{
        background: bgGradient,
        border: `3px solid ${borderColor}`,
      }}
    >
      {/* Shimmer sweep for gold/shiny-gold */}
      {(tier === 'gold' || tier === 'shiny-gold') && (
        <div className="plm-absolute plm-inset-0 plm-overflow-hidden plm-pointer-events-none plm-z-10">
          <div
            className="plm-absolute plm-top-0 plm-h-full plm-w-1/3 plm-animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
            }}
          />
        </div>
      )}

      {/* Club crest watermark */}
      {clubLogoUrl && (
        <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1] plm-overflow-hidden">
          <img
            src={clubLogoUrl}
            alt=""
            className="plm-absolute plm-opacity-[0.07]"
            style={{ width: '55%', height: 'auto', bottom: '12%', right: '-5%' }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* National flag watermark */}
      <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1] plm-overflow-hidden">
        <img
          src={getNationalityFlagUrl(manager.nationality)}
          alt=""
          className="plm-absolute plm-opacity-[0.05] plm-blur-[1px]"
          style={{ width: '75%', height: 'auto', top: '8%', left: '12%' }}
          aria-hidden="true"
        />
      </div>

      {/* Top: REP + Flag */}
      <div className="plm-flex plm-justify-between plm-items-start plm-px-3 plm-pt-2.5 plm-relative plm-z-[5]">
        <div className="plm-text-center">
          <div
            className="plm-text-3xl plm-font-display plm-font-black plm-leading-none"
            style={{ color: tierColor, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
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
            className="plm-inline-block plm-w-7 plm-h-5 plm-rounded-sm plm-object-cover"
          />
        </div>
      </div>

      {/* Avatar */}
      <div className="plm-flex plm-justify-center plm-mt-1 plm-relative plm-z-[5]">
        <div
          className="plm-text-4xl plm-leading-none"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
        >
          {manager.avatar}
        </div>
      </div>

      {/* Name plate */}
      <div
        className="plm-mx-3 plm-mt-1.5 plm-py-1.5 plm-rounded plm-text-center plm-relative plm-z-[5]"
        style={{
          backgroundColor: clubColors?.primary || '#333',
          borderBottom: `2px solid ${clubColors?.secondary || tierColor}`,
        }}
      >
        <div
          className="plm-text-sm plm-font-display plm-font-bold plm-uppercase plm-tracking-wide plm-truncate plm-px-1"
          style={{ color: isLightColor(clubColors?.primary || '#333') ? '#1A1A1A' : '#FFFFFF' }}
        >
          {manager.name}
        </div>
      </div>

      {/* Club name + nationality */}
      <div className="plm-text-center plm-mt-1 plm-relative plm-z-[5] plm-px-2">
        {clubName && (
          <div className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-truncate" style={{ color: tierColor }}>
            {clubName}
          </div>
        )}
        <div className="plm-text-[8px] plm-uppercase plm-tracking-wider plm-opacity-60" style={{ color: borderColor }}>
          {getNationalityLabel(manager.nationality)}
        </div>
      </div>

      {/* Stats — spacious layout */}
      <div className="plm-mx-3 plm-mt-2.5 plm-space-y-1.5 plm-relative plm-z-[5]">
        <div className="plm-flex plm-justify-between plm-items-baseline">
          <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Age</span>
          <span className="plm-text-xs plm-font-black plm-text-white">{manager.age}</span>
        </div>
        <div className="plm-flex plm-justify-between plm-items-baseline">
          <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Formation</span>
          <span className="plm-text-xs plm-font-black plm-text-white">{manager.preferredFormation}</span>
        </div>
        <div className="plm-flex plm-justify-between plm-items-baseline">
          <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Style</span>
          <span className="plm-text-xs plm-font-black plm-text-white">{PHILOSOPHY_LABELS[manager.philosophy] || manager.philosophy}</span>
        </div>
        <div className="plm-flex plm-justify-between plm-items-baseline">
          <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Games</span>
          <span className="plm-text-xs plm-font-black plm-text-white plm-tabular-nums">{manager.totalGamesManaged}</span>
        </div>
        <div className="plm-flex plm-justify-between plm-items-baseline">
          <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Trophies</span>
          <span className="plm-text-xs plm-font-black plm-tabular-nums" style={{ color: tierColor }}>{totalTrophies}</span>
        </div>
      </div>

      {/* Trophy emojis */}
      {trophyEmojis.length > 0 && (
        <div className="plm-absolute plm-bottom-5 plm-left-3 plm-right-3 plm-flex plm-flex-wrap plm-gap-0.5 plm-z-[5]">
          {trophyEmojis.map((emoji, i) => (
            <span key={i} style={{ fontSize: 11 }}>{emoji}</span>
          ))}
        </div>
      )}

      {/* Season badge */}
      {seasonNumber && (
        <div className="plm-absolute plm-bottom-1 plm-right-2 plm-z-[5]">
          <span className="plm-text-[8px] plm-uppercase plm-tracking-wider plm-opacity-40 plm-text-white">
            S{seasonNumber}
          </span>
        </div>
      )}

      {/* Reputation shape + trophy overlay (bottom-left) */}
      <div className="plm-absolute plm-bottom-1 plm-left-2 plm-z-[5] plm-flex plm-items-center plm-gap-1">
        <ManagerRepShape
          reputation={manager.reputation}
          tierColor={tierColor}
          borderColor={borderColor}
        />
        {totalTrophies >= 10 ? (
          <span
            className="plm-font-display plm-font-black plm-uppercase plm-tracking-wider"
            style={{
              fontSize: 9,
              color: '#DC2626',
              textShadow: '0 0 3px rgba(0,0,0,0.6)',
              letterSpacing: '0.08em',
            }}
          >
            Legend
          </span>
        ) : totalTrophies >= 5 ? (
          <span
            className="plm-font-display plm-font-black plm-uppercase plm-tracking-wider"
            style={{
              fontSize: 9,
              color: '#DC2626',
              textShadow: '0 0 3px rgba(0,0,0,0.6)',
              letterSpacing: '0.08em',
            }}
          >
            Icon
          </span>
        ) : null}
      </div>
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
  if (reputation > 85) {
    return (
      <div className="plm-opacity-60">
        <svg width={size} height={size} viewBox="0 0 24 24" fill={tierColor}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    );
  }
  if (reputation >= 70) {
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
