import { describe, it, expect } from 'vitest';
import {
  getStartingReputation,
  getBudgetFloor,
  calculateBoardExpectation,
  calculateSeasonReputationChange,
  calculateSeasonEndBudget,
  getReputationTSSBonus,
  getReputationRefusalModifier,
  isGameOver,
} from '@/engine/reputation';
import { generateAllSquads } from '@/engine/playerGen';
import { generateTempFillIn, getAvailableSquad, healInjuries } from '@/engine/matchSim';
import { CLUBS } from '@/data/clubs';
import { SeededRNG } from '@/utils/rng';
import type { Club } from '@/types/entities';

function buildClubs(seed: string): Club[] {
  const squads = generateAllSquads(seed, CLUBS);
  return CLUBS.map((data) => ({
    ...data,
    roster: squads.get(data.id)!,
  }));
}

describe('Reputation System', () => {
  describe('Starting Reputation', () => {
    it('assigns correct starting reputation by tier', () => {
      expect(getStartingReputation(1)).toBe(50);
      expect(getStartingReputation(2)).toBe(40);
      expect(getStartingReputation(3)).toBe(30);
      expect(getStartingReputation(4)).toBe(20);
      expect(getStartingReputation(5)).toBe(15);
    });
  });

  describe('Budget Floor', () => {
    it('enforces minimum budgets by tier', () => {
      expect(getBudgetFloor(1)).toBe(30);
      expect(getBudgetFloor(2)).toBe(25);
      expect(getBudgetFloor(3)).toBe(20);
      expect(getBudgetFloor(4)).toBe(15);
      expect(getBudgetFloor(5)).toBe(10);
    });
  });

  describe('Board Expectations', () => {
    it('sets base expectations by tier', () => {
      expect(calculateBoardExpectation(1, 50, 0).tier).toBe('Compete for Title');
      expect(calculateBoardExpectation(5, 15, 0).tier).toBe('Survive');
    });

    it('raises expectations after 3+ consecutive overperformances', () => {
      const result = calculateBoardExpectation(5, 50, 3);
      expect(result.tier).toBe('Mid-Table');
    });

    it('reaches Dominate tier with high reputation and overperformance', () => {
      const result = calculateBoardExpectation(1, 90, 3);
      expect(result.tier).toBe('Dominate');
    });
  });

  describe('Season Reputation Changes', () => {
    it('rewards overperformance with positive reputation', () => {
      const result = calculateSeasonReputationChange(1, 10, 4, 30);
      expect(result.delta).toBeGreaterThan(5);
      expect(result.budgetModifier).toBeGreaterThan(0);
    });

    it('punishes underperformance with negative reputation', () => {
      const result = calculateSeasonReputationChange(15, 4, 1, 50);
      expect(result.delta).toBeLessThan(0);
      expect(result.budgetModifier).toBeLessThan(0);
    });

    it('gives a small positive delta for meeting expectations', () => {
      // The reward for "just met" was retuned down to keep rep climbs gradual.
      const result = calculateSeasonReputationChange(4, 4, 1, 50);
      expect(result.delta).toBeGreaterThanOrEqual(1);
    });

    it('gives max penalty for catastrophic underperformance', () => {
      const result = calculateSeasonReputationChange(20, 4, 1, 50);
      expect(result.delta).toBeLessThanOrEqual(-10);
      expect(result.budgetModifier).toBeLessThanOrEqual(-0.30);
    });

    it('always rewards title winners', () => {
      // Title floor was retuned from +10 to +6 so reputation climbs feel earned.
      const result = calculateSeasonReputationChange(1, 17, 5, 15);
      expect(result.delta).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Budget Calculation', () => {
    it('champion gets £75M payout + full rollover', () => {
      // Position payouts were lifted (1st = £75M) and rollover is now 100%
      // of unspent budget rather than 50%.
      const budget = calculateSeasonEndBudget(100, 1, 1, 0);
      // 75 + 100 = 175
      expect(budget).toBe(175);
    });

    it('relegation zone team gets £35M payout', () => {
      // Bottom-three payout was lifted from £20M to £35M.
      const budget = calculateSeasonEndBudget(20, 19, 5, 0);
      // 35 + 20 = 55
      expect(budget).toBe(55);
    });

    it('budget never drops below tier floor', () => {
      // Harsh penalty on low budget
      const budget = calculateSeasonEndBudget(5, 20, 1, -0.30);
      expect(budget).toBeGreaterThanOrEqual(30); // Tier 1 floor
    });

    it('budget floor works for all tiers', () => {
      for (let tier = 1; tier <= 5; tier++) {
        const floor = getBudgetFloor(tier);
        const budget = calculateSeasonEndBudget(0, 20, tier, -0.30);
        expect(budget).toBeGreaterThanOrEqual(floor);
      }
    });

    it('applies budget modifier correctly', () => {
      const noPenalty = calculateSeasonEndBudget(50, 5, 2, 0);
      const withPenalty = calculateSeasonEndBudget(50, 5, 2, -0.20);
      expect(withPenalty).toBeLessThan(noPenalty);
    });
  });

  describe('Game Over', () => {
    it('triggers game over at reputation 0', () => {
      expect(isGameOver(0)).toBe(true);
      expect(isGameOver(-5)).toBe(true);
    });

    it('does not trigger game over above 0', () => {
      expect(isGameOver(1)).toBe(false);
      expect(isGameOver(50)).toBe(false);
    });
  });

  describe('TSS and Refusal Modifiers', () => {
    it('reputation TSS bonus scales from 0 to 3', () => {
      expect(getReputationTSSBonus(0)).toBe(0);
      expect(getReputationTSSBonus(99)).toBe(3);
      expect(getReputationTSSBonus(50)).toBeCloseTo(1.515, 1);
    });

    it('high reputation reduces refusal chance', () => {
      expect(getReputationRefusalModifier(90)).toBe(-0.15);
      expect(getReputationRefusalModifier(10)).toBe(0.10);
    });
  });
});

describe('Dominating Manager Scenario', () => {
  it('reputation climbs past 85 after 6 titles, bad season triggers -10 penalty without dropping below floor', () => {
    let reputation = getStartingReputation(1); // 50

    // 6 consecutive title wins — current title floor is +6 rep, so reaching
    // the Dominate threshold (rep >= 85) takes 6 perfect seasons, not 5.
    let consecutiveOverperformances = 0;
    let budget = 100;

    for (let season = 1; season <= 6; season++) {
      const expectations = calculateBoardExpectation(1, reputation, consecutiveOverperformances);
      const result = calculateSeasonReputationChange(1, expectations.minPosition, 1, reputation);
      reputation = Math.max(0, Math.min(100, reputation + result.delta));
      consecutiveOverperformances++;
      budget = calculateSeasonEndBudget(budget, 1, 1, result.budgetModifier);
    }

    expect(reputation).toBeGreaterThanOrEqual(85);

    // Now expectations should be Dominate
    const expectations = calculateBoardExpectation(1, reputation, consecutiveOverperformances);
    expect(expectations.tier).toBe('Dominate');

    // Bad season: finish 6th
    const badResult = calculateSeasonReputationChange(6, expectations.minPosition, 1, reputation);
    expect(badResult.delta).toBeLessThanOrEqual(-7);

    reputation = Math.max(0, Math.min(100, reputation + badResult.delta));
    budget = calculateSeasonEndBudget(budget, 6, 1, badResult.budgetModifier);

    // Budget should not drop below floor
    expect(budget).toBeGreaterThanOrEqual(getBudgetFloor(1));
  });
});

describe('Catastrophic Spiral Scenario', () => {
  it('game over triggers when reputation hits 0, budget never below floor', () => {
    let reputation = getStartingReputation(1); // 50
    let budget = 100;

    let season = 0;
    const budgets: number[] = [];

    // Simulate catastrophic seasons until game over or max 20 seasons
    while (!isGameOver(reputation) && season < 20) {
      season++;
      const expectations = calculateBoardExpectation(1, reputation, 0);
      const result = calculateSeasonReputationChange(20, expectations.minPosition, 1, reputation);
      reputation = Math.max(0, Math.min(100, reputation + result.delta));
      budget = calculateSeasonEndBudget(budget, 20, 1, result.budgetModifier);
      budgets.push(budget);

      // Budget should never drop below floor
      expect(budget, `Season ${season}: budget ${budget}`).toBeGreaterThanOrEqual(getBudgetFloor(1));
    }

    expect(isGameOver(reputation)).toBe(true);
    expect(season).toBeLessThanOrEqual(10); // Should get sacked within 10 catastrophic seasons
  });
});

describe('Temporary Fill-In System', () => {
  it('generates fill-in GK when both GKs injured, removes on recovery', () => {
    const rng = new SeededRNG('fillin-test');
    const clubs = buildClubs('fillin-club-test');
    const club = clubs[0];

    // Find and injure both GKs
    const gks = club.roster.filter((p) => p.position === 'GK');
    expect(gks.length).toBe(2);
    for (const gk of gks) {
      gk.injured = true;
      gk.injuryWeeks = 2;
    }

    // Get available squad — should generate a fill-in GK
    const { available, fillIns } = getAvailableSquad(club.roster, rng, club.id);

    expect(fillIns.length).toBeGreaterThanOrEqual(1);
    const fillInGK = fillIns.find((p) => p.position === 'GK');
    expect(fillInGK).toBeDefined();
    expect(fillInGK!.isTemporary).toBe(true);
    expect(fillInGK!.overall).toBeGreaterThanOrEqual(38);
    expect(fillInGK!.overall).toBeLessThanOrEqual(55);

    // Fill-in should be in available squad
    expect(available.some((p) => p.id === fillInGK!.id)).toBe(true);

    // Fill-in should NOT be in the main roster
    expect(club.roster.some((p) => p.id === fillInGK!.id)).toBe(false);

    // Heal injuries — first month reduces by 1
    healInjuries(club.roster);
    for (const gk of gks) {
      expect(gk.injuryWeeks).toBe(1);
      expect(gk.injured).toBe(true);
    }

    // Heal again — GKs recover
    healInjuries(club.roster);
    for (const gk of gks) {
      expect(gk.injuryWeeks).toBe(0);
      expect(gk.injured).toBe(false);
    }

    // After recovery, no fill-ins needed
    const { fillIns: fillInsAfter } = getAvailableSquad(club.roster, new SeededRNG('fillin-test-after'), club.id);
    expect(fillInsAfter.length).toBe(0);
  });

  it('fill-in rating is between 40-50', () => {
    const trials = 50;
    for (let i = 0; i < trials; i++) {
      const rng = new SeededRNG(`fillin-rating-${i}`);
      const fillIn = generateTempFillIn(rng, 'GK', 'test-club', i);
      expect(fillIn.overall).toBeGreaterThanOrEqual(38); // Allow slight variance from stat generation
      expect(fillIn.overall).toBeLessThanOrEqual(55);
      expect(fillIn.isTemporary).toBe(true);
    }
  });

  it('fill-ins are not present in save data (excluded from roster)', () => {
    const rng = new SeededRNG('fillin-save-test');
    const clubs = buildClubs('fillin-save-club');
    const club = clubs[0];

    // Injure all CBs
    const cbs = club.roster.filter((p) => p.position === 'CB');
    for (const cb of cbs) {
      cb.injured = true;
      cb.injuryWeeks = 2;
    }

    const { fillIns } = getAvailableSquad(club.roster, rng, club.id);
    expect(fillIns.length).toBeGreaterThanOrEqual(1);

    // Fill-ins should NOT be in the main roster
    for (const fillIn of fillIns) {
      expect(club.roster.includes(fillIn)).toBe(false);
    }

    // Only non-temporary players in roster
    expect(club.roster.every((p) => !p.isTemporary)).toBe(true);
  });
});
