import { describe, it, expect } from 'vitest';
import { calculateAgingChanges, processClubAging, processLeagueAging } from '@/engine/aging';
import { generateAllSquads } from '@/engine/playerGen';
import { CLUBS } from '@/data/clubs';
import { SeededRNG } from '@/utils/rng';
import type { Club, Player } from '@/types/entities';

function buildClubs(seed: string): Club[] {
  const squads = generateAllSquads(seed, CLUBS);
  return CLUBS.map((data) => ({
    ...data,
    roster: squads.get(data.id)!,
  }));
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test-player',
    name: 'Test Player',
    nationality: 'english',
    age: 25,
    position: 'MF',
    stats: { ATK: 70, DEF: 65, MOV: 72, PWR: 68, MEN: 70, SKL: 75 },
    overall: 70,
    trait: 'Engine',
    form: 0,
    injured: false,
    injuryWeeks: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    value: 15,
    acquiredThisWindow: false,
    isTemporary: false,
    highPotential: false,
    earlyPeaker: false,
    seasonsAtClub: 3,
    formHistory: [],
    monthlyGoals: [],
    monthlyAssists: [],
    statsSnapshotSeasonStart: { ATK: 70, DEF: 65, MOV: 72, PWR: 68, MEN: 70, SKL: 75 },
    ...overrides,
  };
}

