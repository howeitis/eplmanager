import { describe, it, expect } from 'vitest';
import { simulateFACup } from '@/engine/faCup';
import { generateAllSquads } from '@/engine/playerGen';
import { generateFixtures, createEmptyTable, updateTable, sortTable, getMonthFixtures, simulateMatch, selectAIFormation, selectAIMentality, generateSeasonFortunes } from '@/engine/matchSim';
import { CLUBS } from '@/data/clubs';
import { SeededRNG } from '@/utils/rng';
import { seasonSeed as deriveSeasonSeed } from '@/utils/rng';
import type { Club, LeagueTableRow } from '@/types/entities';

function buildClubs(seed: string): Club[] {
  const squads = generateAllSquads(seed, CLUBS);
  return CLUBS.map((data) => ({
    ...data,
    roster: squads.get(data.id)!,
  }));
}

/**
 * Simulate half a season (through January) to get a realistic mid-season table
 * for FA Cup seeding.
 */
function getMidSeasonTable(seed: string, clubs: Club[]): LeagueTableRow[] {
  const sSeed = deriveSeasonSeed(seed, 1);
  const rng = new SeededRNG(sSeed);
  const clubIds = clubs.map((c) => c.id);
  const fixtures = generateFixtures(rng, clubIds);
  let table = createEmptyTable(clubIds);

  const fortuneRng = new SeededRNG(`${sSeed}-fortune`);
  const fortunes = generateSeasonFortunes(
    fortuneRng,
    clubs.map((c) => ({ id: c.id, tier: c.tier })),
  );
  const fortuneMap = new Map<string, number>();
  for (const f of fortunes) {
    fortuneMap.set(f.clubId, f.fortune);
  }

  const clubMap = new Map<string, Club>();
  for (const club of clubs) {
    clubMap.set(club.id, club);
  }

  // Simulate August through January (before FA Cup starts in February)
  const earlyPhases = ['august', 'september', 'october', 'november', 'december', 'january'] as const;
  for (const phase of earlyPhases) {
    const monthFixtures = getMonthFixtures(fixtures, phase);
    const monthRng = new SeededRNG(`${sSeed}-month-${phase}`);

    for (const fixture of monthFixtures) {
      const homeClub = clubMap.get(fixture.homeClubId)!;
      const awayClub = clubMap.get(fixture.awayClubId)!;
      const homeFormation = selectAIFormation(monthRng, homeClub.tier);
      const awayFormation = selectAIFormation(monthRng, awayClub.tier);
      const homeMentality = selectAIMentality(monthRng, homeClub.tier, 10, 20);
      const awayMentality = selectAIMentality(monthRng, awayClub.tier, 10, 20);

      const result = simulateMatch({
        homeClub,
        awayClub,
        fixture,
        homeFormation,
        awayFormation,
        homeMentality,
        awayMentality,
        homeFortune: fortuneMap.get(homeClub.id) || 0,
        awayFortune: fortuneMap.get(awayClub.id) || 0,
        seasonSeed: sSeed,
      });
      table = updateTable(table, result);
    }
  }
  return sortTable(table);
}

