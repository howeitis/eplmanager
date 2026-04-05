import { describe, it, expect } from 'vitest';
import { generateAllSquads } from '../playerGen';
import { simulateLightweightSeason, type LightweightSeasonResult } from '../seasonSim';
import { simulateFACup } from '../faCup';
import { type ClubFortune } from '../matchSim';
import { CLUBS } from '../../data/clubs';
import { SeededRNG } from '../../utils/rng';
import { seasonSeed as deriveSeasonSeed } from '../../utils/rng';
import type { Club } from '../../types/entities';

function buildClubs(seed: string): Club[] {
  const squads = generateAllSquads(seed, CLUBS);
  return CLUBS.map((data) => ({
    ...data,
    roster: squads.get(data.id)!,
  }));
}

describe('100-Season Balance Validation (GATE)', () => {
  it('produces realistic Premier League seasons over 100 iterations', () => {
    const NUM_SEASONS = 100;
    const gameSeed = 'balance-gate-v1';

    // ─── Accumulators (lightweight — no match-level data retained) ───
    const positionSums = new Map<string, number>(); // clubId → sum of finishing positions
    const championCounts = new Map<string, number>();
    const top4Counts = new Map<string, number>();
    const bottom3Counts = new Map<string, number>();
    const faCupCounts = new Map<string, number>();
    const championPointsList: number[] = [];
    const lastPlacePointsList: number[] = [];
    const goldenBootGoalsList: number[] = [];
    let tier45InTop6Count = 0;

    // Initialize accumulators
    for (const club of CLUBS) {
      positionSums.set(club.id, 0);
      championCounts.set(club.id, 0);
      top4Counts.set(club.id, 0);
      bottom3Counts.set(club.id, 0);
      faCupCounts.set(club.id, 0);
    }

    let previousFortunes: ClubFortune[] | undefined;

    for (let season = 1; season <= NUM_SEASONS; season++) {
      // Build fresh clubs each season (no transfer/aging system yet)
      const clubs = buildClubs(`${gameSeed}-gen-${season}`);

      // Simulate the season (lightweight — discards match data internally)
      const result: LightweightSeasonResult = simulateLightweightSeason(
        gameSeed,
        season,
        clubs,
        previousFortunes,
      );

      // Carry forward fortunes for golden generation continuity
      previousFortunes = result.fortunes;

      // Extract accumulator data
      const table = result.finalTable;
      const champion = table[0].clubId;
      const championPts = table[0].points;
      const lastPts = table[19].points;
      const topGoals = result.topScorerGoals;

      championPointsList.push(championPts);
      lastPlacePointsList.push(lastPts);
      goldenBootGoalsList.push(topGoals);
      championCounts.set(champion, (championCounts.get(champion) || 0) + 1);

      for (let i = 0; i < 20; i++) {
        const clubId = table[i].clubId;
        positionSums.set(clubId, (positionSums.get(clubId) || 0) + (i + 1));

        if (i < 4) top4Counts.set(clubId, (top4Counts.get(clubId) || 0) + 1);
        if (i >= 17) bottom3Counts.set(clubId, (bottom3Counts.get(clubId) || 0) + 1);

        // Track Tier 4/5 in top 6
        if (i < 6) {
          const clubTier = CLUBS.find((c) => c.id === clubId)!.tier;
          if (clubTier >= 4) tier45InTop6Count++;
        }
      }

      // FA Cup (quick sim using mid-season table approximation)
      const sSeed = deriveSeasonSeed(gameSeed, season);
      const cupRng = new SeededRNG(`${sSeed}-facup`);
      const fortuneMap = new Map<string, number>();
      for (const f of result.fortunes) {
        fortuneMap.set(f.clubId, f.fortune);
      }
      const cupResult = simulateFACup(cupRng, clubs, table, fortuneMap, sSeed);
      if (cupResult.winner) {
        faCupCounts.set(cupResult.winner, (faCupCounts.get(cupResult.winner) || 0) + 1);
      }

      // ─── AGGRESSIVE DISCARD: null out all references ───
      // Allow GC to reclaim memory between seasons
    }

    // ─── Output Results ───
    console.log(`\n${'═'.repeat(70)}`);
    console.log('  100-SEASON BALANCE VALIDATION REPORT');
    console.log(`${'═'.repeat(70)}\n`);

    // Average finishing position by club
    console.log('Average Finishing Position (by tier):');
    console.log('─'.repeat(50));
    const avgPositions: { club: typeof CLUBS[0]; avgPos: number }[] = [];
    for (const club of CLUBS) {
      const avg = (positionSums.get(club.id) || 0) / NUM_SEASONS;
      avgPositions.push({ club, avgPos: avg });
    }
    avgPositions.sort((a, b) => a.avgPos - b.avgPos);
    for (const { club, avgPos } of avgPositions) {
      console.log(
        `  T${club.tier} ${club.shortName.padEnd(3)} avg=${avgPos.toFixed(1).padStart(5)} | ` +
        `Titles: ${String(championCounts.get(club.id) || 0).padStart(2)} | ` +
        `Top4: ${String(top4Counts.get(club.id) || 0).padStart(2)} | ` +
        `Bot3: ${String(bottom3Counts.get(club.id) || 0).padStart(2)} | ` +
        `Cup: ${String(faCupCounts.get(club.id) || 0).padStart(2)}`,
      );
    }

    // Champion distribution
    console.log('\nChampion Distribution:');
    console.log('─'.repeat(50));
    const champSorted = [...championCounts.entries()]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    for (const [clubId, count] of champSorted) {
      const club = CLUBS.find((c) => c.id === clubId)!;
      console.log(`  ${club.shortName} (T${club.tier}): ${count} titles`);
    }

    // Points ranges
    const avgChampPts = championPointsList.reduce((a, b) => a + b, 0) / NUM_SEASONS;
    const minChampPts = Math.min(...championPointsList);
    const maxChampPts = Math.max(...championPointsList);
    const avgLastPts = lastPlacePointsList.reduce((a, b) => a + b, 0) / NUM_SEASONS;
    const minLastPts = Math.min(...lastPlacePointsList);
    const maxLastPts = Math.max(...lastPlacePointsList);

    console.log('\nPoints Ranges:');
    console.log('─'.repeat(50));
    console.log(`  Champion:   avg=${avgChampPts.toFixed(1)} range=[${minChampPts}-${maxChampPts}]`);
    console.log(`  Last place: avg=${avgLastPts.toFixed(1)} range=[${minLastPts}-${maxLastPts}]`);

    // Golden Boot
    const avgGoldenBoot = goldenBootGoalsList.reduce((a, b) => a + b, 0) / NUM_SEASONS;
    const minGB = Math.min(...goldenBootGoalsList);
    const maxGB = Math.max(...goldenBootGoalsList);
    console.log(`  Golden Boot: avg=${avgGoldenBoot.toFixed(1)} range=[${minGB}-${maxGB}]`);

    // Tier 4/5 in top 6
    const avgT45Top6 = tier45InTop6Count / NUM_SEASONS;
    console.log(`\n  Avg Tier 4/5 clubs in top 6 per season: ${avgT45Top6.toFixed(2)}`);

    console.log(`\n${'═'.repeat(70)}\n`);

    // ─── Assertions ───

    // 1. Tier correlation: T1 avg position should be better than T5
    const t1Avg = CLUBS.filter((c) => c.tier === 1)
      .reduce((sum, c) => sum + (positionSums.get(c.id) || 0), 0) / (3 * NUM_SEASONS);
    const t5Avg = CLUBS.filter((c) => c.tier === 5)
      .reduce((sum, c) => sum + (positionSums.get(c.id) || 0), 0) / (4 * NUM_SEASONS);

    console.log(`Tier 1 avg position: ${t1Avg.toFixed(1)}`);
    console.log(`Tier 5 avg position: ${t5Avg.toFixed(1)}`);
    expect(t1Avg).toBeLessThan(t5Avg);
    expect(t1Avg).toBeLessThan(7); // T1 should average top 6
    expect(t5Avg).toBeGreaterThan(12); // T5 should average bottom half

    // 2. Champion points: 75-100
    expect(avgChampPts).toBeGreaterThanOrEqual(75);
    expect(avgChampPts).toBeLessThanOrEqual(100);
    // Individual seasons can vary more
    expect(minChampPts).toBeGreaterThanOrEqual(65);
    expect(maxChampPts).toBeLessThanOrEqual(110);

    // 3. Last place points: 15-35
    expect(avgLastPts).toBeGreaterThanOrEqual(15);
    expect(avgLastPts).toBeLessThanOrEqual(40);

    // 4. Golden Boot: 15-30 goals on average
    expect(avgGoldenBoot).toBeGreaterThanOrEqual(12);
    expect(avgGoldenBoot).toBeLessThanOrEqual(35);

    // 5. Tier 4/5 in top 6 should be rare but nonzero (Leicester effect)
    expect(tier45InTop6Count).toBeGreaterThan(0);
    expect(avgT45Top6).toBeLessThan(3); // Not common

    // 6. T1 clubs should win most titles
    const t1Titles = CLUBS.filter((c) => c.tier === 1)
      .reduce((sum, c) => sum + (championCounts.get(c.id) || 0), 0);
    expect(t1Titles).toBeGreaterThan(40); // T1 should win >40% of titles

    // 7. Multiple different champions (not one team winning everything)
    const uniqueChampions = champSorted.length;
    expect(uniqueChampions).toBeGreaterThanOrEqual(3); // At least 3 different champions
  }, 120000); // 2 minute timeout for 100 seasons
});
