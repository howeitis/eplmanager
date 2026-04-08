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
}

export interface ClubColors {
  primary: string;
  secondary: string;
}

export interface NationalityWeight {
  nationality: string;
  weight: number;
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

  // Identity fields (set at creation)
  nationality: string;
  age: number;
  playingBackground: PlayingBackground;
  preferredFormation: string;
  philosophy: ManagerPhilosophy;
  avatar: string;
  bio: string;
  createdAt: number;

  // Career state
  tenures: ClubTenure[];
  accomplishments: ManagerAccomplishment[];

  // Career totals (denormalized for display)
  totalGamesManaged: number;
  totalLeagueTitles: number;
  totalFaCups: number;
}

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
  lastSaved: string;
  managerName?: string;
  managerAvatar?: string;
}
