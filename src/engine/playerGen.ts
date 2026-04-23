import type { Player, PlayerStats, Position, Trait, ClubData, NationalityWeight, ManagerPhilosophy } from '../types/entities';
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
  ST: { ATK: 18, MOV: 10, PWR: 8 },
};

// Tier rating ranges: [avgMin, avgMax] for the squad overall
const TIER_RATING_RANGES: Record<number, [number, number]> = {
  1: [77, 82],
  2: [72, 77],
  3: [69, 74],
  4: [66, 71],
  5: [63, 68],
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

export function calculateMarketValue(overall: number, age: number, _form: number = 0, trait?: string): number {
  // Unified cubic curve — matches transfers.calculateMarketValue so list and detail views agree.
  // Form is intentionally ignored; values should reflect ability + age + trait only.
  const normalized = (overall - 50) / 30;
  const base = Math.pow(normalized, 3) * 45;

  let ageFactor: number;
  if (age >= 17 && age <= 21) ageFactor = 1.3;
  else if (age >= 22 && age <= 28) ageFactor = 1.0;
  else if (age >= 29 && age <= 31) ageFactor = 0.65;
  else ageFactor = 0.35;

  let traitFactor = 1.0;
  if (trait === 'Prospect') traitFactor = 1.4;
  else if (trait === 'Clutch') traitFactor = 1.15;
  else if (trait === 'Fragile') traitFactor = 0.8;

  const raw = base * ageFactor * traitFactor;
  return Math.max(0.5, Math.round(raw * 10) / 10);
}

function generateNameAndNationality(rng: SeededRNG, namePool: NationalityWeight[]): { name: string; nationality: string } {
  const nationalities = namePool.map((n) => n.nationality);
  const weights = namePool.map((n) => n.weight);
  const nationality = rng.weightedPick(nationalities, weights);
  const pool = getNamePool(nationality);

  const firstName = pool.firstNames[rng.randomInt(0, pool.firstNames.length - 1)];
  const lastName = pool.lastNames[rng.randomInt(0, pool.lastNames.length - 1)];
  return { name: `${firstName} ${lastName}`, nationality };
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
      // Top 2 players: 3-7 above average (standout players every team has)
      target = targetAvg + rng.randomFloat(3, 7);
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

    overalls.push(Math.round(Math.max(45, Math.min(95, target))));
  }

  // Shuffle so that no position group is systematically stuck with the
  // worst (or best) targets — every position has a fair chance at stars.
  for (let i = overalls.length - 1; i > 0; i--) {
    const j = rng.randomInt(0, i);
    [overalls[i], overalls[j]] = [overalls[j], overalls[i]];
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
  const value = calculateMarketValue(overall, age, 0, trait);

  // ~10% of young players (17-21) are high potential, ~5% are early peakers
  let highPotential = false;
  let earlyPeaker = false;
  if (age >= 17 && age <= 21) {
    if (rng.random() < 0.10) highPotential = true;
    else if (rng.random() < 0.05) earlyPeaker = true;
  }

  const { name, nationality } = generateNameAndNationality(rng, namePool);

  return {
    id: playerId,
    name,
    nationality,
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
    homegrown: false,
    trophiesWon: [],
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

/** Boost a player's stats until their overall reaches the target (in-place). */
function boostPlayerOverall(player: Player, targetOverall: number): void {
  const keys: (keyof Player['stats'])[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];
  const weights = POSITION_WEIGHTS[player.position];
  let iterations = 0;
  while (player.overall < targetOverall && iterations < 50) {
    // Boost the highest-weight stat for this position
    const topKey = keys.reduce((best, k) => weights[k] > weights[best] ? k : best, keys[0]);
    player.stats[topKey] = Math.min(99, player.stats[topKey] + 1);
    player.overall = calculateOverall(player.stats, player.position);
    iterations++;
  }
}

export function generateSquad(
  rng: SeededRNG,
  club: ClubData,
): Player[] {
  const targetOveralls = generateTargetOveralls(rng, club.tier, 16);
  const players: Player[] = [];
  let playerIndex = 0;
  let gkIndex = 0;

  for (const { position, count } of SQUAD_COMPOSITION) {
    for (let i = 0; i < count; i++) {
      let target = targetOveralls[playerIndex];

      // Backup goalkeeper: noticeably weaker than the starter (−8 to −12 OVR)
      if (position === 'GK') {
        if (gkIndex === 1) {
          target = Math.max(45, target - rng.randomInt(8, 12));
        }
        gkIndex++;
      }

      const playerId = `${club.id}-p${playerIndex}`;
      players.push(generatePlayer(rng, position, target, club.namePool, playerId));
      playerIndex++;
    }
  }

  // ─── Quality guarantees ───
  // Ensure each tier has the minimum number of high-rated and young talent
  const outfield = players.filter((p) => p.position !== 'GK');
  const sortedDesc = [...outfield].sort((a, b) => b.overall - a.overall);

  if (club.tier <= 3) {
    // Tier 1–3: guarantee at least 2 outfield players rated 80+
    const minGold = club.tier === 1 ? 3 : 2;
    for (let i = 0; i < Math.min(minGold, sortedDesc.length); i++) {
      if (sortedDesc[i].overall < 80) {
        boostPlayerOverall(sortedDesc[i], 80);
      }
    }
  } else {
    // Tier 4–5: guarantee at least 1 outfield player rated 80+
    if (sortedDesc.length > 0 && sortedDesc[0].overall < 80) {
      boostPlayerOverall(sortedDesc[0], 80);
    }
  }

  // Wonderkid guarantee: ensure at least 1 young (≤21) talented player
  const wonderkidThreshold = club.tier <= 3 ? 80 : 75;
  const hasWonderkid = outfield.some((p) => p.age <= 21 && p.overall >= wonderkidThreshold);
  if (!hasWonderkid) {
    // Find the youngest outfield player and give them a boost
    const sorted = [...outfield].sort((a, b) => a.age - b.age);
    const youngest = sorted[0];
    if (youngest) {
      if (youngest.age > 21) youngest.age = rng.randomInt(17, 20);
      if (youngest.overall < wonderkidThreshold) {
        boostPlayerOverall(youngest, wonderkidThreshold);
      }
      youngest.highPotential = true;
    }
  }

  // Age caps at save start: no more than 2 over 33, no more than 4 over 30.
  applyAgeCaps(rng, players);

  return players;
}

/**
 * Re-balance ages so the squad reads like a real-world top-flight team at
 * generation time — weighted toward players in their 20s.
 *   - At most 2 players over 33
 *   - At most 4 players over 30 (inclusive of the over-33 bucket)
 * Excess veterans are shifted down into realistic ranges; we don't make
 * everyone 25, just trim the deep-veteran tail.
 */
function applyAgeCaps(rng: SeededRNG, players: Player[]): void {
  const MAX_OVER_33 = 2;
  const MAX_OVER_30 = 4;

  // Trim over-33s first. Keep the oldest MAX_OVER_33 and shift the rest into 28–33.
  const over33 = players.filter((p) => p.age > 33).sort((a, b) => b.age - a.age);
  for (let i = MAX_OVER_33; i < over33.length; i++) {
    over33[i].age = rng.randomInt(28, 33);
  }

  // Now cap over-30s on the updated ages. Keep the oldest MAX_OVER_30 and
  // shift the rest into 24–30.
  const over30 = players.filter((p) => p.age > 30).sort((a, b) => b.age - a.age);
  for (let i = MAX_OVER_30; i < over30.length; i++) {
    over30[i].age = rng.randomInt(24, 30);
  }
}

const ALL_OUTFIELD_POSITIONS: Position[] = ['CB', 'FB', 'MF', 'WG', 'ST'];

/**
 * Generate a bonus 17th player for the user's squad based on their manager philosophy.
 * - attacking: extra ST or WG
 * - defensive: extra CB or FB
 * - possession: extra MF
 * - pragmatic / rotation-heavy: extra random position
 * - developmental: extra random position, forced age under 20
 */
export function generatePhilosophyBonusPlayer(
  rng: SeededRNG,
  club: ClubData,
  philosophy: ManagerPhilosophy,
  existingCount: number,
): Player {
  let position: Position;
  let forceYoung = false;

  switch (philosophy) {
    case 'attacking':
      position = rng.weightedPick(['ST', 'WG'] as Position[], [50, 50]);
      break;
    case 'defensive':
      position = rng.weightedPick(['CB', 'FB'] as Position[], [50, 50]);
      break;
    case 'possession':
      position = 'MF';
      break;
    case 'developmental':
      position = ALL_OUTFIELD_POSITIONS[rng.randomInt(0, ALL_OUTFIELD_POSITIONS.length - 1)];
      forceYoung = true;
      break;
    case 'pragmatic':
    case 'rotation-heavy':
    default:
      position = ALL_OUTFIELD_POSITIONS[rng.randomInt(0, ALL_OUTFIELD_POSITIONS.length - 1)];
      break;
  }

  const [rangeMin, rangeMax] = TIER_RATING_RANGES[club.tier];
  const targetAvg = (rangeMin + rangeMax) / 2;
  // Bonus player sits around squad average (slightly below)
  const targetOverall = Math.round(targetAvg + rng.randomFloat(-3, 1));

  const playerId = `${club.id}-p${existingCount}`;
  const player = generatePlayer(rng, position, targetOverall, club.namePool, playerId);

  if (forceYoung && player.age >= 20) {
    player.age = rng.randomInt(17, 19);
    // Re-evaluate trait for young age
    player.trait = assignTrait(rng, player.age);
  }

  // Keep the bonus player young enough that it can't push the squad past the
  // starting age caps (≤2 over 33, ≤4 over 30).
  if (player.age > 30) {
    player.age = rng.randomInt(22, 29);
    player.trait = assignTrait(rng, player.age);
  }

  return player;
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
