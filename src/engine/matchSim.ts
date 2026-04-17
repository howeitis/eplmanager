import type {
  Player,
  Position,
  Club,
  Fixture,
  MatchResult,
  LeagueTableRow,
  GamePhase,
  StartingXIMap,
} from '../types/entities';
import { SeededRNG } from '../utils/rng';
import { matchSeed } from '../utils/rng';
import { generatePlayer } from './playerGen';
import {
  autoSelectXI,
  getStartingXIPlayers,
  getBenchPlayers,
  calculateSquadDepthBonus,
} from './startingXI';

// ─── Formation & Mentality Types ───

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2' | '3-4-3';
export type Mentality = 'defensive' | 'balanced' | 'attacking';

// ─── Formation Modifiers ───

const FORMATION_MODIFIERS: Record<Formation, { atk: number; def: number }> = {
  '4-4-2': { atk: 0, def: 0 },
  '4-3-3': { atk: 3, def: -1 },
  '3-5-2': { atk: 1, def: 2 },
  '4-2-3-1': { atk: 2, def: 1 },
  '5-3-2': { atk: -1, def: 4 },
  '3-4-3': { atk: 4, def: -2 },
};

// ─── Mentality Modifiers ───

const MENTALITY_MODIFIERS: Record<Mentality, { atk: number; def: number }> = {
  defensive: { atk: -3, def: 4 },
  balanced: { atk: 0, def: 0 },
  attacking: { atk: 4, def: -3 },
};

// ─── Position weights for goal scoring ───

const GOAL_SCORING_WEIGHTS: Record<Position, number> = {
  ST: 40,
  WG: 20,
  MF: 15,
  FB: 3,
  CB: 2,
  GK: 0.1,
};

// ─── Position weights for assists ───

const ASSIST_WEIGHTS: Record<Position, number> = {
  MF: 30,
  WG: 25,
  FB: 15,
  ST: 10,
  CB: 5,
  GK: 1,
};

// ─── Monthly fixture distribution (38 games over 10 months) ───

const MONTHLY_GAMEWEEK_RANGES: Record<string, [number, number]> = {
  august: [1, 4],
  september: [5, 8],
  october: [9, 12],
  november: [13, 15],
  december: [16, 19],
  january: [20, 23],
  february: [24, 27],
  march: [28, 30],
  april: [31, 34],
  may: [35, 38],
};

// ─── Injury Constants ───

const BASE_INJURY_CHANCE = 0.05;
const FRAGILE_INJURY_CHANCE = 0.10;
const DURABLE_INJURY_CHANCE = 0.02;

// ─── AI Formation/Mentality Selection ───

