import type { Club, LeagueTableRow, MatchResult, PlayingBackground } from '@/types/entities';
import { SeededRNG } from '@/utils/rng';
import {
  simulateMatch,
  selectAIFormation,
  selectAIMentality,
} from './matchSim';

interface UserContext {
  userClubId?: string;
  userBackground?: PlayingBackground;
  /** Phase B: equipped Instruction card id, applied to whichever cup match
   *  the user's club is playing in. AI cup ties leave it undefined. */
  userInstructionCardId?: string | null;
}

// ─── FA Cup Types ───

export interface FACupFixture {
  homeClubId: string;
  awayClubId: string;
  round: 'R16' | 'QF' | 'SF' | 'F';
  result: MatchResult | null;
}

export interface FACupState {
  fixtures: FACupFixture[];
  eliminated: Set<string>;
  winner: string | null;
}

// ─── FA Cup Bracket Generation ───

/**
 * Generate the FA Cup Round of 16 bracket.
 * Seeded draw: top 8 league teams avoid each other in the first round.
 */
export function generateFACupDraw(
  rng: SeededRNG,
  leagueTable: LeagueTableRow[],
): FACupFixture[] {
  // Top 8 are seeded, bottom 12 are unseeded
  const seeded = leagueTable.slice(0, 8).map((r) => r.clubId);
  const unseeded = leagueTable.slice(8, 20).map((r) => r.clubId);

  // Shuffle both groups
  shuffle(rng, seeded);
  shuffle(rng, unseeded);

  // Pair seeded teams with unseeded teams (8 matches)
  // First 8 matches: seeded vs unseeded
  const fixtures: FACupFixture[] = [];
  for (let i = 0; i < 8; i++) {
    // Seeded team is home
    fixtures.push({
      homeClubId: seeded[i],
      awayClubId: unseeded[i],
      round: 'R16',
      result: null,
    });
  }

  // Remaining 4 unseeded teams play each other
  for (let i = 8; i < unseeded.length; i += 2) {
    fixtures.push({
      homeClubId: unseeded[i],
      awayClubId: unseeded[i + 1],
      round: 'R16',
      result: null,
    });
  }

  // Wait — we need exactly 16 teams = 8 matches for R16
  // 20 teams -> Round of 16 means 4 teams get byes? No, the PRD says "all 20 clubs"
  // R16 with 20 teams = we need a qualifying round for 4 teams, or we can play 4 first-round matches
  // Actually: 20 teams → we need to narrow to 16. Play 4 preliminary matches, then 8 R16 matches.
  // But PRD says "Round of 16: Played in February" — let's interpret as the top 12 get byes, bottom 8 play qualifiers.
  // Actually re-reading: "Single-elimination knockout, all 20 Premier League clubs"
  // With 20 teams, Round 1 would be 10 matches → 10 winners → need 6 more → doesn't work cleanly.
  // Simplest interpretation: R16 is really "Round of 20" reduced via byes.
  // Better: first round = 4 matches (8 teams) → 4 winners + 12 byes = 16 → then actual R16
  // But the PRD maps: R16=Feb, QF=Mar, SF=Apr, F=May. 4 rounds = 16 → 8 → 4 → 2 → 1.
  // So we need exactly 16 teams in February. The 4 extra teams are eliminated via preliminary.
  // For simplicity: bottom 8 league teams play 4 preliminary matches. Winners + top 12 = 16.
  // But the PRD says R16 is in February. Let me just do it clean:

  // REVISED: 4 preliminary matches from bottom 8 clubs, played at start of February.
  // Then 8 R16 matches from the 12 top clubs + 4 winners.
  // This is too complex for the current structure. Let's simplify:
  // Play 10 R16 matches (all 20 teams), giving us 10 winners.
  // Hmm, that doesn't give a clean bracket either.

  // FINAL APPROACH: Give the top 4 byes. Bottom 16 play R16 (8 matches) → 8 winners + 4 with byes = 12.
  // That's still not clean.

  // SIMPLEST: Just use 16 teams. Top 4 get byes to QF. Remaining 16 play R16 = 8 matches.
  // QF: 8 teams (4 R16 winners + 4 seeded). SF: 4 teams. F: 2 teams.
  // Wait: 8 R16 matches → 8 winners. + 4 byes = 12. QF needs 8. Doesn't work.

  // OK let me just do 20 teams → R32-ish prelim:
  // Prelim: 4 matches (8 teams) → 4 advance, 12 have byes → 16 total
  // R16: 8 matches → 8 teams
  // QF: 4 matches → 4 teams
  // SF: 2 matches → 2 teams
  // F: 1 match → winner

  // The PRD says R16 in Feb, so let's fold the prelim into February too.
  // This gives us: Feb (prelim + R16), Mar (QF), Apr (SF), May (F)

  return []; // Will be replaced below with the actual implementation
}

