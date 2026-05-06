import type { LeagueTableRow } from '../types/entities';

/**
 * Dynamic club reputation / tier mobility.
 *
 * Each club carries a 0–100 reputation score that evolves with results.
 * It maps to an "effective tier" (1 = elite … 5 = lowest). The static
 * `tier` field on ClubData defines the *starting* tier; the live store
 * value can drift up or down based on multi-season performance.
 *
 * Why bother:
 *   - Without mobility, the league hierarchy is permanent. Brighton
 *     finishing top-4 for three years should *be* a top-4 club.
 *   - Tier feeds regen quality, AI buying targets, fortune ranges, and
 *     bidding floors — so promoting a club's tier organically lifts
 *     their squad maintenance over time and vice versa.
 */

export const TIER_REP_THRESHOLDS = {
  /** rep ≥ 88 → tier 1 */
  1: 88,
  /** rep ≥ 72 → tier 2 */
  2: 72,
  /** rep ≥ 55 → tier 3 */
  3: 55,
  /** rep ≥ 38 → tier 4 */
  4: 38,
  /** otherwise tier 5 */
} as const;

/** Default starting reputation for each tier (centered in the band). */
export const STARTING_REP_BY_TIER: Record<number, number> = {
  1: 92,
  2: 78,
  3: 62,
  4: 46,
  5: 30,
};

export function tierFromReputation(rep: number): 1 | 2 | 3 | 4 | 5 {
  if (rep >= TIER_REP_THRESHOLDS[1]) return 1;
  if (rep >= TIER_REP_THRESHOLDS[2]) return 2;
  if (rep >= TIER_REP_THRESHOLDS[3]) return 3;
  if (rep >= TIER_REP_THRESHOLDS[4]) return 4;
  return 5;
}

/**
 * Reputation delta for a finishing position relative to the club's tier.
 *
 * The intuition: each tier has an "expected" finish band. Beat it → rep
 * climbs; miss it → rep drops. Magnitude is small per season (±0–6) so
 * a club typically needs 2–3 strong seasons to climb a tier and 2–3 bad
 * ones to fall — preventing yo-yo movement.
 */
export function reputationDelta(currentTier: number, finishPosition: number): number {
  // expectedRange: [bestExpected, worstExpected] (1-indexed positions)
  const expectedByTier: Record<number, [number, number]> = {
    1: [1, 5],
    2: [4, 9],
    3: [8, 13],
    4: [12, 17],
    5: [15, 20],
  };
  const [bestExpected, worstExpected] = expectedByTier[currentTier] ?? [10, 15];

  if (finishPosition < bestExpected) {
    // Overperformed — gain rep, scaled by how far above expectation.
    const gap = bestExpected - finishPosition;
    return Math.min(6, 2 + gap);
  }
  if (finishPosition > worstExpected) {
    // Underperformed — lose rep, scaled the same way.
    const gap = finishPosition - worstExpected;
    return -Math.min(6, 2 + gap);
  }
  // Met expectations — small drift toward the band's center.
  return 0;
}

/**
 * Apply a season's results to all clubs' reputations and return the new map.
 * Caller is responsible for clamping `tier` on each Club afterwards.
 */
export function recomputeClubReputations(
  finalTable: LeagueTableRow[],
  currentTiers: Record<string, number>,
  currentReputations: Record<string, number>,
): Record<string, number> {
  const sorted = [...finalTable].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  const next = { ...currentReputations };
  sorted.forEach((row, idx) => {
    const finishPosition = idx + 1;
    const tier = currentTiers[row.clubId] ?? 3;
    const rep = currentReputations[row.clubId] ?? STARTING_REP_BY_TIER[tier] ?? 50;
    const delta = reputationDelta(tier, finishPosition);
    next[row.clubId] = Math.max(0, Math.min(100, rep + delta));
  });
  return next;
}

/** Human-readable tier label for the UI. */
export function tierLabel(tier: number): string {
  switch (tier) {
    case 1: return 'Elite';
    case 2: return 'Established';
    case 3: return 'Mid-table';
    case 4: return 'Battling';
    case 5: return 'Struggling';
    default: return 'Mid-table';
  }
}
