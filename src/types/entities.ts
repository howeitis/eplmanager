export type Position = 'GK' | 'CB' | 'FB' | 'MF' | 'WG' | 'ST';

export type Trait =
  | 'Leader'
  | 'Ambitious'
  | 'Loyal'
  | 'Clutch'
  | 'Inconsistent'
  | 'Fragile'
  | 'Durable'
  | 'Engine'
  | 'Flair'
  | 'Prospect';

export interface PlayerStats {
  ATK: number;
  DEF: number;
  MOV: number;
  PWR: number;
  MEN: number;
  SKL: number;
}

export interface Player {
  id: string;
  name: string;
  nationality: string;
  age: number;
  position: Position;
  stats: PlayerStats;
  overall: number;
  trait: Trait;
  form: number;
  injured: boolean;
  injuryWeeks: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  value: number;
  acquiredThisWindow: boolean;
  isTemporary: boolean;
  highPotential: boolean;
  earlyPeaker: boolean;
  seasonsAtClub: number;
  /** One entry per monthly phase played this season (capped at 10) */
  formHistory: number[];
  /** Per-month goal tallies this season (capped at 10) */
  monthlyGoals: number[];
  /** Per-month assist tallies this season (capped at 10) */
  monthlyAssists: number[];
  /** Stats snapshot captured at season start (or signing time) */
  statsSnapshotSeasonStart: PlayerStats;
  /** True if the player was developed at this club (initial squad youth or academy intake) */
  homegrown?: boolean;
  /** Trophies won while at the player's current club */
  trophiesWon?: { season: number; type: 'league' | 'cup' }[];
  /** Seasons in which this player won the Premier League Golden Boot */
  goldenBoots?: number[];
  /** Career count of hat-tricks (3+ goals in a single match). Cumulative. */
  hatTricks?: number;
}

export interface ClubColors {
  primary: string;
  secondary: string;
}

export interface NationalityWeight {
  nationality: string;
  weight: number;
}

export type KitPattern = 'plain' | 'vertical-stripes';

export interface ClubKit {
  pattern: KitPattern;
  /** Hex string used for sleeves / stripes — equal to primary for plain. */
  accent: string;
  /**
   * Optional shirt base colour. When set, overrides `colors.primary` for the
   * avatar shirt only — useful when the team's brand colour (used for UI
   * accents, league table, etc.) doesn't match the actual shirt colour
   * (e.g. Tottenham brand = navy, shirt = white).
   */
  base?: string;
  /**
   * When true, render the chest crest as pure white instead of its native
   * colour. For clubs whose red crest disappears against a red shirt
   * (Liverpool, Forest); the original red logo is still used elsewhere.
   */
  crestWhite?: boolean;
}

export interface ClubData {
  id: string;
  name: string;
  shortName: string;
  tier: 1 | 2 | 3 | 4 | 5;
  budget: number;
  colors: ClubColors;
  rivalries: string[];
  namePool: NationalityWeight[];
  kit?: ClubKit;
  /** Logo filename inside /Premier League Clubs Logos/ — e.g. 'Arsenal.png'. */
  logo?: string;
}

export interface Club extends ClubData {
  roster: Player[];
}

/** Mapping of slot name → player ID for a Starting XI */
export type StartingXIMap = Record<string, string>;

export interface MatchResult {
  fixtureId: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  isDerby: boolean;
  scorers: { playerId: string; minute: number; isHome: boolean }[];
  assisters: { playerId: string; minute: number; isHome: boolean }[];
  homeStartingXI?: StartingXIMap;
  awayStartingXI?: StartingXIMap;
  /** Single best-rated player across both XIs by match-impact score. */
  manOfTheMatchId?: string;
}

export interface LeagueTableRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface Fixture {
  id: string;
  homeClubId: string;
  awayClubId: string;
  gameweek: number;
  played: boolean;
  result: MatchResult | null;
}

export type GamePhase =
  | 'summer_window'
  | 'july_advance'
  | 'august'
  | 'august_deadline'
  | 'september'
  | 'october'
  | 'november'
  | 'december'
  | 'january_window'
  | 'january'
  | 'january_deadline'
  | 'february'
  | 'march'
  | 'april'
  | 'may'
  | 'season_end';

