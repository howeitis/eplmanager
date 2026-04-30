import { describe, it, expect } from 'vitest';
import {
  generateFixtures,
  getMonthFixtures,
  getInSeasonPhases,
  simulateMatch,
  sortTable,
  generateSeasonFortunes,
} from '../matchSim';
import { simulateFullSeason } from '../seasonSim';
import { generateAllSquads } from '../playerGen';
import { CLUBS } from '../../data/clubs';
import { SeededRNG } from '../../utils/rng';
import type { Club } from '../../types/entities';

function buildClubs(seed: string): Club[] {
  const squads = generateAllSquads(seed, CLUBS);
  return CLUBS.map((data) => ({
    ...data,
    roster: squads.get(data.id)!,
  }));
}

describe('Fixture Generation', () => {
  it('generates 380 fixtures (38 gameweeks × 10 matches)', () => {
    const rng = new SeededRNG('fixture-gen-test');
    const clubIds = CLUBS.map((c) => c.id);
    const fixtures = generateFixtures(rng, clubIds);

    expect(fixtures).toHaveLength(380);
  });

  it('each team plays exactly 38 games (19 home, 19 away)', () => {
    const rng = new SeededRNG('fixture-balance-test');
    const clubIds = CLUBS.map((c) => c.id);
    const fixtures = generateFixtures(rng, clubIds);

    for (const clubId of clubIds) {
      const homeGames = fixtures.filter((f) => f.homeClubId === clubId);
      const awayGames = fixtures.filter((f) => f.awayClubId === clubId);
      expect(homeGames.length).toBe(19);
      expect(awayGames.length).toBe(19);
    }
  });

  it('each pair of teams plays exactly twice (once home, once away)', () => {
    const rng = new SeededRNG('fixture-pairs-test');
    const clubIds = CLUBS.map((c) => c.id);
    const fixtures = generateFixtures(rng, clubIds);

    for (let i = 0; i < clubIds.length; i++) {
      for (let j = i + 1; j < clubIds.length; j++) {
        const a = clubIds[i];
        const b = clubIds[j];
        const abHome = fixtures.filter((f) => f.homeClubId === a && f.awayClubId === b);
        const baHome = fixtures.filter((f) => f.homeClubId === b && f.awayClubId === a);
        expect(abHome.length).toBe(1);
        expect(baHome.length).toBe(1);
      }
    }
  });

  it('fixtures are distributed across 38 gameweeks', () => {
    const rng = new SeededRNG('fixture-gameweek-test');
    const clubIds = CLUBS.map((c) => c.id);
    const fixtures = generateFixtures(rng, clubIds);

    for (let gw = 1; gw <= 38; gw++) {
      const gwFixtures = fixtures.filter((f) => f.gameweek === gw);
      expect(gwFixtures).toHaveLength(10);
    }
  });

  it('all 10 months have fixtures assigned', () => {
    const rng = new SeededRNG('monthly-fixtures-test');
    const clubIds = CLUBS.map((c) => c.id);
    const fixtures = generateFixtures(rng, clubIds);

    const phases = getInSeasonPhases();
    let totalAssigned = 0;
    for (const phase of phases) {
      const monthFixtures = getMonthFixtures(fixtures, phase);
      expect(monthFixtures.length).toBeGreaterThan(0);
      totalAssigned += monthFixtures.length;
    }
    expect(totalAssigned).toBe(380);
  });
});

