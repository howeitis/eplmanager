import type { ManagerMomentCard as ManagerMomentCardType, ManagerMomentType } from '@/types/entities';
import { getClubLogoUrl } from '@/data/assets';
import {
  getTierAccentColor,
  getTierBgGradient,
  getTierBorderColor,
  getTierFoilColor,
  type CardTier,
} from '@/utils/tierColors';

interface ManagerMomentCardProps {
  card: ManagerMomentCardType;
  clubName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * The manager-moment counterpart to RetroPlayerCard. Same visual language —
 * tier foil, accent border, club crest, season stamp — but built around a
 * single headline + subtitle rather than player stats. Used inside the binder
 * to give career milestones the same collectible weight as player cards.
 */
export function ManagerMomentCard({ card, clubName, size = 'md' }: ManagerMomentCardProps) {
  const tier = tierForMoment(card.type);
  const accent = card.accentColor ?? getTierAccentColor(tier);
  const border = getTierBorderColor(tier);
  const gradient = getTierBgGradient(tier);
  const foil = getTierFoilColor(tier);
  const logoUrl = getClubLogoUrl(card.clubId);

  const sizeClasses = sizeMap[size];

  return (
    <div
      role="img"
      aria-label={`${card.title}, Season ${card.season}`}
      className={`plm-relative plm-rounded-xl plm-overflow-hidden plm-shrink-0 ${sizeClasses.frame}`}
      style={{ border: `2px solid ${border}`, background: gradient, boxShadow: `0 4px 18px ${border}40` }}
    >
      {/* Foil sheen overlay — same look as RetroPlayerCard but no holo, since
          moments aren't position-bound and don't have OVR to dance off. */}
      <div
        aria-hidden
        className="plm-absolute plm-inset-0 plm-pointer-events-none plm-opacity-25 plm-mix-blend-overlay"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 65%)',
        }}
      />

      {/* Top: badge type + season pill */}
      <div className={`plm-relative plm-flex plm-items-start plm-justify-between ${sizeClasses.headerPad}`}>
        <div className="plm-flex plm-items-center plm-gap-1.5">
          <span aria-hidden className={sizeClasses.glyph} style={{ color: foil }}>
            {glyphForMoment(card.type)}
          </span>
          <span
            className={`plm-uppercase plm-tracking-[0.18em] plm-font-bold ${sizeClasses.typeLabel}`}
            style={{ color: foil }}
          >
            {labelForMoment(card.type)}
          </span>
        </div>
        <span
          className={`plm-rounded-full plm-px-2 plm-py-0.5 plm-font-bold plm-tabular-nums ${sizeClasses.seasonChip}`}
          style={{ backgroundColor: border, color: '#fff' }}
        >
          S{card.season}
        </span>
      </div>

      {/* Big crest centerpiece */}
      <div className={`plm-relative plm-flex plm-justify-center plm-items-center ${sizeClasses.crestPad}`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className={`${sizeClasses.crest} plm-object-contain plm-drop-shadow-md`}
          />
        ) : (
          <div
            className={`${sizeClasses.crest} plm-rounded-full`}
            style={{ backgroundColor: accent }}
          />
        )}
      </div>

      {/* Title + subtitle */}
      <div
        className={`plm-relative plm-text-center plm-font-display plm-font-bold plm-text-charcoal plm-leading-tight ${sizeClasses.titlePad} ${sizeClasses.title}`}
      >
        {card.title}
      </div>
      <div
        className={`plm-relative plm-text-center plm-italic plm-text-warm-700 plm-leading-snug ${sizeClasses.subtitlePad} ${sizeClasses.subtitle}`}
      >
        {card.subtitle}
      </div>

      {/* Bottom: club name + tiny foil stamp serial */}
      <div className={`plm-relative plm-flex plm-items-center plm-justify-between ${sizeClasses.footerPad}`}>
        <span className={`plm-font-semibold plm-text-warm-700 plm-truncate plm-pr-2 ${sizeClasses.footer}`}>
          {clubName ?? '—'}
        </span>
        <span
          className={`plm-uppercase plm-tracking-widest plm-font-bold plm-tabular-nums ${sizeClasses.footer}`}
          style={{ color: foil }}
          aria-hidden
        >
          № {(card.mintedAt % 10000).toString().padStart(4, '0')}
        </span>
      </div>
    </div>
  );
}

