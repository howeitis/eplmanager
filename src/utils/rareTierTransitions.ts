import { mintManagerMoment } from './binder';
import type { BinderCard, Player } from '@/types/entities';

/**
 * Pre-state snapshots used to detect a rare-tier transition this season.
 * Each entry is the player's state BEFORE aging / before this season's
 * trophies were awarded.
 *
 *   overall + age: from the pre-aging snapshot (undefined for players who
 *                  didn't exist last season — youth intake, regens).
 *   trophies:      from the pre-awarding snapshot (undefined treated as 0).
 */
export interface RareTierPreState {
  overall?: number;
  age?: number;
  trophies?: number;
}

export interface DetectRareTransitionsArgs {
  postAgingRoster: Player[];
  playerClubId: string;
  seasonNumber: number;
  /** Lookup by playerId. Players missing from the map are treated as new. */
  pre: Map<string, RareTierPreState>;
}

/**
 * Returns a list of manager-moment cards for any user-club player who
 * crossed into Starboy (u21 + OVR≥82), Icon (OVR≥90), or Legend (8+
 * career trophies) status this season. Generic tier-band crossings
 * (bronze→silver etc.) do NOT generate cards — those are celebrated
 * in-flight by the season-end Risers pack and don't earn permanent
 * binder real-estate.
 *
 * Players missing from `pre` (fresh youth intake, replenish regens) are
 * treated as "was nothing before" — a 17-year-old academy graduate who
 * lands at OVR 82 still earns the Starboy moment.
 */
export function detectRareTierTransitions({
  postAgingRoster,
  playerClubId,
  seasonNumber,
  pre,
}: DetectRareTransitionsArgs): BinderCard[] {
  const out: BinderCard[] = [];

  for (const p of postAgingRoster) {
    if (p.isTemporary) continue;
    const prev = pre.get(p.id) ?? {};

    const wasStarboy = (prev.age ?? 99) <= 21 && (prev.overall ?? 0) >= 82;
    const isStarboy = p.age <= 21 && p.overall >= 82;
    if (isStarboy && !wasStarboy) {
      out.push(
        mintManagerMoment({
          type: 'starboy-emerged',
          id: `mm-starboy-${p.id}-s${seasonNumber}`,
          title: 'A Starboy Emerges',
          subtitle: `${p.name}, age ${p.age} — ${p.overall} OVR and rising.`,
          season: seasonNumber,
          clubId: playerClubId,
        }),
      );
    }

    const wasIcon = (prev.overall ?? 0) >= 90;
    const isIcon = p.overall >= 90;
    if (isIcon && !wasIcon) {
      out.push(
        mintManagerMoment({
          type: 'icon-arrived',
          id: `mm-icon-${p.id}-s${seasonNumber}`,
          title: 'Icon Status',
          subtitle: `${p.name} hits ${p.overall} OVR.`,
          season: seasonNumber,
          clubId: playerClubId,
        }),
      );
    }

    const preTrophies = prev.trophies ?? 0;
    const nowTrophies = p.trophiesWon?.length ?? 0;
    if (preTrophies < 8 && nowTrophies >= 8) {
      out.push(
        mintManagerMoment({
          type: 'legend-status',
          id: `mm-legend-${p.id}-s${seasonNumber}`,
          title: 'A Legend Crowned',
          subtitle: `${p.name} reaches ${nowTrophies} career trophies.`,
          season: seasonNumber,
          clubId: playerClubId,
        }),
      );
    }
  }

  return out;
}
