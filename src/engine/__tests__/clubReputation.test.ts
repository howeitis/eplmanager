import { describe, it, expect } from 'vitest';
import {
  tierFromReputation,
  reputationDelta,
  recomputeClubReputations,
  STARTING_REP_BY_TIER,
} from '@/engine/clubReputation';
import type { LeagueTableRow } from '@/types/entities';

function row(clubId: string, points: number, gd = 0, gf = 0): LeagueTableRow {
  return {
    clubId,
    played: 38,
    won: Math.floor(points / 3),
    drawn: 0,
    lost: 0,
    goalsFor: gf,
    goalsAgainst: 0,
    goalDifference: gd,
    points,
  };
}

describe('tierFromReputation', () => {
  it('maps each band to the right tier', () => {
    expect(tierFromReputation(95)).toBe(1);
    expect(tierFromReputation(80)).toBe(2);
    expect(tierFromReputation(60)).toBe(3);
    expect(tierFromReputation(40)).toBe(4);
    expect(tierFromReputation(15)).toBe(5);
  });

  it('boundary values fall into the higher tier', () => {
    expect(tierFromReputation(88)).toBe(1);
    expect(tierFromReputation(72)).toBe(2);
    expect(tierFromReputation(55)).toBe(3);
    expect(tierFromReputation(38)).toBe(4);
  });
});

describe('reputationDelta', () => {
  it('rewards overperformance', () => {
    // Tier 5 club finishing 8th → 8 < worstExpected(20), but also 8 < bestExpected(15)
    // → overperformed by 7 → +6 (capped)
    expect(reputationDelta(5, 8)).toBe(6);
  });

  it('penalises underperformance', () => {
    // Tier 1 club finishing 12th → worstExpected = 5, gap = 7 → -6 (capped)
    expect(reputationDelta(1, 12)).toBe(-6);
  });

  it('returns 0 when finish is within the expected band', () => {
    // Tier 3 expects [8, 13]
    expect(reputationDelta(3, 10)).toBe(0);
    expect(reputationDelta(3, 8)).toBe(0);
    expect(reputationDelta(3, 13)).toBe(0);
  });

  it('caps the delta at +/- 6 to prevent yo-yo movement', () => {
    expect(reputationDelta(5, 1)).toBe(6); // can't exceed 6 even with 14-spot overperformance
    expect(reputationDelta(1, 20)).toBe(-6);
  });
});

describe('recomputeClubReputations', () => {
  it('promotes a sustained overperformer over multiple seasons', () => {
    // Brighton (tier 3, starting rep 62) finishes 4th three years running.
    // After three seasons, rep should cross into tier 2 territory (≥72).
    let rep: Record<string, number> = { brighton: STARTING_REP_BY_TIER[3] };
    const tiers: Record<string, number> = { brighton: 3 };

    for (let s = 0; s < 3; s++) {
      const table: LeagueTableRow[] = [
        row('a', 90),
        row('b', 88),
        row('c', 86),
        row('brighton', 84),
        ...Array.from({ length: 16 }, (_, i) => row(`other-${i}`, 50 - i)),
      ];
      rep = recomputeClubReputations(table, tiers, rep);
    }
    expect(rep.brighton).toBeGreaterThanOrEqual(72);
    expect(tierFromReputation(rep.brighton)).toBeLessThanOrEqual(2);
  });

  it('relegates a sustained underperformer', () => {
    // Man City (tier 1, starting rep 92) finishes 14th three years running.
    let rep: Record<string, number> = { city: STARTING_REP_BY_TIER[1] };
    const tiers: Record<string, number> = { city: 1 };

    for (let s = 0; s < 3; s++) {
      const table: LeagueTableRow[] = [
        ...Array.from({ length: 13 }, (_, i) => row(`other-${i}`, 80 - i * 2)),
        row('city', 40),
        ...Array.from({ length: 6 }, (_, i) => row(`b-${i}`, 38 - i * 2)),
      ];
      rep = recomputeClubReputations(table, tiers, rep);
    }
    expect(rep.city).toBeLessThan(STARTING_REP_BY_TIER[1]);
    expect(tierFromReputation(rep.city)).toBeGreaterThanOrEqual(2);
  });

  it('clamps reputation to [0, 100]', () => {
    let rep: Record<string, number> = { x: 99 };
    const tiers: Record<string, number> = { x: 1 };
    for (let s = 0; s < 5; s++) {
      const table: LeagueTableRow[] = [
        row('x', 100),
        ...Array.from({ length: 19 }, (_, i) => row(`y-${i}`, 50 - i)),
      ];
      rep = recomputeClubReputations(table, tiers, rep);
    }
    expect(rep.x).toBeLessThanOrEqual(100);
  });
});
