import { describe, it, expect } from 'vitest';
import { detectFinalDayStakes } from '../finalDayStakes';
import type { LeagueTableRow } from '@/types/entities';

function row(clubId: string, points: number, gd = 0): LeagueTableRow {
  return {
    clubId,
    played: 37,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: gd > 0 ? gd : 0,
    goalsAgainst: 0,
    goalDifference: gd,
    points,
  };
}

/**
 * Builds a 20-row league with the given points spread. The order is the
 * sort order (so positions[0] is the leader), and the player slot defaults
 * to position `playerPos` (0-indexed).
 */
function table(points: number[], playerPos: number): LeagueTableRow[] {
  if (points.length !== 20) throw new Error('expected 20 points entries');
  return points.map((pts, i) =>
    row(i === playerPos ? 'you' : `c${i}`, pts, 20 - i),
  );
}

describe('detectFinalDayStakes', () => {
  it('returns null when no race exists', () => {
    // Comfortable 20-point gap at the top, player mid-table, nothing tight.
    const pts = [90, 70, 65, 60, 55, 50, 48, 45, 42, 40, 38, 36, 34, 32, 30, 28, 26, 23, 20, 17];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 8),
      playerClubId: 'you',
      fixturesRemaining: 1,
    });
    expect(stakes).toBeNull();
  });

  it('returns null when no fixtures remain', () => {
    const pts = [85, 84, 70, 65, 55, 50, 48, 45, 42, 40, 38, 36, 34, 32, 30, 28, 26, 23, 20, 17];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 0),
      playerClubId: 'you',
      fixturesRemaining: 0,
    });
    expect(stakes).toBeNull();
  });

  it('fires a title-race cinematic when top two are within 5 points', () => {
    const pts = [85, 84, 70, 65, 55, 50, 48, 45, 42, 40, 38, 36, 34, 32, 30, 28, 26, 23, 20, 17];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 0),
      playerClubId: 'you',
      fixturesRemaining: 1,
    });
    expect(stakes?.kind).toBe('title');
    expect(stakes && 'contenders' in stakes && stakes.contenders).toContain('you');
  });

  it('does not fire title-race when the gap to second is more than 5 points', () => {
    // Leader 95, second 87 (gap 8). No other tight races.
    const pts = [95, 87, 70, 60, 55, 50, 48, 45, 42, 40, 38, 36, 34, 32, 30, 28, 26, 23, 20, 17];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 5),
      playerClubId: 'you',
      fixturesRemaining: 1,
    });
    expect(stakes).toBeNull();
  });

  it('fires a relegation cinematic when player is in bottom 4 and within 5 of safety', () => {
    // 17th = 32, 18th = 31, 19th (you) = 30, 20th = 28. Top of table is
    // wide-open so no title race overrides. Player is within 5 pts of 17th.
    const pts = [85, 78, 70, 64, 58, 52, 48, 45, 42, 40, 38, 36, 34, 32, 32, 32, 32, 31, 30, 28];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 18),
      playerClubId: 'you',
      fixturesRemaining: 1,
    });
    expect(stakes?.kind).toBe('relegation');
    expect(stakes && 'contenders' in stakes && stakes.contenders).toContain('you');
  });

  it('does not fire relegation when player is comfortably mid-table', () => {
    // Player at 9th (10th index) with comfortable cushion, top wide open.
    const pts = [85, 78, 70, 64, 58, 52, 48, 45, 42, 40, 38, 36, 34, 32, 28, 26, 22, 18, 14, 10];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 9),
      playerClubId: 'you',
      fixturesRemaining: 1,
    });
    expect(stakes).toBeNull();
  });

  it('fires a top-four cinematic when player is 5th and within 5 pts of 4th', () => {
    // 4th = 70, 5th (you) = 67. Top three clear (85/82/76). Title gap 3
    // BUT — second is 82 to leader 85, that's within 5. So title race
    // overrides the top-four check. To isolate the top-four case, widen
    // the title gap.
    const pts = [95, 86, 78, 70, 67, 60, 56, 50, 46, 42, 38, 36, 34, 32, 30, 28, 26, 23, 20, 17];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 4),
      playerClubId: 'you',
      fixturesRemaining: 1,
    });
    expect(stakes?.kind).toBe('topfour');
  });

  it('does not fire top-four when player is already in 4th', () => {
    const pts = [95, 86, 78, 70, 56, 50, 48, 45, 42, 40, 38, 36, 34, 32, 30, 28, 26, 23, 20, 17];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 3),
      playerClubId: 'you',
      fixturesRemaining: 1,
    });
    // 4th place, gap behind to 5th is 14 pts — no cinematic needed.
    expect(stakes).toBeNull();
  });

  it('does not fire top-four when player is far from 4th', () => {
    // Player at 7th, 4th is 12 pts ahead.
    const pts = [95, 86, 78, 70, 65, 62, 58, 45, 42, 40, 38, 36, 34, 32, 30, 28, 26, 23, 20, 17];
    const stakes = detectFinalDayStakes({
      leagueTable: table(pts, 6),
      playerClubId: 'you',
      fixturesRemaining: 1,
    });
    expect(stakes).toBeNull();
  });
});