export type EventCategory =
  | 'form'
  | 'squad'
  | 'transfer_window'
  | 'season_narrative'
  | 'managerial'
  | 'player_life'
  | 'weather';

export interface SeasonEvent {
  id: string;
  month: GamePhase;
  description: string;
  type: 'narrative' | 'modifier' | 'injury' | 'transfer';
  category: EventCategory;
}

export interface ActiveModifier {
  id: string;
  description: string;
  effect: Record<string, number>;
  expiresAt: GamePhase;
  targetPlayerId?: string;
  targetClubId?: string;
}

export type BoardExpectationTier =
  | 'Dominate'
  | 'Compete for Title'
  | 'Top Half'
  | 'Mid-Table'
  | 'Survive';

export interface ReputationChange {
  delta: number;
  reason: string;
  season: number;
}

export interface TransferOffer {
  id: string;
  playerId: string;
  playerName: string;
  playerPosition: Position;
  playerOverall: number;
  playerAge: number;
  fromClubId: string;
  toClubId: string;
  fee: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'player_refused';
  counterFee?: number;
  direction: 'incoming' | 'outgoing';
}

export interface TransferRecord {
  playerId: string;
  playerName: string;
  playerPosition: Position;
  playerOverall: number;
  playerAge: number;
  fromClubId: string;
  toClubId: string;
  fee: number;
  season: number;
  window: 'summer' | 'january';
  isContinentSale?: boolean;
  continentDestination?: string;
}

export interface MarketListing {
  playerId: string;
  clubId: string;
  askingPrice: number;
  listedByPlayer: boolean;
}

export type ContinentLeague = 'La Liga' | 'Serie A' | 'Bundesliga' | 'Ligue 1';

export interface ContinentSaleResult {
  player: Player;
  fee: number;
  destination: string;
  league: ContinentLeague;
}

export type PlayingBackground =
  | 'former-pro'
  | 'lower-league-pro'
  | 'academy-coach'
  | 'journalist'
  | 'analyst'
  | 'never-played';

export type ManagerPhilosophy =
  | 'attacking'
  | 'possession'
  | 'pragmatic'
  | 'defensive'
  | 'developmental'
  | 'rotation-heavy';

export type AccomplishmentType =
  | 'league-title'
  | 'fa-cup'
  | 'promotion'
  | 'relegation'
  | 'milestone-games'
  | 'manager-of-season'
  | 'club-hired'
  | 'club-departed';

export interface ManagerAccomplishment {
  id: string;
  season: number;
  clubId: string;
  type: AccomplishmentType;
  headline: string;
  detail?: string;
}

export interface ClubTenure {
  clubId: string;
  startSeason: number;
  endSeason?: number;
  gamesManaged: number;
  leagueTitles: number;
  faCups: number;
  bestLeagueFinish: number;
}

export interface ManagerProfile {
  name: string;
  clubId: string;
  reputation: number;
  /**
   * Reputation as it stood at the **start** of the current season. Used by
   * Phase B.5's bonus-drop logic to detect "crossed 50 / 75 this season"
   * (vs. "currently above"). Snapshotted at the start of handleSeasonEnd
   * before the season's reputation delta is applied. Optional for back-
   * compat with pre-v6 saves; the v6 migration mirrors `reputation` into it.
   */
  previousReputation?: number;

  // Identity fields (set at creation)
  nationality: string;
  age: number;
  playingBackground: PlayingBackground;
  preferredFormation: string;
  philosophy: ManagerPhilosophy;
  /**
   * Phase C: the manager's declared tactical identity. Picked at career
   * creation, permanent for the career. Biases instruction-card drop weights
   * at mint time (60/40 in-school vs out). Optional for back-compat with
   * pre-v6 saves; the v6 migration assigns a default derived from
   * `playingBackground`.
   */
  school?: import('./tactics').ManagerSchool;
  avatar: string;
  bio: string;
  createdAt: number;

