import type { SeededRNG } from '../utils/rng';

/**
 * Pure narrative helpers for the July off-season "preseason" beat.
 *
 * Lives in /engine because it has no React dependencies and is purely a
 * function of (rng, calendarYear) — meaning it stays seeded/deterministic
 * and can be unit-tested without booting the UI.
 */

/** Starting calendar year for season 1 (2026 = World Cup year). */
export const BASE_YEAR = 2026;

export function getCalendarYear(seasonNumber: number): number {
  return BASE_YEAR + (seasonNumber - 1);
}

/** Determine what summer tournament (if any) takes place this year. */
export function getSummerTournament(calendarYear: number): 'world_cup' | 'euros' | null {
  if (calendarYear % 4 === 2) return 'world_cup'; // 2026, 2030, 2034...
  if (calendarYear % 4 === 0) return 'euros';      // 2028, 2032, 2036...
  return null;
}

const WORLD_CUP_HOSTS: Record<number, string> = {
  2026: 'USA, Mexico & Canada',
  2030: 'Morocco, Portugal & Spain',
  2034: 'Saudi Arabia',
};

const EURO_HOSTS: Record<number, string> = {
  2028: 'the United Kingdom',
  2032: 'Italy & Turkey',
};

const RANDOM_WORLD_CUP_HOSTS = [
  'Australia & New Zealand', 'Japan & South Korea', 'Brazil', 'Argentina',
  'Egypt & South Africa', 'India & Pakistan', 'Canada', 'China',
];

const RANDOM_EURO_HOSTS = [
  'France', 'Germany', 'Spain', 'Netherlands & Belgium',
  'Poland & Ukraine', 'Scandinavia', 'Greece & Turkey', 'Austria & Switzerland',
];

export interface JulyNarrativeResult {
  text: string;
  englandWonTournament: 'world_cup' | 'euros' | null;
  /** Nationality key for the tournament winner (e.g. "brazilian"), null when no tournament. */
  winnerNationality: string | null;
}

/** Maps country names used in the winner pools to asset nationality keys. */
const COUNTRY_TO_NATIONALITY: Record<string, string> = {
  Brazil: 'brazilian',
  Argentina: 'argentinian',
  France: 'french',
  Germany: 'german',
  Spain: 'spanish',
  England: 'english',
  Italy: 'italian',
  Netherlands: 'dutch',
  Portugal: 'portuguese',
  Belgium: 'belgian',
  Denmark: 'danish',
  Croatia: 'croatian',
};

export function generateJulyNarrative(rng: SeededRNG, calendarYear: number): JulyNarrativeResult {
  const tournament = getSummerTournament(calendarYear);

  if (tournament === 'world_cup') {
    const host =
      WORLD_CUP_HOSTS[calendarYear] ||
      RANDOM_WORLD_CUP_HOSTS[rng.randomInt(0, RANDOM_WORLD_CUP_HOSTS.length - 1)];
    const winners = [
      'Brazil', 'Argentina', 'France', 'Germany', 'Spain',
      'England', 'Italy', 'Netherlands', 'Portugal', 'Belgium',
    ];
    const winner = winners[rng.randomInt(0, winners.length - 1)];
    if (winner === 'England') {
      const line = `IT'S COMING HOME! England are World Cup champions after lifting the trophy in ${host}. Pubs are packed, the nation rejoices — and the board has unlocked a £15M commercial windfall on the back of the celebrations.`;
      return { text: line, englandWonTournament: 'world_cup', winnerNationality: 'english' };
    }
    const dramas = [
      `${winner} lifted the World Cup trophy in ${host} after a dramatic final.`,
      `A golden generation delivered as ${winner} won the ${calendarYear} World Cup in ${host}.`,
      `${winner} are World Cup champions! The tournament in ${host} will be remembered for years.`,
    ];
    return { text: dramas[rng.randomInt(0, dramas.length - 1)], englandWonTournament: null, winnerNationality: COUNTRY_TO_NATIONALITY[winner] || null };
  }

  if (tournament === 'euros') {
    const host =
      EURO_HOSTS[calendarYear] ||
      RANDOM_EURO_HOSTS[rng.randomInt(0, RANDOM_EURO_HOSTS.length - 1)];
    const winners = [
      'Spain', 'France', 'Germany', 'Italy', 'England',
      'Netherlands', 'Portugal', 'Belgium', 'Denmark', 'Croatia',
    ];
    const winner = winners[rng.randomInt(0, winners.length - 1)];
    if (winner === 'England') {
      const line = `FOOTBALL'S COMING HOME! England are Kings of Europe after winning Euro ${calendarYear} in ${host}. A generation-defining summer — and the board has unlocked a £15M commercial windfall on the back of the celebrations.`;
      return { text: line, englandWonTournament: 'euros', winnerNationality: 'english' };
    }
    const dramas = [
      `${winner} won Euro ${calendarYear} hosted by ${host} after a thrilling summer of football.`,
      `Euro ${calendarYear} in ${host} is over — ${winner} are the new champions of Europe!`,
      `${winner} crowned European champions in ${host}! Their players return to their clubs on a high.`,
    ];
    return { text: dramas[rng.randomInt(0, dramas.length - 1)], englandWonTournament: null, winnerNationality: COUNTRY_TO_NATIONALITY[winner] || null };
  }

  return { text: pickPreseasonStory(rng), englandWonTournament: null, winnerNationality: null };
}

export function pickPreseasonStory(rng: SeededRNG): string {
  const stories = [
    'Pre-season is in full swing. Managers are putting their squads through gruelling fitness regimes under the summer sun.',
    'The pre-season friendlies are done. Time to finalise the squad before the window closes.',
    'Clubs are jetting off on lucrative pre-season tours. The marketing teams are happy, the physios less so.',
    'A viral video of a goalkeeper scoring an overhead kick in a pre-season friendly has the internet buzzing.',
    'Several stars have returned from holiday looking suspiciously unfit. Nutritionists across the league are in crisis mode.',
    'The new kits have dropped. Fan opinions range from "instant classic" to "designed by a toddler."',
    'A manager was spotted at an airport with a mysterious briefcase. Transfer Twitter is in meltdown.',
    'Pre-season training camps are wrapping up. The squad is looking sharp — the real business starts soon.',
  ];
  return stories[rng.randomInt(0, stories.length - 1)];
}
