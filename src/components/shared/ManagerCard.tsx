import type { ManagerProfile } from '@/types/entities';
import { getNationalityFlagUrl, getNationalityLabel, getClubLogoUrl } from '@/data/assets';
import { getManagerFaceUri } from '@/utils/avatarFace';
import {
  cardTierFromManagerReputation,
  getTierAccentColor,
  getTierBorderColor,
  getTierBgGradient,
  getTierFoilColor,
  isLightColor,
} from '@/utils/tierColors';

const PHILOSOPHY_LABELS: Record<string, string> = {
  attacking: 'Attacking',
  possession: 'Possession',
  pragmatic: 'Pragmatic',
  defensive: 'Defensive',
  developmental: 'Developmental',
  'rotation-heavy': 'Rotation-Heavy',
};

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

// Keep in sync with the shortener used on player cards so club names read
// the same in both places. Falls through to the full name if not mapped.
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

function buildBio(manager: ManagerProfile): string {
  if (manager.bio && manager.bio.trim().length > 0) return manager.bio.trim();
  const adj = PHILOSOPHY_ADJECTIVE[manager.philosophy] || 'seasoned';
  const phil = PHILOSOPHY_LABELS[manager.philosophy] || manager.philosophy;
  const nat = getNationalityLabel(manager.nationality);
  const trophies = (manager.totalLeagueTitles || 0) + (manager.totalFaCups || 0);
  const seasons = Math.max(1, Math.round((manager.totalGamesManaged || 0) / 38));

  // Avoid adjective repetition: if adj matches the philosophy label, drop adj and lead with nationality
  const adjMatchesPhil = adj.toLowerCase() === phil.toLowerCase();
  const natMatchesAdj = adj.toLowerCase() === nat.toLowerCase();

  // Build the descriptor prefix: e.g. "A fearless English" or "A Scottish" (when adj=pragmatic matches phil)
  let descriptor: string;
  if (adjMatchesPhil) {
    // Skip adj, just use nationality: "A Scottish tactician"
    descriptor = `A ${nat}`;
  } else if (natMatchesAdj) {
    // Skip nat to avoid "A patient patient": "A patient tactician"
    descriptor = `A ${adj}`;
  } else {
    descriptor = `A ${adj} ${nat}`;
  }

  if (trophies === 0) {
    return `${descriptor} tactician leading out with a ${phil} ${manager.preferredFormation}.`;
  }
  return `${descriptor} tactician whose ${phil} ${manager.preferredFormation} has delivered ${numberWord(trophies)} ${trophies === 1 ? 'trophy' : 'trophies'} in ${numberWord(seasons)} season${seasons === 1 ? '' : 's'}.`;
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
  const tier = cardTierFromManagerReputation(manager.reputation);
  const tierColor = getTierAccentColor(tier);
  const borderColor = getTierBorderColor(tier);
  const bgGradient = getTierBgGradient(tier);
  const foilColor = getTierFoilColor(tier);
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

      {/* Avatar — DiceBear avataaars SVG seeded by manager.avatar string.
          Legacy saves stored an emoji glyph here; DiceBear hashes any string
          to a deterministic portrait, so old avatars still render. */}
      <div className="plm-flex plm-justify-center plm-relative plm-z-[5] plm-flex-shrink-0" style={{ height: 50 }}>
        <img
          src={getManagerFaceUri(manager.avatar)}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ height: 50, width: 50, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}
        />
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

      {/* Editorial meta line — nationality · age · club (shortened), foil-stamped */}
      <div className="plm-mt-0.5 plm-px-3 plm-relative plm-z-[5] plm-flex-shrink-0 plm-flex plm-justify-center plm-items-center plm-whitespace-nowrap plm-overflow-hidden" style={{ columnGap: 8 }}>
        <span
          className="plm-text-[9px] plm-uppercase plm-font-semibold plm-whitespace-nowrap plm-truncate"
          style={{ color: foilColor, letterSpacing: '0.16em' }}
        >
          {getNationalityLabel(manager.nationality)}
        </span>
        <span
          aria-hidden="true"
          className="plm-inline-block plm-rounded-full plm-flex-shrink-0"
          style={{ width: 3, height: 3, backgroundColor: foilColor, opacity: 0.7 }}
        />
        <span
          className="plm-text-[9px] plm-uppercase plm-font-semibold plm-whitespace-nowrap"
          style={{ color: foilColor, letterSpacing: '0.16em' }}
        >
          Age {manager.age}
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
              {shortenClubName(clubName)}
            </span>
          </>
        )}
      </div>

      {/* Stat rows — classic one-per-line layout: formation, style, games,
          then trophies with the emoji row directly under the count. */}
      <div className="plm-mx-3 plm-mt-1.5 plm-space-y-1 plm-relative plm-z-[5]">
        <div className="plm-flex plm-justify-between plm-items-baseline">
          <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Formation</span>
          <span className="plm-text-xs plm-font-black plm-tabular-nums" style={{ color: '#1A1A1A' }}>{manager.preferredFormation}</span>
        </div>
        <div className="plm-flex plm-justify-between plm-items-baseline">
          <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Style</span>
          <span className="plm-text-xs plm-font-black" style={{ color: '#1A1A1A' }}>{PHILOSOPHY_LABELS[manager.philosophy] || manager.philosophy}</span>
        </div>
        <div className="plm-flex plm-justify-between plm-items-baseline">
          <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Games</span>
          <span className="plm-text-xs plm-font-black plm-tabular-nums" style={{ color: '#1A1A1A' }}>{manager.totalGamesManaged}</span>
        </div>
        <div>
          <div className="plm-flex plm-justify-between plm-items-baseline">
            <span className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider" style={{ color: borderColor }}>Trophies</span>
            <span className="plm-text-xs plm-font-black plm-tabular-nums" style={{ color: tierColor, textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}>{totalTrophies}</span>
          </div>
          {trophyEmojis.length > 0 && (
            <div className="plm-flex plm-flex-wrap plm-gap-0.5 plm-mt-0.5 plm-justify-end">
              {trophyEmojis.map((emoji, i) => (
                <span key={i} style={{ fontSize: 11, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}>{emoji}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bio paragraph — fills the remaining space beneath the stats */}
      <div className="plm-flex-1 plm-flex plm-items-center plm-justify-center plm-px-3 plm-relative plm-z-[5] plm-min-h-0 plm-pb-5 plm-pt-1">
        <p className="plm-text-[9px] plm-italic plm-leading-snug plm-text-center" style={{ color: '#2B2620' }}>
          {bio}
        </p>
      </div>

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
