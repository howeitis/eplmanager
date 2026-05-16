import { describe, it, expect } from 'vitest';
import { generateSquad, generateAllSquads, calculateOverall } from '@/engine/playerGen';
import { CLUBS } from '@/data/clubs';
import { SeededRNG } from '@/utils/rng';
import type { Position } from '@/types/entities';

describe('Player Generation', () => {
  it('generates a 16-player squad with correct position counts', () => {
    const club = CLUBS[0]; // Man City
    const rng = new SeededRNG('test-squad-gen');
    const squad = generateSquad(rng, club);

    expect(squad).toHaveLength(16);

    const positionCounts: Record<string, number> = {};
    for (const player of squad) {
      positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
    }

    expect(positionCounts['GK']).toBe(2);
    expect(positionCounts['CB']).toBe(3);
    expect(positionCounts['FB']).toBe(2);
    expect(positionCounts['MF']).toBe(4);
    expect(positionCounts['WG']).toBe(2);
    expect(positionCounts['ST']).toBe(3);
  });

  it('produces identical squads with the same seed', () => {
    const club = CLUBS[0];
    const rng1 = new SeededRNG('determinism-test');
    const rng2 = new SeededRNG('determinism-test');

    const squad1 = generateSquad(rng1, club);
    const squad2 = generateSquad(rng2, club);

    expect(squad1.map((p) => p.name)).toEqual(squad2.map((p) => p.name));
    expect(squad1.map((p) => p.overall)).toEqual(squad2.map((p) => p.overall));
    expect(squad1.map((p) => p.stats)).toEqual(squad2.map((p) => p.stats));
    expect(squad1.map((p) => p.trait)).toEqual(squad2.map((p) => p.trait));
  });

  it('generates identical output across 3 runs with same seed via generateAllSquads', () => {
    const seed = 'full-gen-test-seed';
    const run1 = generateAllSquads(seed, CLUBS);
    const run2 = generateAllSquads(seed, CLUBS);
    const run3 = generateAllSquads(seed, CLUBS);

    for (const club of CLUBS) {
      const s1 = run1.get(club.id)!;
      const s2 = run2.get(club.id)!;
      const s3 = run3.get(club.id)!;

      expect(s1.map((p) => p.name)).toEqual(s2.map((p) => p.name));
      expect(s1.map((p) => p.name)).toEqual(s3.map((p) => p.name));
      expect(s1.map((p) => p.overall)).toEqual(s2.map((p) => p.overall));
      expect(s1.map((p) => p.overall)).toEqual(s3.map((p) => p.overall));
    }
  });

  it('player stats are within 1-99 range', () => {
    const squads = generateAllSquads('range-test', CLUBS);
    for (const [, squad] of squads) {
      for (const player of squad) {
        for (const val of Object.values(player.stats)) {
          expect(val).toBeGreaterThanOrEqual(1);
          expect(val).toBeLessThanOrEqual(99);
        }
      }
    }
  });

  it('all players have acquiredThisWindow = false and isTemporary = false', () => {
    const squads = generateAllSquads('flags-test', CLUBS);
    for (const [, squad] of squads) {
      for (const player of squad) {
        expect(player.acquiredThisWindow).toBe(false);
        expect(player.isTemporary).toBe(false);
      }
    }
  });

  it('every player has a valid trait', () => {
    const validTraits = [
      'Leader', 'Ambitious', 'Loyal', 'Clutch', 'Inconsistent',
      'Fragile', 'Durable', 'Engine', 'Flair', 'Prospect',
    ];
    const squads = generateAllSquads('trait-test', CLUBS);
    for (const [, squad] of squads) {
      for (const player of squad) {
        expect(validTraits).toContain(player.trait);
      }
    }
  });

  it('tier 1 clubs have higher average ratings than tier 5 clubs', () => {
    const squads = generateAllSquads('tier-balance-test', CLUBS);

    const tier1Clubs = CLUBS.filter((c) => c.tier === 1);
    const tier5Clubs = CLUBS.filter((c) => c.tier === 5);

    const avgRating = (clubIds: string[]) => {
      let total = 0;
      let count = 0;
      for (const id of clubIds) {
        for (const player of squads.get(id)!) {
          total += player.overall;
          count++;
        }
      }
      return total / count;
    };

    const tier1Avg = avgRating(tier1Clubs.map((c) => c.id));
    const tier5Avg = avgRating(tier5Clubs.map((c) => c.id));

    expect(tier1Avg).toBeGreaterThan(tier5Avg);
    expect(tier1Avg - tier5Avg).toBeGreaterThan(5);
    expect(tier1Avg - tier5Avg).toBeLessThan(25);
  });

  it('tiers 2-5 are compressed (gap < 12 between tier 2 and tier 5 avg)', () => {
    const squads = generateAllSquads('compression-test', CLUBS);

    const avgForTier = (tier: number) => {
      const clubs = CLUBS.filter((c) => c.tier === tier);
      let total = 0;
      let count = 0;
      for (const club of clubs) {
        for (const player of squads.get(club.id)!) {
          total += player.overall;
          count++;
        }
      }
      return total / count;
    };

    const tier2Avg = avgForTier(2);
    const tier5Avg = avgForTier(5);

    // Tiers 2-5 should be tightly packed
    expect(tier2Avg - tier5Avg).toBeLessThan(12);
  });

  it('every club has at least 1 player in the high 60s or above', () => {
    const squads = generateAllSquads('standout-test', CLUBS);
    for (const club of CLUBS) {
      const squad = squads.get(club.id)!;
      const maxOverall = Math.max(...squad.map((p) => p.overall));
      expect(maxOverall).toBeGreaterThanOrEqual(63);
    }
  });

  it('calculateOverall uses correct position weights', () => {
    const stats = { ATK: 80, DEF: 80, MOV: 80, PWR: 80, MEN: 80, SKL: 80 };
    const positions: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];

    // All stats equal means overall should be the same regardless of position
    for (const pos of positions) {
      expect(calculateOverall(stats, pos)).toBe(80);
    }

    // Striker with high ATK should rate higher than striker with high DEF
    const highAtk = { ATK: 90, DEF: 60, MOV: 70, PWR: 70, MEN: 70, SKL: 70 };
    const highDef = { ATK: 60, DEF: 90, MOV: 70, PWR: 70, MEN: 70, SKL: 70 };
    expect(calculateOverall(highAtk, 'ST')).toBeGreaterThan(calculateOverall(highDef, 'ST'));
  });

  it('generates all 20 clubs with 16 players each', () => {
    const squads = generateAllSquads('all-clubs-test', CLUBS);
    expect(squads.size).toBe(20);
    for (const [, squad] of squads) {
      expect(squad).toHaveLength(16);
    }
  });

  it('market values are positive', () => {
    const squads = generateAllSquads('value-test', CLUBS);
    for (const [, squad] of squads) {
      for (const player of squad) {
        expect(player.value).toBeGreaterThan(0);
      }
    }
  });

  it('ages are within 17-35 range', () => {
    const squads = generateAllSquads('age-test', CLUBS);
    for (const [, squad] of squads) {
      for (const player of squad) {
        expect(player.age).toBeGreaterThanOrEqual(17);
        expect(player.age).toBeLessThanOrEqual(35);
      }
    }
  });
});