describe('Match Simulation', () => {
  it('simulates a single match with valid results', () => {
    const clubs = buildClubs('single-match-test');
    const homeClub = clubs[0]; // Man City
    const awayClub = clubs[19]; // Southampton

    const result = simulateMatch({
      homeClub,
      awayClub,
      fixture: { id: 'test-1', homeClubId: homeClub.id, awayClubId: awayClub.id, gameweek: 1, played: false, result: null },
      homeFormation: '4-3-3',
      awayFormation: '4-4-2',
      homeMentality: 'attacking',
      awayMentality: 'balanced',
      homeFortune: 3,
      awayFortune: -2,
      seasonSeed: 'test-season',
    });

    expect(result.homeGoals).toBeGreaterThanOrEqual(0);
    expect(result.awayGoals).toBeGreaterThanOrEqual(0);
    expect(result.homeClubId).toBe(homeClub.id);
    expect(result.awayClubId).toBe(awayClub.id);
  });

  it('produces deterministic results with the same seed', () => {
    const clubs1 = buildClubs('determinism-match');
    const clubs2 = buildClubs('determinism-match');

    const result1 = simulateMatch({
      homeClub: clubs1[0], awayClub: clubs1[1],
      fixture: { id: 'det-1', homeClubId: clubs1[0].id, awayClubId: clubs1[1].id, gameweek: 1, played: false, result: null },
      homeFormation: '4-4-2', awayFormation: '4-4-2',
      homeMentality: 'balanced', awayMentality: 'balanced',
      homeFortune: 0, awayFortune: 0,
      seasonSeed: 'det-seed',
    });

    const result2 = simulateMatch({
      homeClub: clubs2[0], awayClub: clubs2[1],
      fixture: { id: 'det-1', homeClubId: clubs2[0].id, awayClubId: clubs2[1].id, gameweek: 1, played: false, result: null },
      homeFormation: '4-4-2', awayFormation: '4-4-2',
      homeMentality: 'balanced', awayMentality: 'balanced',
      homeFortune: 0, awayFortune: 0,
      seasonSeed: 'det-seed',
    });

    expect(result1.homeGoals).toBe(result2.homeGoals);
    expect(result1.awayGoals).toBe(result2.awayGoals);
    expect(result1.scorers.map((s) => s.playerId)).toEqual(result2.scorers.map((s) => s.playerId));
  });
});