  // Career state
  tenures: ClubTenure[];
  accomplishments: ManagerAccomplishment[];
  /**
   * Career sticker binder — player cards minted at signing / season-end and
   * manager moment cards minted at trophies / milestones. Persists across
   * club changes; it's the manager's personal scrapbook, not per-tenure.
   * Schema v4+. Older saves backfill to a synthesised list from
   * accomplishments via migrateSaveData.
   */
  binder?: BinderCard[];

  // Career totals (denormalized for display)
  totalGamesManaged: number;
  totalLeagueTitles: number;
  totalFaCups: number;
}

// ─── Binder (sticker album / career scrapbook) ───

export type PlayerBinderCardType =
  | 'signing'
  | 'season-end'
  | 'retirement'
  | 'tots'
  | 'tier-up'
  | 'youth-intake';

export interface PlayerBinderCard {
  kind: 'player';
  /** Stable id — `binder-${playerId}-s${season}-${type}`. Dedup key. */
  id: string;
  type: PlayerBinderCardType;
  season: number;
  mintedAt: number;
  /** Full player snapshot at mint time. Independent of live roster state. */
  player: Player;
  /** Club at mint time — drives crest + colors on the card render. */
  clubId: string;
  /** Optional pre-mint context (e.g. fee paid for a signing). */
  fee?: number;
}

export type ManagerMomentType =
  | 'first-hire'
  | 'first-title'
  | 'league-title'
  | 'first-cup'
  | 'fa-cup'
  | 'survival'
  | 'milestone-games'
  | 'promotion'
  | 'final-day-clincher'
  /** A user-club u21 player crossed into Starboy territory (age ≤21, OVR ≥82). */
  | 'starboy-emerged'
  /** A user-club player crossed into Icon overall (≥90). */
  | 'icon-arrived'
  /** A user-club player reached Legend status (8+ career trophies). */
  | 'legend-status';

/**
 * Optional tier override for moments whose rarity varies by sub-criterion.
 * Used by milestone-games (50 = bronze, 100 = silver, 250 = gold), where
 * the moment type alone doesn't capture how rare the achievement is.
 * When unset, ManagerMomentCard falls back to a default tier keyed off
 * the moment type.
 */
export type ManagerMomentTier = 'base' | 'bronze' | 'silver' | 'gold' | 'elite';

export interface ManagerMomentCard {
  kind: 'manager-moment';
  id: string;
  type: ManagerMomentType;
  /** Headline rendered as the main line on the card. */
  title: string;
  /** One-line story below the title. */
  subtitle: string;
  season: number;
  clubId: string;
  mintedAt: number;
  /** Optional override for the card accent. Falls back to club primary. */
  accentColor?: string;
  /** Optional rarity override; falls back to a per-type default. */
  tier?: ManagerMomentTier;
}

export type BinderCard = PlayerBinderCard | ManagerMomentCard;

export interface BoardExpectation {
  minPosition: number;
  description: string;
}

export interface SeasonHistory {
  seasonNumber: number;
  finalTable: LeagueTableRow[];
  playerStats: SeasonPlayerStats[];
  transferLog: TransferRecord[];
  events: SeasonEvent[];
}

export interface SeasonPlayerStats {
  playerId: string;
  playerName: string;
  clubId: string;
  position: Position;
  goals: number;
  assists: number;
  cleanSheets: number;
  avgForm: number;
  overall: number;
}

export interface SaveMetadata {
  slot: number;
  clubId: string;
  clubName: string;
  seasonNumber: number;
  leaguePosition: number;
  /** Phase the save was written in — used to render "Season X · Month · Yth place". Optional for backward compat with pre-0.1.5 saves. */
  currentPhase?: GamePhase;
  lastSaved: string;
  managerName?: string;
  managerAvatar?: string;
  /**
   * Total cards in the career binder at save time. Surfaced as a pill on
   * the save-slot selector so returning players can see their collection
   * growing without having to load. Optional for back-compat with saves
   * written before v4 / before this field landed.
   */
  binderCount?: number;
}