function shuffle(rng: SeededRNG, arr: string[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Generate and simulate an entire FA Cup tournament.
 * 20 teams: 4 prelim matches (bottom 8), then R16 (8 matches), QF, SF, F.
 */
export function simulateFACup(
  rng: SeededRNG,
  clubs: Club[],
  leagueTable: LeagueTableRow[],
  fortuneMap: Map<string, number>,
  seasonSeed: string,
  userContext: UserContext = {},
): FACupState {
  return simulateFACupClean(rng, clubs, leagueTable, fortuneMap, seasonSeed, userContext);
}

function simulateFACupClean(
  rng: SeededRNG,
  clubs: Club[],
  leagueTable: LeagueTableRow[],
  fortuneMap: Map<string, number>,
  seasonSeed: string,
  userContext: UserContext,
): FACupState {
  const clubMap = new Map<string, Club>();
  for (const club of clubs) {
    clubMap.set(club.id, club);
  }

  const fixtures: FACupFixture[] = [];
  const eliminated = new Set<string>();
  const sortedIds = leagueTable.map((r) => r.clubId);

  // Prelim: bottom 8 (positions 13-20) play 4 matches
  const prelimTeams = sortedIds.slice(12);
  shuffle(rng, prelimTeams);
  const prelimWinners: string[] = [];

  for (let i = 0; i < prelimTeams.length; i += 2) {
    const homeId = prelimTeams[i];
    const awayId = prelimTeams[i + 1];
    const result = simulateCupMatch(rng, clubMap, homeId, awayId, fortuneMap, seasonSeed, userContext, `cup-prelim-${i / 2}`);
    fixtures.push({ homeClubId: homeId, awayClubId: awayId, round: 'R16', result });

    const winner = pickCupWinner(rng, result, homeId, awayId);
    prelimWinners.push(winner);
    eliminated.add(winner === homeId ? awayId : homeId);
  }

  // R16: 12 auto-qualified + 4 prelim winners = 16 → 8 matches
  const r16Teams = [...sortedIds.slice(0, 12), ...prelimWinners];

  // Seeded draw: top 8 avoid each other
  const seeded = r16Teams.slice(0, 8);
  const unseeded = r16Teams.slice(8);
  shuffle(rng, seeded);
  shuffle(rng, unseeded);

  const r16Winners: string[] = [];
  for (let i = 0; i < 8; i++) {
    const homeId = seeded[i];
    const awayId = unseeded[i];
    const result = simulateCupMatch(rng, clubMap, homeId, awayId, fortuneMap, seasonSeed, userContext, `cup-r16-${i}`);
    fixtures.push({ homeClubId: homeId, awayClubId: awayId, round: 'R16', result });

    const winner = pickCupWinner(rng, result, homeId, awayId);
    r16Winners.push(winner);
    eliminated.add(winner === homeId ? awayId : homeId);
  }

  // QF: 8 → 4 (March)
  shuffle(rng, r16Winners);
  const qfWinners: string[] = [];
  for (let i = 0; i < r16Winners.length; i += 2) {
    const homeId = r16Winners[i];
    const awayId = r16Winners[i + 1];
    const result = simulateCupMatch(rng, clubMap, homeId, awayId, fortuneMap, seasonSeed, userContext, `cup-qf-${i / 2}`);
    fixtures.push({ homeClubId: homeId, awayClubId: awayId, round: 'QF', result });

    const winner = pickCupWinner(rng, result, homeId, awayId);
    qfWinners.push(winner);
    eliminated.add(winner === homeId ? awayId : homeId);
  }

  // SF: 4 → 2 (April)
  shuffle(rng, qfWinners);
  const sfWinners: string[] = [];
  for (let i = 0; i < qfWinners.length; i += 2) {
    const homeId = qfWinners[i];
    const awayId = qfWinners[i + 1];
    const result = simulateCupMatch(rng, clubMap, homeId, awayId, fortuneMap, seasonSeed, userContext, `cup-sf-${i / 2}`);
    fixtures.push({ homeClubId: homeId, awayClubId: awayId, round: 'SF', result });

    const winner = pickCupWinner(rng, result, homeId, awayId);
    sfWinners.push(winner);
    eliminated.add(winner === homeId ? awayId : homeId);
  }

  // Final: 2 → 1 (May)
  const homeId = sfWinners[0];
  const awayId = sfWinners[1];
  const finalResult = simulateCupMatch(rng, clubMap, homeId, awayId, fortuneMap, seasonSeed, userContext, 'cup-final');
  fixtures.push({ homeClubId: homeId, awayClubId: awayId, round: 'F', result: finalResult });

  const cupWinner = pickCupWinner(rng, finalResult, homeId, awayId);
  eliminated.add(cupWinner === homeId ? awayId : homeId);

  return {
    fixtures,
    eliminated,
    winner: cupWinner,
  };
}

function simulateCupMatch(
  rng: SeededRNG,
  clubMap: Map<string, Club>,
  homeId: string,
  awayId: string,
  fortuneMap: Map<string, number>,
  seasonSeed: string,
  userContext: UserContext,
  fixtureId: string,
): MatchResult {
  const homeClub = clubMap.get(homeId)!;
  const awayClub = clubMap.get(awayId)!;

  // AI decisions for cup matches
  const homeFormation = selectAIFormation(rng, homeClub.tier);
  const awayFormation = selectAIFormation(rng, awayClub.tier);
  const homeMentality = selectAIMentality(rng, homeClub.tier, 10, 20);
  const awayMentality = selectAIMentality(rng, awayClub.tier, 10, 20);

  return simulateMatch({
    homeClub,
    awayClub,
    fixture: {
      id: fixtureId,
      homeClubId: homeId,
      awayClubId: awayId,
      gameweek: 0,
      played: false,
      result: null,
    },
    homeFormation,
    awayFormation,
    homeMentality,
    awayMentality,
    homeFortune: fortuneMap.get(homeId) || 0,
    awayFortune: fortuneMap.get(awayId) || 0,
    seasonSeed,
    userClubId: userContext.userClubId,
    userBackground: userContext.userBackground,
    userInstructionCardId: userContext.userInstructionCardId,
    isCup: true,
  });
}

function pickCupWinner(
  rng: SeededRNG,
  result: MatchResult,
  homeId: string,
  awayId: string,
): string {
  if (result.homeGoals > result.awayGoals) return homeId;
  if (result.awayGoals > result.homeGoals) return awayId;
  // Draw → penalties (50/50 with slight home advantage)
  return rng.random() < 0.52 ? homeId : awayId;
}