describe('FA Cup', () => {
  it('produces a winner from the 20 clubs', () => {
    const clubs = buildClubs('facup-test-1');
    const table = getMidSeasonTable('facup-test-1', clubs);
    const rng = new SeededRNG('facup-draw-1');
    const fortuneMap = new Map<string, number>();
    for (const club of clubs) fortuneMap.set(club.id, 0);

    const result = simulateFACup(rng, clubs, table, fortuneMap, 'facup-season-1');

    expect(result.winner).toBeTruthy();
    expect(CLUBS.map((c) => c.id)).toContain(result.winner);
    console.log(`FA Cup winner: ${result.winner}`);
  });

  it('eliminates 19 teams (only winner survives)', () => {
    const clubs = buildClubs('facup-test-2');
    const table = getMidSeasonTable('facup-test-2', clubs);
    const rng = new SeededRNG('facup-draw-2');
    const fortuneMap = new Map<string, number>();
    for (const club of clubs) fortuneMap.set(club.id, 0);

    const result = simulateFACup(rng, clubs, table, fortuneMap, 'facup-season-2');

    expect(result.eliminated.size).toBe(19);
    expect(result.eliminated.has(result.winner!)).toBe(false);
  });

  it('has the correct number of fixtures (4 prelim + 8 R16 + 4 QF + 2 SF + 1 F = 19)', () => {
    const clubs = buildClubs('facup-test-3');
    const table = getMidSeasonTable('facup-test-3', clubs);
    const rng = new SeededRNG('facup-draw-3');
    const fortuneMap = new Map<string, number>();
    for (const club of clubs) fortuneMap.set(club.id, 0);

    const result = simulateFACup(rng, clubs, table, fortuneMap, 'facup-season-3');

    expect(result.fixtures).toHaveLength(19);

    const r16Count = result.fixtures.filter((f) => f.round === 'R16').length;
    const qfCount = result.fixtures.filter((f) => f.round === 'QF').length;
    const sfCount = result.fixtures.filter((f) => f.round === 'SF').length;
    const fCount = result.fixtures.filter((f) => f.round === 'F').length;

    expect(r16Count).toBe(12); // 4 prelim (labeled R16) + 8 actual R16
    expect(qfCount).toBe(4);
    expect(sfCount).toBe(2);
    expect(fCount).toBe(1);
  });

  it('is deterministic with the same seed', () => {
    const clubs1 = buildClubs('facup-det');
    const clubs2 = buildClubs('facup-det');
    const table1 = getMidSeasonTable('facup-det', clubs1);
    const table2 = getMidSeasonTable('facup-det', clubs2);
    const fortuneMap = new Map<string, number>();
    for (const club of clubs1) fortuneMap.set(club.id, 0);

    const result1 = simulateFACup(new SeededRNG('facup-det-draw'), clubs1, table1, fortuneMap, 'facup-det-s');
    const result2 = simulateFACup(new SeededRNG('facup-det-draw'), clubs2, table2, fortuneMap, 'facup-det-s');

    expect(result1.winner).toBe(result2.winner);
    expect(result1.fixtures.map((f) => f.result?.homeGoals)).toEqual(
      result2.fixtures.map((f) => f.result?.homeGoals),
    );
  });

  it('elite teams win more often over 50 seasons, but upsets happen', () => {
    const winCounts = new Map<string, number>();
    const tierWins = new Map<number, number>();

    for (let i = 0; i < 50; i++) {
      const seed = `facup-balance-${i}`;
      const clubs = buildClubs(seed);
      const table = getMidSeasonTable(seed, clubs);
      const rng = new SeededRNG(`facup-draw-balance-${i}`);
      const fortuneMap = new Map<string, number>();

      // Generate fortunes for realistic variation
      const fortuneRng = new SeededRNG(`${seed}-fortune`);
      const fortunes = generateSeasonFortunes(
        fortuneRng,
        clubs.map((c) => ({ id: c.id, tier: c.tier })),
      );
      for (const f of fortunes) fortuneMap.set(f.clubId, f.fortune);

      const result = simulateFACup(rng, clubs, table, fortuneMap, `facup-s-${i}`);
      const winner = result.winner!;
      winCounts.set(winner, (winCounts.get(winner) || 0) + 1);
      const tier = CLUBS.find((c) => c.id === winner)!.tier;
      tierWins.set(tier, (tierWins.get(tier) || 0) + 1);
    }

    console.log('\n=== FA Cup Winners over 50 seasons ===');
    const sorted = [...winCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [clubId, wins] of sorted) {
      const club = CLUBS.find((c) => c.id === clubId)!;
      console.log(`  ${club.shortName} (T${club.tier}): ${wins} wins`);
    }
    console.log('\nWins by tier:');
    for (let t = 1; t <= 5; t++) {
      console.log(`  Tier ${t}: ${tierWins.get(t) || 0} wins`);
    }

    // Elite teams (T1+T2) should win majority but not all
    const eliteWins = (tierWins.get(1) || 0) + (tierWins.get(2) || 0);
    expect(eliteWins).toBeGreaterThan(15); // At least 30% of cups
    expect(eliteWins).toBeLessThan(50); // Not all of them — upsets must happen

    // At least 1 non-elite winner over 50 seasons
    const nonEliteWins = 50 - eliteWins;
    expect(nonEliteWins).toBeGreaterThanOrEqual(1);
  });
});