const TIER_FORMATION_WEIGHTS: Record<number, { formations: Formation[]; weights: number[] }> = {
  1: { formations: ['4-3-3', '4-2-3-1', '4-4-2', '3-4-3', '3-5-2', '5-3-2'], weights: [30, 30, 15, 10, 10, 5] },
  2: { formations: ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2'], weights: [25, 25, 20, 15, 8, 7] },
  3: { formations: ['4-4-2', '4-2-3-1', '4-3-3', '3-5-2', '5-3-2', '3-4-3'], weights: [25, 20, 20, 15, 12, 8] },
  4: { formations: ['4-4-2', '5-3-2', '4-2-3-1', '3-5-2', '4-3-3', '3-4-3'], weights: [25, 20, 20, 15, 12, 8] },
  5: { formations: ['5-3-2', '4-4-2', '4-2-3-1', '3-5-2', '4-3-3', '3-4-3'], weights: [28, 25, 18, 15, 10, 4] },
};

// ─── Fixture Generation ───

/**
 * Generate a full 38-game season schedule for 20 teams using a round-robin.
 * Each team plays every other team twice (home and away).
 */
export function generateFixtures(rng: SeededRNG, clubIds: string[]): Fixture[] {
  const n = clubIds.length; // 20
  const fixtures: Fixture[] = [];

  // Use a circle method for round-robin scheduling
  // With 20 teams, we need 38 gameweeks (19 rounds × 2 halves)
  const teams = [...clubIds];

  // Shuffle teams for variety
  for (let i = teams.length - 1; i > 0; i--) {
    const j = rng.randomInt(0, i);
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }

  const fixed = teams[0];
  const rotating = teams.slice(1);

  // First half: 19 gameweeks
  for (let round = 0; round < n - 1; round++) {
    const gameweek = round + 1;
    const currentTeams = [fixed, ...rotating];

    for (let i = 0; i < n / 2; i++) {
      const home = currentTeams[i];
      const away = currentTeams[n - 1 - i];

      // Alternate home/away for fairness
      if (round % 2 === 0) {
        fixtures.push({
          id: `gw${gameweek}-${i}`,
          homeClubId: home,
          awayClubId: away,
          gameweek,
          played: false,
          result: null,
        });
      } else {
        fixtures.push({
          id: `gw${gameweek}-${i}`,
          homeClubId: away,
          awayClubId: home,
          gameweek,
          played: false,
          result: null,
        });
      }
    }

    // Rotate: move last to second position
    rotating.unshift(rotating.pop()!);
  }

  // Second half: reverse home/away, gameweeks 20-38
  const firstHalfCount = fixtures.length;
  for (let i = 0; i < firstHalfCount; i++) {
    const orig = fixtures[i];
    const newGameweek = orig.gameweek + 19;
    fixtures.push({
      id: `gw${newGameweek}-${i % (n / 2)}`,
      homeClubId: orig.awayClubId,
      awayClubId: orig.homeClubId,
      gameweek: newGameweek,
      played: false,
      result: null,
    });
  }

  return fixtures;
}

/**
 * Get fixtures for a specific month phase.
 */
export function getMonthFixtures(fixtures: Fixture[], phase: GamePhase): Fixture[] {
  const range = MONTHLY_GAMEWEEK_RANGES[phase];
  if (!range) return [];
  return fixtures.filter((f) => f.gameweek >= range[0] && f.gameweek <= range[1]);
}

/**
 * Get the month phases in order (the 10 in-season months).
 */
export function getInSeasonPhases(): GamePhase[] {
  return ['august', 'september', 'october', 'november', 'december',
    'january', 'february', 'march', 'april', 'may'];
}

// ─── AI Decision Making ───

export function selectAIFormation(rng: SeededRNG, tier: number): Formation {
  const config = TIER_FORMATION_WEIGHTS[tier] || TIER_FORMATION_WEIGHTS[3];
  return rng.weightedPick(config.formations, config.weights);
}

export function selectAIMentality(
  rng: SeededRNG,
  _tier: number,
  leaguePosition: number,
  totalTeams: number,
): Mentality {
  // Teams fighting at the top or bottom play more aggressively
  const isChasing = leaguePosition <= 4;
  const isRelegation = leaguePosition >= totalTeams - 3;

  if (isChasing) {
    return rng.weightedPick(
      ['attacking', 'balanced', 'defensive'] as Mentality[],
      [40, 45, 15],
    );
  }
  if (isRelegation) {
    return rng.weightedPick(
      ['attacking', 'balanced', 'defensive'] as Mentality[],
      [35, 35, 30],
    );
  }
  // Mid-table: lean balanced
  return rng.weightedPick(
    ['attacking', 'balanced', 'defensive'] as Mentality[],
    [20, 55, 25],
  );
}

// ─── Fortune System ───

export interface ClubFortune {
  clubId: string;
  fortune: number;
  goldenGeneration: boolean;
  goldenSeasonsRemaining: number;
}

export function generateSeasonFortunes(
  rng: SeededRNG,
  clubs: { id: string; tier: number }[],
  previousFortunes?: ClubFortune[],
): ClubFortune[] {
  const fortunes: ClubFortune[] = [];

  for (const club of clubs) {
    // Check for existing golden generation
    const prev = previousFortunes?.find((f) => f.clubId === club.id);
    let goldenGen = false;
    let goldenRemaining = 0;

    if (prev?.goldenGeneration && prev.goldenSeasonsRemaining > 1) {
      goldenGen = true;
      goldenRemaining = prev.goldenSeasonsRemaining - 1;
    }

    // Fortune range by tier
    let fortune: number;
    if (goldenGen) {
      fortune = 8;
    } else {
      switch (club.tier) {
        case 1: fortune = rng.randomFloat(-3, 5); break;
        case 2: fortune = rng.randomFloat(-4, 4); break;
        case 3: fortune = rng.randomFloat(-4, 4); break;
        case 4: fortune = rng.randomFloat(-5, 3); break;
        case 5: fortune = rng.randomFloat(-5, 3); break;
        default: fortune = rng.randomFloat(-5, 5);
      }
    }

    fortunes.push({
      clubId: club.id,
      fortune: Math.round(fortune * 10) / 10,
      goldenGeneration: goldenGen,
      goldenSeasonsRemaining: goldenRemaining,
    });
  }

  // Golden generation event: every 3-5 seasons, one mid-tier team gets it
  // Probability ~25% per season for a new golden gen event (among teams not already golden)
  if (rng.random() < 0.25) {
    const eligible = fortunes.filter(
      (f) => !f.goldenGeneration && [3, 4, 5].includes(clubs.find((c) => c.id === f.clubId)!.tier),
    );
    if (eligible.length > 0) {
      const chosen = eligible[rng.randomInt(0, eligible.length - 1)];
      chosen.goldenGeneration = true;
      chosen.goldenSeasonsRemaining = 2;
      chosen.fortune = 8;
    }
  }

  return fortunes;
}

// ─── Team Strength Score (TSS) Calculation ───

export interface TSSConfig {
  formation: Formation;
  mentality: Mentality;
  isHome: boolean;
  fortune: number;
  managerReputation?: number;
  narrativeModifier?: number;
  preferredFormation?: string;
  captainId?: string;
}

/**
 * Calculate ATK/DEF/form components from a set of players.
 * Used for TSS sub-calculations within the Starting XI.
 */
function calculateSquadRatings(players: Player[]): { atkRating: number; defRating: number; avgForm: number } {
  if (players.length === 0) return { atkRating: 50, defRating: 50, avgForm: 0 };

  let totalAtk = 0;
  let totalDef = 0;
  let totalForm = 0;

  for (const player of players) {
    totalAtk += player.stats.ATK * 0.4 + player.stats.SKL * 0.3 + player.stats.MOV * 0.3;
    totalDef += player.stats.DEF * 0.4 + player.stats.PWR * 0.3 + player.stats.MEN * 0.3;
    totalForm += player.form;
  }

  return {
    atkRating: totalAtk / players.length,
    defRating: totalDef / players.length,
    avgForm: totalForm / players.length,
  };
}

/**
 * Calculate Team Strength Score (TSS) used for match resolution.
 *
 * v2 formula (Task 7.3): Uses Starting XI avg rating + SquadDepthBonus.
 *   TSS_squad = StartingXI_avg_overall + SquadDepthBonus
 *   (SquadDepthBonus: bench_avg >= 75: +2, >= 70: +1, >= 65: 0, < 65: -1)
 *
 * Accepts startingXIPlayers and benchPlayers separately.
 * ATK/DEF sub-ratings are still derived from the Starting XI for form/trait bonuses.
 */
export function calculateTSS(
  startingXIPlayers: Player[],
  benchPlayers: Player[],
  config: TSSConfig,
  isDerby: boolean,
  rng: SeededRNG,
): number {
  // Starting XI average overall + squad depth bonus
  const xiAvgOverall = startingXIPlayers.length > 0
    ? startingXIPlayers.reduce((sum, p) => sum + p.overall, 0) / startingXIPlayers.length
    : 50;
  const depthBonus = calculateSquadDepthBonus(benchPlayers);
  const baseRating = xiAvgOverall + depthBonus;

  // Form from the Starting XI only
  const { avgForm } = calculateSquadRatings(startingXIPlayers);

  // Formation modifier
  const formMod = FORMATION_MODIFIERS[config.formation];
  const formationBonus = (formMod.atk + formMod.def) / 2;

  // Mentality modifier
  const mentMod = MENTALITY_MODIFIERS[config.mentality];
  const mentalityBonus = (mentMod.atk + mentMod.def) / 2;

  // Home advantage
  const homeBonus = config.isHome ? 3 : 0;

  // Form modifier (average of Starting XI form values, -5 to +5)
  const formBonus = avgForm;

  // Derby chaos
  const derbyBonus = isDerby ? rng.randomFloat(0, 3) : 0;

  // Fortune (season-long modifier)
  const fortuneBonus = config.fortune;

  // Manager reputation bonus (0 to +3)
  const repBonus = config.managerReputation
    ? Math.min(3, config.managerReputation / 33)
    : 0;

  // Narrative event modifiers
  const narrativeBonus = config.narrativeModifier || 0;

  // Leader trait: +2 MEN equivalent if a Leader is in the Starting XI
  const hasLeader = startingXIPlayers.some((p) => p.trait === 'Leader' && !p.injured);
  const leaderBonus = hasLeader ? 1 : 0;

  // Preferred formation bonus: +1 ATK, +1 DEF (averages to +1 TSS)
  const preferredFormationBonus = config.preferredFormation && config.formation === config.preferredFormation ? 1 : 0;

  // Captain bonus: +2 TSS if the captain is in the Starting XI
  const captainBonus = config.captainId &&
    startingXIPlayers.some((p) => p.id === config.captainId)
    ? 2 : 0;

  return baseRating + formationBonus + mentalityBonus + homeBonus +
    formBonus + derbyBonus + fortuneBonus + repBonus + narrativeBonus + leaderBonus + preferredFormationBonus + captainBonus;
}

/**
 * Calculate goal expectancy for a team based on TSS and opponent TSS.
 * Incorporates formation/mentality ATK/DEF modifiers more directly.
 */
export function calculateGoalExpectancy(
  attackerTSS: number,
  defenderTSS: number,
  attackerFormation: Formation,
  attackerMentality: Mentality,
  defenderFormation: Formation,
  defenderMentality: Mentality,
  rng: SeededRNG,
): number {
  // Attacker's offensive power vs defender's defensive power
  const atkFormMod = FORMATION_MODIFIERS[attackerFormation].atk;
  const atkMenMod = MENTALITY_MODIFIERS[attackerMentality].atk;
  const defFormMod = FORMATION_MODIFIERS[defenderFormation].def;
  const defMenMod = MENTALITY_MODIFIERS[defenderMentality].def;

  const offensivePower = attackerTSS + atkFormMod + atkMenMod;
  const defensivePower = defenderTSS + defFormMod + defMenMod;

  // Goal expectancy formula
  const diff = offensivePower - defensivePower;
  const baseExp = 1.25 + diff * 0.04;

  // Add randomness
  const noise = rng.randomFloat(-0.3, 0.3);

  return Math.max(0.2, baseExp + noise);
}

// ─── Injury Processing ───

export interface InjuryReport {
  playerId: string;
  playerName: string;
  clubId: string;
  weeksOut: number;
}

export function processInjuries(
  rng: SeededRNG,
  players: Player[],
  clubId: string,
): InjuryReport[] {
  const injuries: InjuryReport[] = [];

  for (const player of players) {
    if (player.injured || player.isTemporary) continue;

    let chance = BASE_INJURY_CHANCE;
    if (player.trait === 'Fragile') chance = FRAGILE_INJURY_CHANCE;
    if (player.trait === 'Durable') chance = DURABLE_INJURY_CHANCE;

    // Goalkeepers are much less prone to injury
    if (player.position === 'GK') chance *= 0.25;

    if (rng.random() < chance) {
      // Duration: 1-3 months, weighted toward shorter
      let duration: number;
      if (player.trait === 'Durable') {
        duration = 1; // Durable players never get long-term injuries
      } else {
        duration = rng.weightedPick([1, 2, 3], [60, 30, 10]);
      }

      injuries.push({
        playerId: player.id,
        playerName: player.name,
        clubId,
        weeksOut: duration,
      });
    }
  }

  return injuries;
}

/**
 * Heal injuries: decrease injuryWeeks by 1 for all injured players.
 * Returns list of recovered player IDs.
 */
export function healInjuries(players: Player[]): string[] {
  const recovered: string[] = [];
  for (const player of players) {
    if (player.injured) {
      player.injuryWeeks--;
      if (player.injuryWeeks <= 0) {
        player.injured = false;
        player.injuryWeeks = 0;
        recovered.push(player.id);
      }
    }
  }
  return recovered;
}

// ─── Temporary Fill-In Generation ───

export function generateTempFillIn(
  rng: SeededRNG,
  position: Position,
  clubId: string,
  fillInIndex: number,
): Player {
  const targetRating = rng.randomInt(40, 50);
  const player = generatePlayer(
    rng,
    position,
    targetRating,
    [{ nationality: 'english', weight: 100 }],
    `${clubId}-fillin-${fillInIndex}`,
  );
  player.isTemporary = true;
  player.highPotential = false;
  player.earlyPeaker = false;
  return player;
}

/**
 * Get available players for a club, generating temp fill-ins if positions are empty.
 */
export function getAvailableSquad(
  roster: Player[],
  rng: SeededRNG,
  clubId: string,
): { available: Player[]; fillIns: Player[] } {
  const available = roster.filter((p) => !p.injured);
  const fillIns: Player[] = [];

  // Check each position has at least 1 available player
  const positions: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];
  let fillInIndex = 0;

  for (const pos of positions) {
    const posPlayers = available.filter((p) => p.position === pos);
    if (posPlayers.length === 0) {
      // Need a fill-in
      const fillIn = generateTempFillIn(rng, pos, clubId, fillInIndex++);
      fillIns.push(fillIn);
      available.push(fillIn);
    }
  }

  return { available, fillIns };
}

