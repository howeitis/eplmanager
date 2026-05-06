import type { Player, Position, Club, ClubData } from '../types/entities';
import { SeededRNG } from '../utils/rng';
import { generatePlayer, calculateOverall, calculateMarketValue } from './playerGen';
import { BALANCE } from '../data/balance';

// ─── Age Bracket Definitions ───

interface AgeBracket {
  minAge: number;
  maxAge: number;
  label: string;
  statMin: number;
  statMax: number;
  /** Stats most affected by decline (for decline brackets) */
  primaryStats?: (keyof Player['stats'])[];
}

const AGE_BRACKETS: AgeBracket[] = [
  { minAge: 17, maxAge: 20, label: 'Rapid growth', statMin: 3, statMax: 8 },
  { minAge: 21, maxAge: 24, label: 'Growth', statMin: 1, statMax: 4 },
  { minAge: 25, maxAge: 29, label: 'Prime', statMin: -1, statMax: 2 },
  { minAge: 30, maxAge: 32, label: 'Early decline', statMin: -4, statMax: -1, primaryStats: ['MOV', 'PWR'] },
  { minAge: 33, maxAge: 35, label: 'Decline', statMin: -7, statMax: -3 },
  { minAge: 36, maxAge: 99, label: 'Retirement risk', statMin: -10, statMax: -5 },
];

const RETIREMENT_CHANCE_33_34 = 0.12;
const RETIREMENT_CHANCE_35 = 0.30;
const RETIREMENT_CHANCE_36_PLUS = 0.70;

// ─── Stat Change Calculation ───

function getBracket(age: number): AgeBracket {
  for (const bracket of AGE_BRACKETS) {
    if (age >= bracket.minAge && age <= bracket.maxAge) return bracket;
  }
  return AGE_BRACKETS[AGE_BRACKETS.length - 1];
}

/**
 * Apply aging stat changes to a player. Returns the updated stats and overall.
 * Does not mutate the player — returns new values.
 */
export function calculateAgingChanges(
  rng: SeededRNG,
  player: Player,
): { stats: Player['stats']; overall: number; retired: boolean } {
  const bracket = getBracket(player.age);
  const statKeys: (keyof Player['stats'])[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];
  const newStats = { ...player.stats };

  // Check retirement — escalating chance by age bracket
  if (player.age >= 36) {
    if (rng.random() < RETIREMENT_CHANCE_36_PLUS) {
      return { stats: newStats, overall: player.overall, retired: true };
    }
  } else if (player.age === 35) {
    if (rng.random() < RETIREMENT_CHANCE_35) {
      return { stats: newStats, overall: player.overall, retired: true };
    }
  } else if (player.age >= 33) {
    if (rng.random() < RETIREMENT_CHANCE_33_34) {
      return { stats: newStats, overall: player.overall, retired: true };
    }
  }

  // High potential amplification: +5 to +10 during development phase (17-24)
  let effectiveMin = bracket.statMin;
  let effectiveMax = bracket.statMax;

  if (player.highPotential && player.age <= 24) {
    effectiveMin = Math.max(effectiveMin, 5);
    effectiveMax = Math.max(effectiveMax, 10);
  }

  // Early peaker: hits ceiling by 24, declines by 27
  if (player.earlyPeaker) {
    const [stallMin, stallMax] = BALANCE.aging.earlyPeakerStallRange;
    const [declineMin, declineMax] = BALANCE.aging.earlyPeakerDeclineRange;
    if (player.age >= 24 && player.age <= 26) {
      effectiveMin = stallMin;
      effectiveMax = stallMax;
    } else if (player.age >= 27) {
      effectiveMin = declineMin;
      effectiveMax = declineMax;
    }
  }

  // Trait nudges to decline brackets only — Durable ages slower, Fragile faster.
  // Capped at 0 so Durable can't turn a decline year into growth.
  if (effectiveMax <= 0) {
    const traitMod =
      player.trait === 'Durable' ? BALANCE.aging.traitDeclineMod.Durable :
      player.trait === 'Fragile' ? BALANCE.aging.traitDeclineMod.Fragile : 0;
    effectiveMin = Math.min(0, effectiveMin + traitMod);
    effectiveMax = Math.min(0, effectiveMax + traitMod);
  }

  // Calculate total stat change budget, then distribute across stats
  const totalChange = rng.randomInt(effectiveMin, effectiveMax);

  // Distribute change across stats, weighted by position relevance
  // In decline, primary stats (MOV, PWR) get hit harder
  for (const key of statKeys) {
    let change: number;

    if (totalChange > 0) {
      // Growth: distribute randomly but each stat gets a share
      change = rng.randomInt(0, Math.max(1, Math.ceil(totalChange / 3)));
    } else if (totalChange < 0) {
      // Decline: primary stats get hit harder
      if (bracket.primaryStats?.includes(key)) {
        change = rng.randomInt(Math.floor(totalChange / 2), 0);
      } else {
        change = rng.randomInt(Math.floor(totalChange / 4), 0);
      }
    } else {
      change = rng.randomInt(-1, 1);
    }

    newStats[key] = Math.max(1, Math.min(99, newStats[key] + change));
  }

  const newOverall = calculateOverall(newStats, player.position);

  return { stats: newStats, overall: newOverall, retired: false };
}

