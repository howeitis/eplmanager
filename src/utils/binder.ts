import type {
  Player,
  PlayerBinderCard,
  PlayerBinderCardType,
  ManagerMomentCard,
  ManagerMomentTier,
  ManagerMomentType,
  BinderCard,
} from '@/types/entities';

/**
 * Build a binder card id that's stable for a given (player, season, type)
 * triple. Deduplication relies on this — calling mintPlayerCard twice for
 * the same Saka-season-3-signing returns the same id and the second call
 * is a no-op inside the store.
 */
export function playerCardId(
  playerId: string,
  season: number,
  type: PlayerBinderCardType,
): string {
  return `binder-${playerId}-s${season}-${type}`;
}

export function mintPlayerCard(
  player: Player,
  clubId: string,
  season: number,
  type: PlayerBinderCardType,
  opts: { fee?: number } = {},
): PlayerBinderCard {
  return {
    kind: 'player',
    id: playerCardId(player.id, season, type),
    type,
    season,
    mintedAt: Date.now(),
    // Defensive deep-ish clone: the card must be independent of the live
    // roster, since the player may be sold, retire, or have stats reset
    // before the binder is next rendered. statsSnapshotSeasonStart is
    // intentionally retained for context on the back of the card.
    player: {
      ...player,
      stats: { ...player.stats },
      formHistory: [...(player.formHistory ?? [])],
      monthlyGoals: [...(player.monthlyGoals ?? [])],
      monthlyAssists: [...(player.monthlyAssists ?? [])],
      trophiesWon: player.trophiesWon ? [...player.trophiesWon] : undefined,
      goldenBoots: player.goldenBoots ? [...player.goldenBoots] : undefined,
    },
    clubId,
    fee: opts.fee,
  };
}

export interface ManagerMomentInput {
  type: ManagerMomentType;
  title: string;
  subtitle: string;
  season: number;
  clubId: string;
  /** Force a specific id; defaults to `mm-${type}-${clubId}-s${season}`. */
  id?: string;
  accentColor?: string;
  /** Override the per-type default rarity tier (used for milestone games). */
  tier?: ManagerMomentTier;
}

export function mintManagerMoment(input: ManagerMomentInput): ManagerMomentCard {
  return {
    kind: 'manager-moment',
    id: input.id ?? `mm-${input.type}-${input.clubId}-s${input.season}`,
    type: input.type,
    title: input.title,
    subtitle: input.subtitle,
    season: input.season,
    clubId: input.clubId,
    mintedAt: Date.now(),
    accentColor: input.accentColor,
    tier: input.tier,
  };
}

// ─── Selectors over an existing binder ───

export function playerCards(binder: BinderCard[] | undefined): PlayerBinderCard[] {
  return (binder ?? []).filter((c): c is PlayerBinderCard => c.kind === 'player');
}

export function managerMomentCards(binder: BinderCard[] | undefined): ManagerMomentCard[] {
  return (binder ?? []).filter((c): c is ManagerMomentCard => c.kind === 'manager-moment');
}

export function binderCardCount(binder: BinderCard[] | undefined): number {
  return (binder ?? []).length;
}