// ─── Goal & Assist Assignment ───

function assignGoalScorers(
  rng: SeededRNG,
  players: Player[],
  goals: number,
  isHome: boolean,
  isDerby: boolean,
): { playerId: string; minute: number; isHome: boolean }[] {
  if (goals === 0 || players.length === 0) return [];

  const scorers: { playerId: string; minute: number; isHome: boolean }[] = [];

  // Build weight array: position weight * ATK stat
  const weights = players.map((p) => {
    let weight = GOAL_SCORING_WEIGHTS[p.position] * (p.stats.ATK / 50);
    // Clutch trait boost in derbies
    if (isDerby && p.trait === 'Clutch') weight *= 1.5;
    // Flair trait boost
    if (p.trait === 'Flair') weight *= 1.2;
    return Math.max(0.1, weight);
  });

  for (let i = 0; i < goals; i++) {
    const scorer = rng.weightedPick(players, weights);
    const minute = rng.randomInt(1, 90);
    scorers.push({ playerId: scorer.id, minute, isHome });
  }

  return scorers;
}

function assignAssisters(
  rng: SeededRNG,
  players: Player[],
  goals: number,
  isHome: boolean,
  scorerIds: string[],
): { playerId: string; minute: number; isHome: boolean }[] {
  if (goals === 0 || players.length === 0) return [];

  const assisters: { playerId: string; minute: number; isHome: boolean }[] = [];

  const weights = players.map((p) => {
    const weight = ASSIST_WEIGHTS[p.position] * (p.stats.SKL / 50);
    return Math.max(0.1, weight);
  });

  for (let i = 0; i < goals; i++) {
    // ~75% chance of an assist being assigned
    if (rng.random() < 0.75) {
      let assister: Player;
      // Ensure assister is not the scorer
      let attempts = 0;
      do {
        assister = rng.weightedPick(players, weights);
        attempts++;
      } while (assister.id === scorerIds[i] && attempts < 5 && players.length > 1);

      if (assister.id !== scorerIds[i]) {
        assisters.push({ playerId: assister.id, minute: rng.randomInt(1, 90), isHome });
      }
    }
  }

  return assisters;
}

