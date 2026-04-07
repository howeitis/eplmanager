import type { Player, PlayerStats, Position, Trait, ClubData, NationalityWeight } from '../types/entities';
import { SeededRNG } from '../utils/rng';
import { getNamePool } from '../data/namePool';

// Position weight tables for overall rating calculation
const POSITION_WEIGHTS: Record<Position, Record<keyof PlayerStats, number>> = {
  GK: { ATK: 0.05, DEF: 0.35, MOV: 0.10, PWR: 0.20, MEN: 0.20, SKL: 0.10 },
  CB: { ATK: 0.05, DEF: 0.30, MOV: 0.10, PWR: 0.25, MEN: 0.20, SKL: 0.10 },
  FB: { ATK: 0.10, DEF: 0.20, MOV: 0.25, PWR: 0.15, MEN: 0.10, SKL: 0.20 },
  MF: { ATK: 0.15, DEF: 0.15, MOV: 0.15, PWR: 0.10, MEN: 0.20, SKL: 0.25 },
  WG: { ATK: 0.25, DEF: 0.05, MOV: 0.25, PWR: 0.10, MEN: 0.10, SKL: 0.25 },
  ST: { ATK: 0.35, DEF: 0.05, MOV: 0.20, PWR: 0.15, MEN: 0.15, SKL: 0.10 },
};

// Stat emphasis by position (which stats tend to be higher)
const POSITION_STAT_BIAS: Record<Position, Partial<Record<keyof PlayerStats, number>>> = {
  GK: { DEF: 15, PWR: 10, MEN: 8 },
  CB: { DEF: 15, PWR: 12, MEN: 5 },
  FB: { MOV: 12, SKL: 8, DEF: 5 },
  MF: { SKL: 12, MEN: 10, MOV: 5 },
  WG: { ATK: 10, MOV: 12, SKL: 10 },
  ST: { ATK: 15, MOV: 8, PWR: 5 },
};

// Tier rating ranges: [avgMin, avgMax] for the squad overall
const TIER_RATING_RANGES: Record<number, [number, number]> = {
  1: [76, 80],
  2: [69, 74],
  3: [66, 71],
  4: [63, 68],
  5: [60, 66],
};

// Squad composition: position -> count
const SQUAD_COMPOSITION: { position: Position; count: number }[] = [
  { position: 'GK', count: 2 },
  { position: 'CB', count: 3 },
  { position: 'FB', count: 2 },
  { position: 'MF', count: 4 },
  { position: 'WG', count: 2 },
  { position: 'ST', count: 3 },
];

const TRAITS: Trait[] = [
  'Leader', 'Ambitious', 'Loyal', 'Clutch', 'Inconsistent',
  'Fragile', 'Durable', 'Engine', 'Flair', 'Prospect',
];

const TRAIT_WEIGHTS_NORMAL = [8, 12, 10, 8, 10, 8, 8, 12, 10, 0];
const TRAIT_WEIGHTS_YOUNG = [3, 15, 5, 5, 8, 6, 8, 10, 10, 30];

export function calculateOverall(stats: PlayerStats, position: Position): number {
  const weights = POSITION_WEIGHTS[position];
  let total = 0;
  for (const stat of Object.keys(weights) as (keyof PlayerStats)[]) {
    total += stats[stat] * weights[stat];
  }
  return Math.round(total);
}

export function calculateMarketValue(overall: number, age: number, form: number): number {
  // Base value from overall
  let value = Math.pow((overall - 40) / 40, 2) * 50;

  // Age factor: peak at 25-28, declines sharply after 30
  if (age <= 20) value *= 1.3; // Young premium
  else if (age <= 24) value *= 1.2;
  else if (age <= 28) value *= 1.0;
  else if (age <= 30) value *= 0.7;
  else if (age <= 32) value *= 0.4;
  else value *= 0.2;

  // Form bonus
  value *= 1 + form * 0.03;

  return Math.max(0.5, Math.round(value * 10) / 10);
}

function generateName(rng: SeededRNG, namePool: NationalityWeight[]): string {
  const nationalities = namePool.map((n) => n.nationality);
  const weights = namePool.map((n) => n.weight);
  const nationality = rng.weightedPick(nationalities, weights);
  const pool = getNamePool(nationality);

  const firstName = pool.firstNames[rng.randomInt(0, pool.firstNames.length - 1)];
  const lastName = pool.lastNames[rng.randomInt(0, pool.lastNames.length - 1)];
  return `${firstName} ${lastName}`;
}

function generateAge(rng: SeededRNG): number {
  // Distribution: 15% young (17-21), 50% prime (22-28), 35% veteran (29-35)
  const roll = rng.random();
  if (roll < 0.15) return rng.randomInt(17, 21);
  if (roll < 0.65) return rng.randomInt(22, 28);
  return rng.randomInt(29, 35);
}

function assignTrait(rng: SeededRNG, age: number): Trait {
  // Prospect only for ages 17-19
  const weights = age <= 19 ? TRAIT_WEIGHTS_YOUNG : TRAIT_WEIGHTS_NORMAL;
  return rng.weightedPick(TRAITS, weights);
}

