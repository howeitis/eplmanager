import type { PlayingBackground } from '@/types/entities';
import type { SeededRNG } from '@/utils/rng';

export interface BackgroundEffects {
  matchTSSPct: (ctx: { isRival: boolean; sameTier: boolean; rng: SeededRNG }) => number;
  saleFeeMultiplier: number;
  budgetMultiplier: number;
  boardLeniency: number;
  extraStartWonderkids: number;
  extraAnnualYouth: number;
  interviewFlavor: 'journalist' | null;
}

const NEUTRAL: BackgroundEffects = {
  matchTSSPct: () => 0,
  saleFeeMultiplier: 1,
  budgetMultiplier: 1,
  boardLeniency: 0,
  extraStartWonderkids: 0,
  extraAnnualYouth: 0,
  interviewFlavor: null,
};

export function getBackgroundEffects(bg: PlayingBackground | undefined): BackgroundEffects {
  switch (bg) {
    case 'former-pro':
      return {
        ...NEUTRAL,
        matchTSSPct: ({ isRival, sameTier }) => (isRival || sameTier ? 0.05 : 0),
      };
    case 'lower-league-pro':
      return { ...NEUTRAL, saleFeeMultiplier: 1.10 };
    case 'academy-coach':
      return { ...NEUTRAL, extraStartWonderkids: 1, extraAnnualYouth: 1 };
    case 'journalist':
      return { ...NEUTRAL, boardLeniency: 1, interviewFlavor: 'journalist' };
    case 'analyst':
      return { ...NEUTRAL, budgetMultiplier: 1.10 };
    case 'never-played':
      return {
        ...NEUTRAL,
        matchTSSPct: ({ rng }) => rng.randomFloat(-0.02, 0.05),
      };
    default:
      return NEUTRAL;
  }
}
