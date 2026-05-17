import type {
  Player,
  Position,
  Club,
  Fixture,
  MatchResult,
  LeagueTableRow,
  GamePhase,
  StartingXIMap,
  PlayingBackground,
  ActiveModifier,
} from '@/types/entities';
import { SeededRNG } from '@/utils/rng';
import { matchSeed } from '@/utils/rng';
import { generatePlayer } from './playerGen';
import {
  autoSelectXI,
  getStartingXIPlayers,
  getBenchPlayers,
  calculateSquadDepthBonus,
} from './startingXI';
import { getBackgroundEffects } from './managerBackground';
import { BALANCE } from '@/data/balance';
import {
  computeTeamModifiers,
  getEffectivePlayer,
  EMPTY_TEAM_MODS,
  type TeamModifiers,
} from './modifierEffects';
import type { InstructionContext, InstructionEffect } from '@/types/tactics';
import { INSTRUCTION_TSS_CAP, getInstructionCard } from '@/data/instructionCards';

// ─── Formation & Mentality Types ───

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2' | '3-4-3';
export type Mentality = 'defensive' | 'balanced' | 'attacking';

// ─── Formation & Mentality Modifiers (sourced from balance config) ───

const FORMATION_MODIFIERS = BALANCE.formationModifiers;
const MENTALITY_MODIFIERS = BALANCE.mentalityModifiers;

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

// ─── Injury Constants (sourced from balance config) ───

const BASE_INJURY_CHANCE: number = BALANCE.injury.base;
const FRAGILE_INJURY_CHANCE: number = BALANCE.injury.fragile;
const DURABLE_INJURY_CHANCE: number = BALANCE.injury.durable;

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
  // Additive fraction of the Starting XI base rating, applied once.
  // Used by manager-background match perks (former-pro, never-played).
  userTSSBoostPct?: number;
  /** Squad-wide modifier bundle (TSS/TSS_HOME/TSS_UNDERDOG/DERBY_CHAOS/
   *  FORMATION_DOUBLE/squadFormShift). Optional — defaults to no effect. */
  teamModifiers?: TeamModifiers;
  /** TSS of the opposing team (post-baseline) — used to gate TSS_UNDERDOG. */
  opponentBaseRating?: number;
  /**
   * Phase B: the player's active Instruction card effect, if equipped.
   * AI sides leave this undefined. Evaluated against `instructionContext`
   * (or the implicit one derived from this TSSConfig) and capped at
   * INSTRUCTION_TSS_CAP before being added.
   */
  instructionEffect?: InstructionEffect;
  /**
   * Whether the match is an FA Cup tie. Surfaces to the instruction
   * condition function so cup-only cards (e.g. "Cup Tied") can fire.
   * League fixtures pass false / omit.
   */
  isCup?: boolean;
  /**
   * Opposing club tier (1=top, 5=bottom) — exposed to instruction conditions
   * so cards like "Big Game" or "Bully Pulpit" can gate on opponent strength.
   */
  opponentTier?: number;
  /**
   * Whether this is a derby fixture — also surfaced to instruction conditions
   * ("Derby Day" only fires when this is true).
   */
  isDerby?: boolean;
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

  const teamMods = config.teamModifiers ?? EMPTY_TEAM_MODS;

  // Formation modifier — doubled by FORMATION_DOUBLE event modifier.
  const formMod = FORMATION_MODIFIERS[config.formation];
  let formationBonus = (formMod.atk + formMod.def) / 2;
  if (teamMods.formationDoubleActive) formationBonus *= 2;

  // Mentality modifier
  const mentMod = MENTALITY_MODIFIERS[config.mentality];
  const mentalityBonus = (mentMod.atk + mentMod.def) / 2;

  // Home advantage — TSS_HOME modifier piles onto the standard home bonus.
  const homeBonus = config.isHome
    ? BALANCE.match.homeBonus + (teamMods.tssHomeBonus || 0)
    : 0;

  // Form modifier (average of Starting XI form values + squad-wide FORM shift)
  const formBonus = avgForm + (teamMods.squadFormShift || 0);

  // Derby chaos — DERBY_CHAOS modifier widens the random range.
  const derbyBonus = isDerby
    ? rng.randomFloat(0, BALANCE.match.derbyBonusMax + (teamMods.derbyChaosBonus || 0))
    : 0;

  // Fortune (season-long modifier)
  const fortuneBonus = config.fortune;

  // Manager reputation bonus — meaningful at high rep, never decisive
  const repBonus = config.managerReputation
    ? Math.min(
        BALANCE.reputation.matchBonusMax,
        config.managerReputation / BALANCE.reputation.matchBonusDivisor,
      )
    : 0;

  // Narrative event modifiers
  const narrativeBonus = config.narrativeModifier || 0;

  // Leader trait
  const hasLeader = startingXIPlayers.some((p) => p.trait === 'Leader' && !p.injured);
  const leaderBonus = hasLeader ? BALANCE.match.leaderBonus : 0;

  // Preferred formation bonus
  const preferredFormationBonus = config.preferredFormation && config.formation === config.preferredFormation
    ? BALANCE.match.preferredFormationBonus
    : 0;

  // Captain bonus
  const captainBonus = config.captainId &&
    startingXIPlayers.some((p) => p.id === config.captainId)
    ? BALANCE.match.captainBonus : 0;

  const userBackgroundBonus = baseRating * (config.userTSSBoostPct ?? 0);

  // Squad-wide event bonuses (TSS direct + underdog kicker when we trail
  // the opponent's base XI rating, e.g. heavy-rain advantage).
  const tssEventBonus = teamMods.tssBonus || 0;
  const underdogBonus =
    teamMods.tssUnderdogBonus && config.opponentBaseRating !== undefined &&
    baseRating < config.opponentBaseRating
      ? teamMods.tssUnderdogBonus
      : 0;

  // Phase B: instruction-card contribution. Effect is gated by its condition
  // (if any), evaluated against an InstructionContext derived from this
  // TSSConfig, and the net (atk+def)/2 contribution is capped at
  // INSTRUCTION_TSS_CAP so a single card can't blow past the design envelope.
  const instructionContribution = evaluateInstructionEffect(
    config.instructionEffect,
    {
      isHome: config.isHome,
      isDerby: config.isDerby ?? isDerby,
      isCup: config.isCup ?? false,
      opponentBaseRating: config.opponentBaseRating ?? baseRating,
      selfBaseRating: baseRating,
      opponentTier: config.opponentTier ?? 3,
    },
  );

  return baseRating + formationBonus + mentalityBonus + homeBonus +
    formBonus + derbyBonus + fortuneBonus + repBonus + narrativeBonus + leaderBonus +
    preferredFormationBonus + captainBonus + userBackgroundBonus + tssEventBonus + underdogBonus +
    instructionContribution.tss + instructionContribution.form;
}