function generateStats(
  rng: SeededRNG,
  position: Position,
  targetOverall: number,
): PlayerStats {
  const bias = POSITION_STAT_BIAS[position];
  const statKeys: (keyof PlayerStats)[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];
  const weights = POSITION_WEIGHTS[position];

  // Generate raw stats with position bias
  const stats: PlayerStats = { ATK: 0, DEF: 0, MOV: 0, PWR: 0, MEN: 0, SKL: 0 };

  // Start with a base around the target overall, then add bias
  for (const key of statKeys) {
    const biasAmount = bias[key] || 0;
    const base = targetOverall + biasAmount;
    // Add some random variance (-8 to +8)
    stats[key] = Math.round(base + rng.randomFloat(-8, 8));
    // Clamp to 1-99
    stats[key] = Math.max(1, Math.min(99, stats[key]));
  }

  // Iteratively adjust stats to hit target overall
  for (let iter = 0; iter < 10; iter++) {
    const currentOverall = calculateOverall(stats, position);
    const diff = targetOverall - currentOverall;
    if (Math.abs(diff) <= 1) break;

    // Adjust the stat with highest weight more
    const adjustKey = rng.weightedPick(
      statKeys,
      statKeys.map((k) => weights[k] * 100),
    );
    stats[adjustKey] = Math.max(1, Math.min(99, stats[adjustKey] + Math.round(diff * 0.5)));
  }

  return stats;
}

function generateTargetOveralls(
  rng: SeededRNG,
  tier: number,
  count: number,
): number[] {
  const [rangeMin, rangeMax] = TIER_RATING_RANGES[tier];
  const targetAvg = rng.randomFloat(rangeMin, rangeMax);

  const overalls: number[] = [];

  for (let i = 0; i < count; i++) {
    let target: number;

    if (i < 2) {
      // Top 2 players: 2-6 above average (standout players every team has)
      target = targetAvg + rng.randomFloat(2, 6);
    } else if (i < 6) {
      // Next 4: around average to slightly above
      target = targetAvg + rng.randomFloat(-1, 3);
    } else if (i < 12) {
      // Middle 6: around average to slightly below
      target = targetAvg + rng.randomFloat(-3, 1);
    } else {
      // Bottom 4: below average squad players
      target = targetAvg + rng.randomFloat(-6, -2);
    }

    overalls.push(Math.round(Math.max(45, Math.min(92, target))));
  }

  return overalls;
}

export function generatePlayer(
  rng: SeededRNG,
  position: Position,
  targetOverall: number,
  namePool: NationalityWeight[],
  playerId: string,
): Player {
  const age = generateAge(rng);
  const trait = assignTrait(rng, age);
  const stats = generateStats(rng, position, targetOverall);
  const overall = calculateOverall(stats, position);
  const form = rng.randomInt(-2, 2);
  const value = calculateMarketValue(overall, age, form);

  // ~10% of young players (17-21) are high potential, ~5% are early peakers
  let highPotential = false;
  let earlyPeaker = false;
  if (age >= 17 && age <= 21) {
    if (rng.random() < 0.10) highPotential = true;
    else if (rng.random() < 0.05) earlyPeaker = true;
  }

  return {
    id: playerId,
    name: generateName(rng, namePool),
    age,
    position,
    stats,
    overall,
    trait,
    form,
    injured: false,
    injuryWeeks: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    value,
    acquiredThisWindow: false,
    isTemporary: false,
    highPotential,
    earlyPeaker,
    seasonsAtClub: 0,
    formHistory: [],
    monthlyGoals: [],
    monthlyAssists: [],
    statsSnapshotSeasonStart: { ...stats },
  };
}

/**
 * Reset progression tracking fields for a player changing clubs (transfer signing).
 * Clears history arrays and snapshots stats at signing time.
 */
export function resetProgressionForTransfer(player: Player): Player {
  return {
    ...player,
    acquiredThisWindow: true,
    formHistory: [],
    monthlyGoals: [],
    monthlyAssists: [],
    statsSnapshotSeasonStart: { ...player.stats },
  };
}

export function generateSquad(
  rng: SeededRNG,
  club: ClubData,
): Player[] {
  const targetOveralls = generateTargetOveralls(rng, club.tier, 16);
  const players: Player[] = [];
  let playerIndex = 0;

  for (const { position, count } of SQUAD_COMPOSITION) {
    for (let i = 0; i < count; i++) {
      const target = targetOveralls[playerIndex];
      const playerId = `${club.id}-p${playerIndex}`;
      players.push(generatePlayer(rng, position, target, club.namePool, playerId));
      playerIndex++;
    }
  }

  return players;
}

export function generateAllSquads(
  seed: string,
  clubs: ClubData[],
): Map<string, Player[]> {
  const squads = new Map<string, Player[]>();

  for (const club of clubs) {
    const rng = new SeededRNG(`${seed}-club-${club.id}`);
    squads.set(club.id, generateSquad(rng, club));
  }

  return squads;
}