// ─── Form Update ───

export function updatePlayerForm(rng: SeededRNG, player: Player): number {
  // Form drifts randomly each month: -2 to +2, weighted toward 0
  let shift = rng.weightedPick([-2, -1, 0, 1, 2], [10, 25, 30, 25, 10]);

  // Inconsistent trait: doubled form swings
  if (player.trait === 'Inconsistent') {
    shift *= 2;
  }

  const newForm = Math.max(-5, Math.min(5, player.form + shift));
  return newForm;
}

// ─── Match Resolution ───

export interface MatchContext {
  homeClub: Club;
  awayClub: Club;
  fixture: Fixture;
  homeFormation: Formation;
  awayFormation: Formation;
  homeMentality: Mentality;
  awayMentality: Mentality;
  homeFortune: number;
  awayFortune: number;
  homeReputation?: number;
  awayReputation?: number;
  homeNarrativeMod?: number;
  awayNarrativeMod?: number;
  homePreferredFormation?: string;
  awayPreferredFormation?: string;
  homeStartingXI?: StartingXIMap;
  awayStartingXI?: StartingXIMap;
  homeCaptainId?: string;
  awayCaptainId?: string;
  seasonSeed: string;
}

export function simulateMatch(
  context: MatchContext,
): MatchResult {
  const rng = new SeededRNG(matchSeed(context.seasonSeed, context.fixture.id));

  // Check if derby
  const isDerby = context.homeClub.rivalries.includes(context.awayClub.id) ||
    context.awayClub.rivalries.includes(context.homeClub.id);

  // Get available squads (still needed for temp fill-ins)
  const homeSquad = getAvailableSquad(context.homeClub.roster, rng, context.homeClub.id);
  const awaySquad = getAvailableSquad(context.awayClub.roster, rng, context.awayClub.id);

  // Resolve Starting XI for each team.
  // If a Starting XI is provided, use it. Otherwise auto-select.
  const homeXI = context.homeStartingXI || autoSelectXI(context.homeFormation, homeSquad.available);
  const awayXI = context.awayStartingXI || autoSelectXI(context.awayFormation, awaySquad.available);

  const homeXIPlayers = getStartingXIPlayers(homeXI, homeSquad.available);
  const awayXIPlayers = getStartingXIPlayers(awayXI, awaySquad.available);
  const homeBenchPlayers = getBenchPlayers(homeXI, homeSquad.available);
  const awayBenchPlayers = getBenchPlayers(awayXI, awaySquad.available);

  // Calculate TSS with Starting XI + depth
  const homeTSS = calculateTSS(
    homeXIPlayers,
    homeBenchPlayers,
    {
      formation: context.homeFormation,
      mentality: context.homeMentality,
      isHome: true,
      fortune: context.homeFortune,
      managerReputation: context.homeReputation,
      narrativeModifier: context.homeNarrativeMod,
      preferredFormation: context.homePreferredFormation,
      captainId: context.homeCaptainId,
    },
    isDerby,
    rng,
  );

  const awayTSS = calculateTSS(
    awayXIPlayers,
    awayBenchPlayers,
    {
      formation: context.awayFormation,
      mentality: context.awayMentality,
      isHome: false,
      fortune: context.awayFortune,
      managerReputation: context.awayReputation,
      narrativeModifier: context.awayNarrativeMod,
      preferredFormation: context.awayPreferredFormation,
      captainId: context.awayCaptainId,
    },
    isDerby,
    rng,
  );

  // Calculate goal expectancy for each team
  const homeGoalExp = calculateGoalExpectancy(
    homeTSS, awayTSS,
    context.homeFormation, context.homeMentality,
    context.awayFormation, context.awayMentality,
    rng,
  );

  const awayGoalExp = calculateGoalExpectancy(
    awayTSS, homeTSS,
    context.awayFormation, context.awayMentality,
    context.homeFormation, context.homeMentality,
    rng,
  );

  // Generate goals using Poisson distribution
  const homeGoals = rng.poissonRandom(homeGoalExp);
  const awayGoals = rng.poissonRandom(awayGoalExp);

  // Assign scorers and assisters from Starting XI only
  const homeScorers = assignGoalScorers(rng, homeXIPlayers, homeGoals, true, isDerby);
  const awayScorers = assignGoalScorers(rng, awayXIPlayers, awayGoals, false, isDerby);

  const homeAssisters = assignAssisters(
    rng, homeXIPlayers, homeGoals, true,
    homeScorers.map((s) => s.playerId),
  );
  const awayAssisters = assignAssisters(
    rng, awayXIPlayers, awayGoals, false,
    awayScorers.map((s) => s.playerId),
  );

  return {
    fixtureId: context.fixture.id,
    homeClubId: context.homeClub.id,
    awayClubId: context.awayClub.id,
    homeGoals,
    awayGoals,
    isDerby,
    scorers: [...homeScorers, ...awayScorers],
    assisters: [...homeAssisters, ...awayAssisters],
    homeStartingXI: homeXI,
    awayStartingXI: awayXI,
  };
}

