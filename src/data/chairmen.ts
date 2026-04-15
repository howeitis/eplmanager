export type ChairmanPersonality =
  | 'patient'
  | 'demanding'
  | 'ambitious'
  | 'frugal'
  | 'nostalgic';

export interface Chairman {
  clubId: string;
  name: string;
  title: string;
  personality: ChairmanPersonality;
  quirk: string;
}

export const CHAIRMEN: Chairman[] = [
  // Tier 1 — Elite
  {
    clubId: 'man-city',
    name: 'Sheikh Tariq Al-Mansouri',
    title: 'Owner',
    personality: 'ambitious',
    quirk: 'Believes anything less than European dominance is a failure.',
  },
  {
    clubId: 'arsenal',
    name: 'Sir Geoffrey Pembridge',
    title: 'Chairman',
    personality: 'patient',
    quirk: 'Values long-term project building over short-term silverware.',
  },
  {
    clubId: 'liverpool',
    name: 'Howard Cartwright III',
    title: 'Owner',
    personality: 'demanding',
    quirk: 'Tracks expected goals per pound spent with alarming precision.',
  },

  // Tier 2 — Contender
  {
    clubId: 'chelsea',
    name: 'Viktor Dragan Petrov',
    title: 'Owner',
    personality: 'demanding',
    quirk: 'Has sacked more managers than most clubs have employed.',
  },
  {
    clubId: 'man-utd',
    name: 'James Ratcliffe-Thornton',
    title: 'Chairman',
    personality: 'nostalgic',
    quirk: 'Obsessed with recreating the glory days of decades past.',
  },
  {
    clubId: 'tottenham',
    name: 'Leonard Whitmore',
    title: 'Chairman',
    personality: 'frugal',
    quirk: 'Will sell a star player if the price is right, every single time.',
  },
  {
    clubId: 'newcastle',
    name: 'Prince Faisal bin Rashid',
    title: 'Owner',
    personality: 'ambitious',
    quirk: 'Wants the club to be a global brand within five years.',
  },

  // Tier 3 — Established
  {
    clubId: 'aston-villa',
    name: 'Rupert Caldwell-Smythe',
    title: 'Chairman',
    personality: 'ambitious',
    quirk: 'Quietly obsessed with finishing above the local rivals.',
  },
  {
    clubId: 'brighton',
    name: 'Tony Ashworth',
    title: 'Chairman',
    personality: 'patient',
    quirk: 'A true believer in data-driven recruitment and process over panic.',
  },
  {
    clubId: 'west-ham',
    name: 'Derek Sullivan',
    title: 'Chairman',
    personality: 'nostalgic',
    quirk: 'Brings up the 1966 World Cup connection in every conversation.',
  },

  // Tier 4 — Mid-Table
  {
    clubId: 'fulham',
    name: 'Alistair Khan',
    title: 'Owner',
    personality: 'patient',
    quirk: 'Sees the club as a family heirloom, not a business.',
  },
  {
    clubId: 'brentford',
    name: 'Marcus Johansson',
    title: 'Sporting Director',
    personality: 'frugal',
    quirk: 'Believes in buying undervalued talent and selling at peak value.',
  },
  {
    clubId: 'bournemouth',
    name: 'Bill Foley Jr.',
    title: 'Owner',
    personality: 'patient',
    quirk: 'Enjoys the ride and trusts the coaching staff implicitly.',
  },
  {
    clubId: 'crystal-palace',
    name: 'Stephen Parish-Delaney',
    title: 'Chairman',
    personality: 'frugal',
    quirk: 'Runs a tight ship and expects maximum value from every signing.',
  },
  {
    clubId: 'wolves',
    name: 'Eduardo Gomes Ferreira',
    title: 'Owner',
    personality: 'ambitious',
    quirk: 'Dreams of turning a mid-table club into a continental force.',
  },
  {
    clubId: 'nottm-forest',
    name: 'Evangelos Marinakis-Pappas',
    title: 'Owner',
    personality: 'nostalgic',
    quirk: 'Keeps a framed photo of the 1979 European Cup in every boardroom.',
  },

  // Tier 5 — Survival
  {
    clubId: 'everton',
    name: 'Farhad Mossiri-Usmanov',
    title: 'Chairman',
    personality: 'demanding',
    quirk: 'Throws money at problems but expects immediate returns.',
  },
  {
    clubId: 'leicester',
    name: 'Khun Aiyawatt Raksriaksorn',
    title: 'Chairman',
    personality: 'nostalgic',
    quirk: 'Still chasing the miracle spirit that once defied five-thousand-to-one odds.',
  },
  {
    clubId: 'ipswich',
    name: 'Gerald Copping',
    title: 'Chairman',
    personality: 'frugal',
    quirk: 'Proud of doing more with less and expects smart spending above all.',
  },
  {
    clubId: 'southampton',
    name: 'Dragan Šolak',
    title: 'Owner',
    personality: 'patient',
    quirk: 'Values the academy pipeline and sustainable growth over flash signings.',
  },
];

export function getChairman(clubId: string): Chairman | undefined {
  return CHAIRMEN.find((c) => c.clubId === clubId);
}