// ─── Tier + label maps ───────────────────────────────────────────

function tierForMoment(type: ManagerMomentType): CardTier {
  switch (type) {
    case 'first-title':
      return 'elite';
    case 'league-title':
    case 'final-day-clincher':
      return 'gold';
    case 'first-cup':
    case 'fa-cup':
      return 'silver';
    case 'survival':
    case 'milestone-games':
    case 'promotion':
      return 'bronze';
    case 'first-hire':
      return 'base';
  }
}

function labelForMoment(type: ManagerMomentType): string {
  switch (type) {
    case 'first-title': return 'First Title';
    case 'league-title': return 'Champions';
    case 'first-cup': return 'First Cup';
    case 'fa-cup': return 'FA Cup';
    case 'survival': return 'Survival';
    case 'milestone-games': return 'Milestone';
    case 'promotion': return 'Promotion';
    case 'final-day-clincher': return 'Final Day';
    case 'first-hire': return 'Appointment';
  }
}

function glyphForMoment(type: ManagerMomentType): string {
  switch (type) {
    case 'first-title':
    case 'league-title':
      return '👑';
    case 'first-cup':
    case 'fa-cup':
      return '🏆';
    case 'survival':
      return '⛑';
    case 'milestone-games':
      return '✦';
    case 'promotion':
      return '↑';
    case 'final-day-clincher':
      return '⌛';
    case 'first-hire':
      return '🪪';
  }
}

// Compact size table — each size pre-bakes its own spacing/font so the JSX
// stays clean. The shape of every variant is identical; only the scale changes.
const sizeMap = {
  sm: {
    frame: 'plm-w-[140px] plm-h-[200px]',
    headerPad: 'plm-px-2 plm-pt-2',
    glyph: 'plm-text-sm',
    typeLabel: 'plm-text-[8px]',
    seasonChip: 'plm-text-[9px]',
    crestPad: 'plm-py-2',
    crest: 'plm-w-12 plm-h-12',
    titlePad: 'plm-px-2 plm-pt-1',
    title: 'plm-text-[12px]',
    subtitlePad: 'plm-px-2 plm-pt-1',
    subtitle: 'plm-text-[9px]',
    footerPad: 'plm-px-2 plm-pt-2 plm-pb-2',
    footer: 'plm-text-[9px]',
  },
  md: {
    frame: 'plm-w-[200px] plm-h-[280px]',
    headerPad: 'plm-px-3 plm-pt-3',
    glyph: 'plm-text-lg',
    typeLabel: 'plm-text-[10px]',
    seasonChip: 'plm-text-[10px]',
    crestPad: 'plm-py-3',
    crest: 'plm-w-20 plm-h-20',
    titlePad: 'plm-px-3 plm-pt-1.5',
    title: 'plm-text-base',
    subtitlePad: 'plm-px-3 plm-pt-1',
    subtitle: 'plm-text-[11px]',
    footerPad: 'plm-px-3 plm-pt-3 plm-pb-3',
    footer: 'plm-text-[10px]',
  },
  lg: {
    frame: 'plm-w-[280px] plm-h-[400px]',
    headerPad: 'plm-px-4 plm-pt-4',
    glyph: 'plm-text-2xl',
    typeLabel: 'plm-text-xs',
    seasonChip: 'plm-text-xs',
    crestPad: 'plm-py-5',
    crest: 'plm-w-28 plm-h-28',
    titlePad: 'plm-px-4 plm-pt-2',
    title: 'plm-text-xl',
    subtitlePad: 'plm-px-4 plm-pt-2',
    subtitle: 'plm-text-sm',
    footerPad: 'plm-px-4 plm-pt-4 plm-pb-4',
    footer: 'plm-text-xs',
  },
} as const;