// ─── League Table Helpers ───

export function createEmptyTable(clubIds: string[]): LeagueTableRow[] {
  return clubIds.map((clubId) => ({
    clubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  }));
}

export function updateTable(table: LeagueTableRow[], result: MatchResult): LeagueTableRow[] {
  return table.map((row) => {
    if (row.clubId === result.homeClubId) {
      const won = result.homeGoals > result.awayGoals;
      const drawn = result.homeGoals === result.awayGoals;
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (won ? 1 : 0),
        drawn: row.drawn + (drawn ? 1 : 0),
        lost: row.lost + (!won && !drawn ? 1 : 0),
        goalsFor: row.goalsFor + result.homeGoals,
        goalsAgainst: row.goalsAgainst + result.awayGoals,
        goalDifference: row.goalDifference + result.homeGoals - result.awayGoals,
        points: row.points + (won ? 3 : drawn ? 1 : 0),
      };
    }
    if (row.clubId === result.awayClubId) {
      const won = result.awayGoals > result.homeGoals;
      const drawn = result.homeGoals === result.awayGoals;
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (won ? 1 : 0),
        drawn: row.drawn + (drawn ? 1 : 0),
        lost: row.lost + (!won && !drawn ? 1 : 0),
        goalsFor: row.goalsFor + result.awayGoals,
        goalsAgainst: row.goalsAgainst + result.homeGoals,
        goalDifference: row.goalDifference + result.awayGoals - result.homeGoals,
        points: row.points + (won ? 3 : drawn ? 1 : 0),
      };
    }
    return row;
  });
}

export function sortTable(table: LeagueTableRow[]): LeagueTableRow[] {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

export function getLeaguePosition(table: LeagueTableRow[], clubId: string): number {
  const sorted = sortTable(table);
  return sorted.findIndex((r) => r.clubId === clubId) + 1;
}