// ─── Regen Generation ───

/**
 * Tier-based regen rating ranges.
 * Top-tier clubs have better academies producing higher-rated youth players.
 * This maintains the competitive hierarchy across multi-season simulations.
 */
const REGEN_RATING_RANGES: Record<number, [number, number]> = {
  1: [65, 77], // Elite academies — can produce first-team quality
  2: [62, 73], // Strong academies
  3: [58, 69], // Solid academies
  4: [55, 65], // Modest academies
  5: [52, 62], // Basic academies
};

/**
 * Generate a replacement player (regen) for a retired player.
 * The regen is a young player at the same position with a rating based on the club's tier.
 * ~8% chance to produce a "star boy" — a youth prospect significantly above the normal range.
 */
export function generateRegen(
  rng: SeededRNG,
  position: Position,
  club: ClubData | Club,
  regenId: string,
  youthBoost: number = 0,
): Player {
  const [rangeMin, rangeMax] = REGEN_RATING_RANGES[club.tier] || REGEN_RATING_RANGES[3];

  let targetRating: number;
  const starBoyRoll = rng.random();
  if (starBoyRoll < 0.08) {
    // Star boy: 6–12 points above the normal range ceiling
    const starBoost = rng.randomInt(6, 12);
    targetRating = Math.min(88, rangeMax + starBoost + youthBoost);
  } else {
    targetRating = rng.randomInt(rangeMin + youthBoost, rangeMax + youthBoost);
  }

  const regen = generatePlayer(rng, position, targetRating, club.namePool, regenId);
  regen.age = rng.randomInt(17, 20);
  regen.highPotential = starBoyRoll < 0.08 ? true : rng.random() < 0.20;
  regen.earlyPeaker = false;
  regen.seasonsAtClub = 0;
  return regen;
}

/**
 * Annual youth intake: every club promotes at least one academy graduate per
 * season, plus one extra per retiring player (1 + retireCount). Guarantees
 * the youth pack at the start of each new season and scales with turnover.
 */
export function annualYouthIntake(
  rng: SeededRNG,
  club: Club,
  seasonNumber: number,
  retireCount: number = 0,
  extraCount: number = 0,
): Player[] {
  const intakeCount = 1 + Math.max(0, retireCount) + Math.max(0, extraCount);
  const positions: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];
  const newPlayers: Player[] = [];

  for (let i = 0; i < intakeCount; i++) {
    const pos = positions[rng.randomInt(0, positions.length - 1)];
    const regenId = `${club.id}-youth-s${seasonNumber}-${i}`;
    const player = generateRegen(rng, pos, club, regenId);
    player.age = rng.randomInt(17, 19); // Academy graduates skew younger
    player.homegrown = true;
    newPlayers.push(player);
    club.roster.push(player);
  }

  return newPlayers;
}

// ─── Season End Processing ───

export interface AgingResult {
  clubId: string;
  retired: { player: Player; replacement: Player }[];
  developed: { playerId: string; oldOverall: number; newOverall: number }[];
}

/**
 * Process aging for an entire club at season end.
 * Returns retired players and their replacements, plus development changes.
 */
