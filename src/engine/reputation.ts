import type { BoardExpectationTier } from '@/types/entities';

// ─── Starting Reputation by Tier ───

const STARTING_REPUTATION: Record<number, number> = {
  1: 50,
  2: 40,
  3: 30,
  4: 20,
  5: 15,
};

// ─── Budget Floor by Tier ───

const BUDGET_FLOOR: Record<number, number> = {
  1: 30,
  2: 25,
  3: 20,
  4: 15,
  5: 10,
};

// ─── Budget Replenishment by Position ───

function getPositionBudgetPayout(position: number): number {
  if (position === 1) return 75;
  if (position <= 4) return 65;
  if (position <= 10) return 55;
  if (position <= 17) return 45;
  return 35; // 18th-20th
}

// ─── Board Expectations ───

interface BoardExpectationConfig {
  tier: BoardExpectationTier;
  minPosition: number;
  description: string;
}

/**
 * Determine board expectations based on club tier and recent performance.
 * Uses a rubber-band system: if the manager is consistently overperforming,
 * expectations rise. If underperforming, they slowly lower.
 */
export function calculateBoardExpectation(
  clubTier: number,
  reputation: number,
  consecutiveOverperformances: number,
  leniency = 0,
): BoardExpectationConfig {
  // Base expectations by tier
  const baseExpectations: Record<number, BoardExpectationConfig> = {
    1: { tier: 'Compete for Title', minPosition: 4, description: 'The board expects a title challenge.' },
    2: { tier: 'Top Half', minPosition: 8, description: 'The board expects a strong top-half finish.' },
    3: { tier: 'Top Half', minPosition: 10, description: 'The board expects a comfortable mid-table finish or better.' },
    4: { tier: 'Mid-Table', minPosition: 14, description: 'The board expects to stay clear of relegation.' },
    5: { tier: 'Survive', minPosition: 17, description: 'The board just wants survival.' },
  };

  let config = baseExpectations[clubTier] || baseExpectations[3];

  // Rubber-band: raise expectations after consistent overperformance
  if (consecutiveOverperformances >= 3 || reputation >= 80) {
    // Upgrade expectations
    if (config.tier === 'Survive') {
      config = { tier: 'Mid-Table', minPosition: 14, description: 'After recent success, the board now expects mid-table stability.' };
    } else if (config.tier === 'Mid-Table') {
      config = { tier: 'Top Half', minPosition: 10, description: 'Expectations have risen. The board wants a top-half finish.' };
    } else if (config.tier === 'Top Half') {
      config = { tier: 'Compete for Title', minPosition: 4, description: 'The board expects you to compete for the title.' };
    } else if (config.tier === 'Compete for Title' && reputation >= 85) {
      config = { tier: 'Dominate', minPosition: 1, description: 'The board expects dominance. Nothing less than the title.' };
    }
  } else if (consecutiveOverperformances >= 2) {
    // Slight upgrade
    if (config.minPosition > 4) {
      config = { ...config, minPosition: config.minPosition - 2 };
    }
  }

  if (leniency > 0) {
    config = { ...config, minPosition: Math.min(20, config.minPosition + leniency) };
  }

  return config;
}

// ─── Reputation Changes Based on Season Finish ───

export interface ReputationResult {
  delta: number;
  reason: string;
  budgetModifier: number; // Percentage modifier (-0.30 = -30%)
}

/**
 * Calculate reputation change and budget modifier based on season finish.
 * Uses expectation-relative system: finishing above expectations is rewarded,
 * finishing below is punished, with magnitude based on gap.
 */
export function calculateSeasonReputationChange(
  finishPosition: number,
  expectedMinPosition: number,
  _clubTier: number,
  _currentReputation: number,
): ReputationResult {
  const gap = expectedMinPosition - finishPosition; // Positive = overperformed

  let delta = 0;
  let budgetModifier = 0;
  let reason = '';

  if (gap >= 10) {
    // Massive overperformance (e.g., survival club wins title)
    delta = 8;
    budgetModifier = 0.25;
    reason = 'Extraordinary season — far exceeded all expectations.';
  } else if (gap >= 5) {
    // Strong overperformance
    delta = 5;
    budgetModifier = 0.15;
    reason = 'Brilliant season — significantly exceeded board expectations.';
  } else if (gap >= 2) {
    // Good overperformance
    delta = 3;
    budgetModifier = 0.10;
    reason = 'Strong season — exceeded board expectations.';
  } else if (gap >= 0) {
    // Met expectations
    delta = 1;
    budgetModifier = 0;
    reason = 'Solid season — met the board\'s expectations.';
  } else if (gap >= -3) {
    // Slight underperformance
    delta = -3;
    budgetModifier = -0.10;
    reason = 'Disappointing season — fell short of expectations.';
  } else if (gap >= -6) {
    // Clear underperformance
    delta = -7;
    budgetModifier = -0.20;
    reason = 'Poor season — well below what the board expected.';
  } else {
    // Catastrophic
    delta = -10;
    budgetModifier = -0.30;
    reason = 'Catastrophic season — the board is furious.';
  }

  // Title winner always gets a rep boost regardless of expectations
  if (finishPosition === 1 && delta < 6) {
    delta = 6;
    reason = 'Champions! The board is thrilled.';
  }

  // Relegated: extra harsh
  if (finishPosition >= 18) {
    delta = Math.min(delta, -10);
    budgetModifier = Math.min(budgetModifier, -0.30);
    reason = 'Relegation zone. The board demands answers.';
  }

  return { delta, reason, budgetModifier };
}

// ─── Budget Calculation ───

export function calculateSeasonEndBudget(
  currentBudget: number,
  finishPosition: number,
  clubOriginalTier: number,
  budgetModifier: number,
  extraMultiplier = 1,
): number {
  const payout = getPositionBudgetPayout(finishPosition);

  // Unspent budget rolls over fully
  const rollover = currentBudget;

  // New budget = payout + rollover, then apply modifier
  let newBudget = payout + rollover;
  newBudget *= (1 + budgetModifier);
  newBudget *= extraMultiplier;

  // Apply budget floor
  const floor = BUDGET_FLOOR[clubOriginalTier] || 10;
  newBudget = Math.max(floor, newBudget);

  return Math.round(newBudget * 10) / 10;
}

// ─── TSS Reputation Bonus ───

/**
 * Calculate TSS bonus from manager reputation (0 to +3).
 */
export function getReputationTSSBonus(reputation: number): number {
  return Math.min(3, reputation / 33);
}

// ─── Transfer Refusal Modifier ───

/**
 * Calculate the refusal chance modifier based on manager reputation.
 * Higher reputation = players less likely to refuse.
 */
export function getReputationRefusalModifier(reputation: number): number {
  if (reputation >= 80) return -0.15; // Star managers attract players
  if (reputation >= 60) return -0.05;
  if (reputation >= 40) return 0;
  if (reputation >= 20) return 0.05;
  return 0.10; // Low reputation = players hesitate
}

// ─── Game Over Check ───

export function isGameOver(reputation: number): boolean {
  return reputation <= 0;
}

// ─── Exports ───

export function getStartingReputation(tier: number): number {
  return STARTING_REPUTATION[tier] || 20;
}

export function getBudgetFloor(tier: number): number {
  return BUDGET_FLOOR[tier] || 10;
}