describe('Aging System', () => {
  describe('calculateAgingChanges', () => {
    it('young players (17-20) show rapid growth', () => {
      const player = makePlayer({ age: 18 });
      const original = player.overall;

      let totalGain = 0;
      const trials = 50;
      for (let i = 0; i < trials; i++) {
        const trialRng = new SeededRNG(`young-growth-${i}`);
        const result = calculateAgingChanges(trialRng, makePlayer({ age: 18 }));
        totalGain += result.overall - original;
      }

      const avgGain = totalGain / trials;
      expect(avgGain).toBeGreaterThan(0); // On average, young players should grow
    });

    it('prime players (25-29) are mostly stable', () => {
      const trials = 50;
      let totalChange = 0;
      for (let i = 0; i < trials; i++) {
        const rng = new SeededRNG(`prime-test-${i}`);
        const player = makePlayer({ age: 27 });
        const result = calculateAgingChanges(rng, player);
        totalChange += result.overall - player.overall;
      }

      const avgChange = totalChange / trials;
      expect(Math.abs(avgChange)).toBeLessThan(3); // Mostly stable
    });

    it('declining players (33-35) lose stats', () => {
      const trials = 50;
      let totalChange = 0;
      for (let i = 0; i < trials; i++) {
        const rng = new SeededRNG(`decline-test-${i}`);
        const player = makePlayer({ age: 34 });
        const result = calculateAgingChanges(rng, player);
        totalChange += result.overall - player.overall;
      }

      const avgChange = totalChange / trials;
      expect(avgChange).toBeLessThan(0); // Should decline on average
    });

    it('players 36+ have 60% retirement chance', () => {
      const trials = 200;
      let retirements = 0;
      for (let i = 0; i < trials; i++) {
        const rng = new SeededRNG(`retirement-${i}`);
        const player = makePlayer({ age: 37 });
        const result = calculateAgingChanges(rng, player);
        if (result.retired) retirements++;
      }

      const retirementRate = retirements / trials;
      expect(retirementRate).toBeGreaterThan(0.45); // Allow variance
      expect(retirementRate).toBeLessThan(0.75);
    });

    it('high potential players get amplified growth', () => {
      const trials = 50;
      let normalGain = 0;
      let highPotGain = 0;

      for (let i = 0; i < trials; i++) {
        const rng1 = new SeededRNG(`hp-normal-${i}`);
        const rng2 = new SeededRNG(`hp-high-${i}`);
        const normalPlayer = makePlayer({ age: 19, highPotential: false });
        const highPotPlayer = makePlayer({ age: 19, highPotential: true });

        const normalResult = calculateAgingChanges(rng1, normalPlayer);
        const highPotResult = calculateAgingChanges(rng2, highPotPlayer);

        normalGain += normalResult.overall - normalPlayer.overall;
        highPotGain += highPotResult.overall - highPotPlayer.overall;
      }

      expect(highPotGain / trials).toBeGreaterThan(normalGain / trials);
    });

    it('early peaker players start declining by 27', () => {
      const trials = 100;
      let totalChange = 0;
      for (let i = 0; i < trials; i++) {
        const rng = new SeededRNG(`early-peak-${i}`);
        const player = makePlayer({ age: 28, earlyPeaker: true });
        const result = calculateAgingChanges(rng, player);
        totalChange += result.overall - player.overall;
      }

      const avgChange = totalChange / trials;
      // Early peakers at 28 should trend negative or at most neutral
      expect(avgChange).toBeLessThanOrEqual(0.5);
    });
  });

  describe('processClubAging', () => {
    it('ages all non-temporary players by 1 year', () => {
      const rng = new SeededRNG('club-aging-test');
      const clubs = buildClubs('aging-club-test');
      const club = clubs[0];
      const originalAges = club.roster.map((p) => p.age);

      processClubAging(rng, club, 1);

      for (let i = 0; i < club.roster.length; i++) {
        const player = club.roster[i];
        // Retired players are replaced, so check if player still exists
        if (!player.isTemporary) {
          // Either aged by 1 or is a regen (age 17-20)
          const isRegen = player.id.includes('regen');
          if (!isRegen) {
            expect(player.age).toBe(originalAges[i] + 1);
          }
        }
      }
    });

    it('replaces retired players with regens', () => {
      const rng = new SeededRNG('regen-test');
      const clubs = buildClubs('regen-club-test');
      const club = clubs[0];

      // Force some old players
      club.roster[0].age = 37;
      club.roster[1].age = 36;

      const rosterSizeBefore = club.roster.length;
      const result = processClubAging(rng, club, 1);

      // Roster size should be maintained
      expect(club.roster.length).toBe(rosterSizeBefore);

      // Any retired player should have a replacement in the result
      for (const { player, replacement } of result.retired) {
        expect(replacement.age).toBeGreaterThanOrEqual(17);
        expect(replacement.age).toBeLessThanOrEqual(20);
        expect(replacement.position).toBe(player.position);
        expect(club.roster.some((p) => p.id === replacement.id)).toBe(true);
      }
    });

    it('increments seasonsAtClub for surviving players', () => {
      const rng = new SeededRNG('seasons-at-club-test');
      const clubs = buildClubs('sac-test');
      const club = clubs[0];

      // Set all to age 25 to avoid retirements
      for (const p of club.roster) {
        p.age = 25;
        p.seasonsAtClub = 2;
      }

      processClubAging(rng, club, 1);

      for (const p of club.roster) {
        if (!p.id.includes('regen')) {
          expect(p.seasonsAtClub).toBe(3);
        }
      }
    });
  });

  describe('10 Season Aging Integration', () => {
    it('evolves stats realistically over 10 seasons, maintains ~320 players', () => {
      const gameSeed = 'aging-10season-test';
      const clubs = buildClubs(gameSeed);

      const initialPlayerCount = clubs.reduce((sum, c) => sum + c.roster.length, 0);
      expect(initialPlayerCount).toBe(320); // 20 teams × 16 players

      let totalRetirements = 0;

      for (let season = 1; season <= 10; season++) {
        const rng = new SeededRNG(`aging-season-${season}`);
        const results = processLeagueAging(rng, clubs, season);

        for (const result of results) {
          totalRetirements += result.retired.length;
        }

        const playerCount = clubs.reduce((sum, c) => sum + c.roster.length, 0);
        expect(playerCount, `Season ${season}: ${playerCount} players`).toBe(320);
      }

      // Some retirements should have happened over 10 seasons
      expect(totalRetirements).toBeGreaterThan(0);

      // Check that young players exist (regens should have replenished)
      const youngPlayers = clubs.flatMap((c) => c.roster.filter((p) => p.age <= 21));
      expect(youngPlayers.length).toBeGreaterThan(10);

      // Check no one is impossibly old (shouldn't exceed ~45 realistically)
      const oldestAge = Math.max(...clubs.flatMap((c) => c.roster.map((p) => p.age)));
      expect(oldestAge).toBeLessThanOrEqual(50);
    });
  });
});