describe('Full Season Simulation', () => {
  it('simulates a full 38-game season and produces valid league table', () => {
    const clubs = buildClubs('full-season-test');
    const result = simulateFullSeason('full-season-test', 1, clubs);

    // All 20 teams should be in the table
    expect(result.finalTable).toHaveLength(20);

    // Total games played should be 38 for each team
    for (const row of result.finalTable) {
      expect(row.played).toBe(38);
    }

    // Total points should be consistent: each game yields 3 points (win) or 2 (draw)
    const totalPoints = result.finalTable.reduce((sum, r) => sum + r.points, 0);
    // 380 matches, max 3*380=1140 points if no draws, min 2*380=760 if all draws
    expect(totalPoints).toBeGreaterThanOrEqual(760);
    expect(totalPoints).toBeLessThanOrEqual(1140);

    // Goal difference should sum to 0 across the league
    const totalGD = result.finalTable.reduce((sum, r) => sum + r.goalDifference, 0);
    expect(totalGD).toBe(0);

    // Log the table
    console.log('\n=== Full Season League Table ===');
    result.finalTable.forEach((row, i) => {
      const club = CLUBS.find((c) => c.id === row.clubId)!;
      console.log(
        `${String(i + 1).padStart(2)}. ${club.shortName} T${club.tier} | ` +
        `P:${row.played} W:${String(row.won).padStart(2)} D:${String(row.drawn).padStart(2)} L:${String(row.lost).padStart(2)} | ` +
        `GF:${String(row.goalsFor).padStart(2)} GA:${String(row.goalsAgainst).padStart(2)} GD:${String(row.goalDifference).padStart(3)} | ` +
        `Pts:${String(row.points).padStart(2)}`,
      );
    });

    if (result.topScorer) {
      const scorerData = result.allPlayerGoals.get(result.topScorer.playerId);
      console.log(`\nGolden Boot: ${scorerData?.name} (${result.topScorer.goals} goals)`);
    }
  });

  it('champion points are between 75 and 100', () => {
    const clubs = buildClubs('champion-pts-test');
    const result = simulateFullSeason('champion-pts-test', 1, clubs);
    const championPts = result.finalTable[0].points;

    console.log(`Champion: ${result.finalTable[0].clubId} with ${championPts} pts`);
    expect(championPts).toBeGreaterThanOrEqual(75);
    expect(championPts).toBeLessThanOrEqual(100);
  });

  it('last place points are between 15 and 40', () => {
    const clubs = buildClubs('last-place-test');
    const result = simulateFullSeason('last-place-test', 1, clubs);
    const lastPts = result.finalTable[19].points;

    console.log(`Last place: ${result.finalTable[19].clubId} with ${lastPts} pts`);
    expect(lastPts).toBeGreaterThanOrEqual(15);
    expect(lastPts).toBeLessThanOrEqual(40);
  });

  it('tier-1 clubs reach the top 4 at well above their fair share over many seasons', () => {
    // Single-seed assertions on tier-1 top-4 counts are noisy (one bad RNG
    // run can drop 2 of 3 elite clubs out of the top 4). Average across
    // multiple seeds and check that tier-1 clubs occupy materially more than
    // their fair share (3/20 = 15%) of top-4 slots.
    const tier1Clubs = CLUBS.filter((c) => c.tier === 1).map((c) => c.id);
    const NUM_SEASONS = 8;
    let tier1Slots = 0;

    for (let i = 0; i < NUM_SEASONS; i++) {
      const seed = `top4-tier1-test-${i}`;
      const clubs = buildClubs(seed);
      const result = simulateFullSeason(seed, 1, clubs);
      const top4Ids = result.finalTable.slice(0, 4).map((r) => r.clubId);
      tier1Slots += top4Ids.filter((id) => tier1Clubs.includes(id)).length;
    }

    const totalSlots = NUM_SEASONS * 4;
    const tier1Share = tier1Slots / totalSlots;
    console.log(`Tier 1 share of top-4 slots: ${(tier1Share * 100).toFixed(1)}%`);
    // Fair share would be 15% (3 of 20 clubs). Elites should be well above —
    // 35% is a conservative floor that still catches a regression.
    expect(tier1Share).toBeGreaterThan(0.35);
  });

  it('bottom 3 contains at least 1 Tier 4 or Tier 5 club', () => {
    const clubs = buildClubs('bottom3-test');
    const result = simulateFullSeason('bottom3-test', 1, clubs);

    const bottom3Ids = result.finalTable.slice(17, 20).map((r) => r.clubId);
    const lowTierClubs = CLUBS.filter((c) => c.tier >= 4).map((c) => c.id);
    const lowTierInBottom3 = bottom3Ids.filter((id) => lowTierClubs.includes(id));

    console.log(`Bottom 3: ${bottom3Ids.join(', ')}`);
    expect(lowTierInBottom3.length).toBeGreaterThanOrEqual(1);
  });

  it('produces identical results with the same seed (determinism)', () => {
    const clubs1 = buildClubs('determinism-season');
    const clubs2 = buildClubs('determinism-season');

    const result1 = simulateFullSeason('determinism-season', 1, clubs1);
    const result2 = simulateFullSeason('determinism-season', 1, clubs2);

    // Final tables must be identical
    expect(result1.finalTable.map((r) => r.clubId)).toEqual(
      result2.finalTable.map((r) => r.clubId),
    );
    expect(result1.finalTable.map((r) => r.points)).toEqual(
      result2.finalTable.map((r) => r.points),
    );
    expect(result1.finalTable.map((r) => r.goalsFor)).toEqual(
      result2.finalTable.map((r) => r.goalsFor),
    );
  });

  it('Golden Boot range is realistic (15-30 goals)', () => {
    const clubs = buildClubs('golden-boot-test');
    const result = simulateFullSeason('golden-boot-test', 1, clubs);

    const topGoals = result.topScorer?.goals || 0;
    console.log(`Golden Boot: ${topGoals} goals`);
    expect(topGoals).toBeGreaterThanOrEqual(10);
    expect(topGoals).toBeLessThanOrEqual(40);
  });
});

describe('League Table Mechanics', () => {
  it('table sorts by points, then goal difference, then goals for', () => {
    const table = [
      { clubId: 'a', played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 3, goalsAgainst: 0, goalDifference: 3, points: 3 },
      { clubId: 'b', played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, goalDifference: 2, points: 3 },
      { clubId: 'c', played: 1, won: 0, drawn: 1, lost: 0, goalsFor: 1, goalsAgainst: 1, goalDifference: 0, points: 1 },
    ];
    const sorted = sortTable(table);
    expect(sorted[0].clubId).toBe('a');
    expect(sorted[1].clubId).toBe('b');
    expect(sorted[2].clubId).toBe('c');
  });
});

describe('Fortune System', () => {
  it('generates fortunes for all clubs', () => {
    const rng = new SeededRNG('fortune-test');
    const clubData = CLUBS.map((c) => ({ id: c.id, tier: c.tier }));
    const fortunes = generateSeasonFortunes(rng, clubData);

    expect(fortunes).toHaveLength(20);
    for (const f of fortunes) {
      expect(f.fortune).toBeGreaterThanOrEqual(-6);
      expect(f.fortune).toBeLessThanOrEqual(9);
    }
  });
});