/**
 * Resolve an InstructionEffect against a context and return its capped TSS
 * contribution + form modifier. Exported so tests can hit it directly without
 * spinning up a full match.
 *
 * The cap is one-sided: net (atk+def)/2 is clamped to ±INSTRUCTION_TSS_CAP.
 * Form is not capped here; instruction form swings are small by convention
 * and the squad form bonus has its own implicit floor/ceiling via the
 * underlying [-5, 5] form clamp.
 */
export function evaluateInstructionEffect(
  effect: InstructionEffect | undefined,
  ctx: InstructionContext,
): { tss: number; form: number } {
  if (!effect) return { tss: 0, form: 0 };
  if (effect.condition && !effect.condition(ctx)) return { tss: 0, form: 0 };
  const rawTss = (effect.atkMod + effect.defMod) / 2;
  const cappedTss = Math.max(-INSTRUCTION_TSS_CAP, Math.min(INSTRUCTION_TSS_CAP, rawTss));
  return { tss: cappedTss, form: effect.formMod };
}

/**
 * Resolve an instruction card id to its effect. Returns undefined if the id
 * is missing, unknown, or the card has no effect (e.g. a shape/tempo card
 * was wired in by mistake — defensive).
 */
export function resolveInstructionEffect(cardId: string | null | undefined): InstructionEffect | undefined {
  if (!cardId) return undefined;
  const card = getInstructionCard(cardId);
  return card?.effect;
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

  // Saturating goal-expectancy curve. Big TSS gaps still matter but plateau,
  // so the league stays competitive and "magic of the cup" upsets stay alive.
  // At diff = 10 → +0.35; diff = 25 → +0.6; diff = 50 → +0.9.
  const diff = offensivePower - defensivePower;
  const { baseGoals, diffScale, diffCoeff, noiseRange, minExpectedGoals } = BALANCE.match;
  const curveBonus = Math.sign(diff) * Math.log1p(Math.abs(diff) / diffScale) * diffCoeff;
  const baseExp = baseGoals + curveBonus;

  const noise = rng.randomFloat(-noiseRange, noiseRange);

  return Math.max(minExpectedGoals, baseExp + noise);
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

    if (player.position === 'GK') chance *= BALANCE.injury.gkMultiplier;

    if (rng.random() < chance) {
      let duration: number;
      if (player.trait === 'Durable') {
        // Durable players never suffer long-term injuries
        duration = 1;
      } else {
        // Position-aware duration: wingers/strikers more likely to miss longer
        const weights = BALANCE.injury.durationWeightsByPosition[player.position];
        const buckets = [1, 2, 3, BALANCE.injury.seasonEndingMonths];
        duration = rng.weightedPick(buckets, [...weights]);
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

// ─── Man of the Match ───

/**
 * Pick the single best performer across both Starting XIs.
 *
 * Composite score:
 *   - goals × 5, assists × 2.5
 *   - GK on a clean sheet: +4; per goal conceded: −1 (floor at the contribution)
 *   - CB/FB on a clean sheet: +1.5
 *   - form × 0.5, (overall − 75) × 0.1
 *   - winning team kicker +0.6
 *   - small RNG jitter so ties don't always resolve in roster-iteration order
 *
 * Returns the playerId with the highest score, or undefined if no candidates
 * exist (defensive — both XIs would have to be empty).
 */
function pickManOfTheMatch(
  rng: SeededRNG,
  homeXIPlayers: Player[],
  awayXIPlayers: Player[],
  homeGoals: number,
  awayGoals: number,
  scorers: { playerId: string; isHome: boolean }[],
  assisters: { playerId: string; isHome: boolean }[],
): string | undefined {
  if (homeXIPlayers.length === 0 && awayXIPlayers.length === 0) return undefined;

  const goalsBy = new Map<string, number>();
  for (const s of scorers) goalsBy.set(s.playerId, (goalsBy.get(s.playerId) || 0) + 1);
  const assistsBy = new Map<string, number>();
  for (const a of assisters) assistsBy.set(a.playerId, (assistsBy.get(a.playerId) || 0) + 1);

  const homeWon = homeGoals > awayGoals;
  const awayWon = awayGoals > homeGoals;

  let bestId: string | undefined;
  let bestScore = -Infinity;

  const scoreOne = (p: Player, isHome: boolean) => {
    const g = goalsBy.get(p.id) || 0;
    const a = assistsBy.get(p.id) || 0;
    const conceded = isHome ? awayGoals : homeGoals;
    let s = g * 5 + a * 2.5 + (p.form ?? 0) * 0.5 + (p.overall - 75) * 0.1;

    if (p.position === 'GK') {
      s += conceded === 0 ? 4 : -conceded;
    } else if ((p.position === 'CB' || p.position === 'FB') && conceded === 0) {
      s += 1.5;
    }

    if ((isHome && homeWon) || (!isHome && awayWon)) s += 0.6;
    s += rng.randomFloat(-0.25, 0.25);
    return s;
  };

  for (const p of homeXIPlayers) {
    const s = scoreOne(p, true);
    if (s > bestScore) { bestScore = s; bestId = p.id; }
  }
  for (const p of awayXIPlayers) {
    const s = scoreOne(p, false);
    if (s > bestScore) { bestScore = s; bestId = p.id; }
  }

  return bestId;
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
  // User-club identity for manager-background match perks. Optional so
  // headless tests and AI-only sims keep their existing call shape.
  userClubId?: string;
  userBackground?: PlayingBackground;
  /**
   * Active modifiers (from event engine) that should be applied to the
   * player's club for this match. Filtered by targetClubId; club-wide and
   * player-targeted effects both flow through here.
   */
  activeModifiers?: ActiveModifier[];
  /**
   * Phase B: id of the user's currently equipped Instruction card, if any.
   * Only applied to whichever side (home or away) is the user's club —
   * AI sides never get an instruction effect. Resolved inside simulateMatch
   * via resolveInstructionEffect so callers don't need to import the data.
   */
  userInstructionCardId?: string | null;
  /**
   * Phase B: true when this match is an FA Cup fixture (vs league).
   * Surfaced to instruction conditions so "Cup Tied" etc. fire correctly.
   */
  isCup?: boolean;
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

  let homeXIPlayers = getStartingXIPlayers(homeXI, homeSquad.available);
  let awayXIPlayers = getStartingXIPlayers(awayXI, awaySquad.available);
  let homeBenchPlayers = getBenchPlayers(homeXI, homeSquad.available);
  let awayBenchPlayers = getBenchPlayers(awayXI, awaySquad.available);

  // Apply per-player event modifiers (effective stats/form/overall) — only
  // for the club they target. AI-side clubs typically have no modifiers
  // since events are scoped to the user's club.
  if (context.activeModifiers && context.activeModifiers.length > 0) {
    const mods = context.activeModifiers;
    homeXIPlayers = homeXIPlayers.map((p) => getEffectivePlayer(p, mods, context.homeClub.id));
    awayXIPlayers = awayXIPlayers.map((p) => getEffectivePlayer(p, mods, context.awayClub.id));
    homeBenchPlayers = homeBenchPlayers.map((p) => getEffectivePlayer(p, mods, context.homeClub.id));
    awayBenchPlayers = awayBenchPlayers.map((p) => getEffectivePlayer(p, mods, context.awayClub.id));
  }

  // Squad-wide modifier bundles (TSS_HOME/UNDERDOG/DERBY_CHAOS/FORMATION_DOUBLE…)
  const homeTeamMods = computeTeamModifiers(context.activeModifiers, context.homeClub.id);
  const awayTeamMods = computeTeamModifiers(context.activeModifiers, context.awayClub.id);

  // Opponent base ratings — referenced by the TSS_UNDERDOG gate. We measure
  // the bare XI average (no modifiers) on each side so the gate decision is
  // symmetric and doesn't depend on which TSS pass runs first.
  const homeBaseRating = homeXIPlayers.length > 0
    ? homeXIPlayers.reduce((s, p) => s + p.overall, 0) / homeXIPlayers.length
    : 50;
  const awayBaseRating = awayXIPlayers.length > 0
    ? awayXIPlayers.reduce((s, p) => s + p.overall, 0) / awayXIPlayers.length
    : 50;

  // Manager-background match boost — applied only to the user's side.
  const sameTier = context.homeClub.tier === context.awayClub.tier;
  const bgEffects = getBackgroundEffects(context.userBackground);
  const homeUserBoost = context.userClubId === context.homeClub.id
    ? bgEffects.matchTSSPct({ isRival: isDerby, sameTier, rng })
    : 0;
  const awayUserBoost = context.userClubId === context.awayClub.id
    ? bgEffects.matchTSSPct({ isRival: isDerby, sameTier, rng })
    : 0;

  // Phase B: instruction-card effect, resolved once and routed to whichever
  // side is the user's club. AI sides leave instructionEffect undefined.
  const userInstructionEffect = resolveInstructionEffect(context.userInstructionCardId);
  const homeInstructionEffect = context.userClubId === context.homeClub.id ? userInstructionEffect : undefined;
  const awayInstructionEffect = context.userClubId === context.awayClub.id ? userInstructionEffect : undefined;
  const isCupMatch = context.isCup ?? false;

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
      userTSSBoostPct: homeUserBoost,
      teamModifiers: homeTeamMods,
      opponentBaseRating: awayBaseRating,
      instructionEffect: homeInstructionEffect,
      isCup: isCupMatch,
      opponentTier: context.awayClub.tier,
      isDerby,
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
      userTSSBoostPct: awayUserBoost,
      teamModifiers: awayTeamMods,
      opponentBaseRating: homeBaseRating,
      instructionEffect: awayInstructionEffect,
      isCup: isCupMatch,
      opponentTier: context.homeClub.tier,
      isDerby,
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

  const allScorers = [...homeScorers, ...awayScorers];
  const allAssisters = [...homeAssisters, ...awayAssisters];

  const manOfTheMatchId = pickManOfTheMatch(
    rng, homeXIPlayers, awayXIPlayers, homeGoals, awayGoals, allScorers, allAssisters,
  );

  return {
    fixtureId: context.fixture.id,
    homeClubId: context.homeClub.id,
    awayClubId: context.awayClub.id,
    homeGoals,
    awayGoals,
    isDerby,
    scorers: allScorers,
    assisters: allAssisters,
    homeStartingXI: homeXI,
    awayStartingXI: awayXI,
    manOfTheMatchId,
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