export function processClubAging(
  rng: SeededRNG,
  club: Club,
  seasonNumber: number,
  youthBoost: number = 0,
): AgingResult {
  const result: AgingResult = {
    clubId: club.id,
    retired: [],
    developed: [],
  };

  const playersToRemove: string[] = [];

  for (const player of club.roster) {
    if (player.isTemporary) continue;

    const { stats, overall, retired } = calculateAgingChanges(rng, player);

    if (retired) {
      // Generate replacement
      const regen = generateRegen(
        rng,
        player.position,
        club,
        `${club.id}-regen-s${seasonNumber}-${player.id}`,
        youthBoost,
      );
      result.retired.push({ player: { ...player }, replacement: regen });
      playersToRemove.push(player.id);
    } else {
      const oldOverall = player.overall;
      player.stats = stats;
      player.overall = overall;
      player.value = calculateMarketValue(overall, player.age + 1, 0, player.trait);
      player.age++;
      player.seasonsAtClub++;

      if (oldOverall !== overall) {
        result.developed.push({
          playerId: player.id,
          oldOverall,
          newOverall: overall,
        });
      }
    }
  }

  // Remove retired players and add regens
  for (const { player, replacement } of result.retired) {
    const idx = club.roster.findIndex((p) => p.id === player.id);
    if (idx !== -1) {
      club.roster.splice(idx, 1);
    }
    club.roster.push(replacement);
  }

  return result;
}

/**
 * Process aging for all clubs in the league.
 */
export function processLeagueAging(
  rng: SeededRNG,
  clubs: Club[],
  seasonNumber: number,
  youthBoostClubIds: Set<string> = new Set(),
  youthBoostAmount: number = 0,
): AgingResult[] {
  const results: AgingResult[] = [];

  for (const club of clubs) {
    const clubRng = new SeededRNG(`${rng.random()}-aging-${club.id}`);
    const boost = youthBoostClubIds.has(club.id) ? youthBoostAmount : 0;
    results.push(processClubAging(clubRng, club, seasonNumber, boost));
  }

  return results;
}

// ─── Squad Replenishment ───

const SQUAD_COMPOSITION: { position: Position; count: number }[] = [
  { position: 'GK', count: 2 },
  { position: 'CB', count: 3 },
  { position: 'FB', count: 2 },
  { position: 'MF', count: 4 },
  { position: 'WG', count: 2 },
  { position: 'ST', count: 3 },
];

/**
 * Ensure a club has at least 16 non-temporary players.
 * Generates youth players at positions with the biggest deficits.
 * Called after transfers and aging to prevent squad depletion.
 */
export function replenishSquad(
  rng: SeededRNG,
  club: Club,
  seasonNumber: number,
): Player[] {
  const nonTemp = club.roster.filter((p) => !p.isTemporary);
  const TARGET_SIZE = 16;
  const deficit = TARGET_SIZE - nonTemp.length;
  if (deficit <= 0) return [];

  // Find positions with biggest deficits
  const positionCounts: Record<Position, number> = { GK: 0, CB: 0, FB: 0, MF: 0, WG: 0, ST: 0 };
  for (const p of nonTemp) {
    positionCounts[p.position]++;
  }

  const positionDeficits: { position: Position; deficit: number }[] = [];
  for (const { position, count } of SQUAD_COMPOSITION) {
    const shortfall = count - positionCounts[position];
    if (shortfall > 0) {
      positionDeficits.push({ position, deficit: shortfall });
    }
  }
  positionDeficits.sort((a, b) => b.deficit - a.deficit);

  const newPlayers: Player[] = [];
  let filled = 0;

  // Fill biggest position gaps first
  for (const { position, deficit: posDeficit } of positionDeficits) {
    const toFill = Math.min(posDeficit, deficit - filled);
    for (let i = 0; i < toFill; i++) {
      const regenId = `${club.id}-replenish-s${seasonNumber}-${position}-${i}`;
      const player = generateRegen(rng, position, club, regenId);
      newPlayers.push(player);
      club.roster.push(player);
      filled++;
      if (filled >= deficit) break;
    }
    if (filled >= deficit) break;
  }

  // If still short, fill with MF/ST
  const fallbackPositions: Position[] = ['MF', 'ST', 'CB', 'WG', 'FB', 'GK'];
  let fbIdx = 0;
  while (filled < deficit) {
    const position = fallbackPositions[fbIdx % fallbackPositions.length];
    const regenId = `${club.id}-replenish-s${seasonNumber}-extra-${filled}`;
    const player = generateRegen(rng, position, club, regenId);
    newPlayers.push(player);
    club.roster.push(player);
    filled++;
    fbIdx++;
  }

  return newPlayers;
}
