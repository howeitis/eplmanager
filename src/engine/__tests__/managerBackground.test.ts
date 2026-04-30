import { describe, it, expect } from 'vitest';
import { getBackgroundEffects } from '../managerBackground';
import { SeededRNG } from '../../utils/rng';

const dummyRng = () => new SeededRNG('mb-test');

describe('getBackgroundEffects', () => {
  it('analyst gets a 10% budget multiplier', () => {
    expect(getBackgroundEffects('analyst').budgetMultiplier).toBeCloseTo(1.10);
  });

  it('lower-league pro gets a 10% sale-fee multiplier', () => {
    expect(getBackgroundEffects('lower-league-pro').saleFeeMultiplier).toBeCloseTo(1.10);
  });

  it('academy coach gets +1 wonderkid + +1 annual youth', () => {
    const eff = getBackgroundEffects('academy-coach');
    expect(eff.extraStartWonderkids).toBe(1);
    expect(eff.extraAnnualYouth).toBe(1);
  });

  it('journalist gets board leniency + flavor flag', () => {
    const eff = getBackgroundEffects('journalist');
    expect(eff.boardLeniency).toBe(1);
    expect(eff.interviewFlavor).toBe('journalist');
  });

  it('former-pro returns 5% only against rivals or same-tier opponents', () => {
    const eff = getBackgroundEffects('former-pro');
    const rng = dummyRng();
    expect(eff.matchTSSPct({ isRival: true, sameTier: false, rng })).toBeCloseTo(0.05);
    expect(eff.matchTSSPct({ isRival: false, sameTier: true, rng })).toBeCloseTo(0.05);
    expect(eff.matchTSSPct({ isRival: false, sameTier: false, rng })).toBe(0);
  });

  it('never-played returns a value within [-0.02, 0.05) and varies', () => {
    const eff = getBackgroundEffects('never-played');
    const rng = new SeededRNG('np-test');
    const samples = Array.from({ length: 50 }, () =>
      eff.matchTSSPct({ isRival: false, sameTier: false, rng }),
    );
    for (const v of samples) {
      expect(v).toBeGreaterThanOrEqual(-0.02);
      expect(v).toBeLessThan(0.05);
    }
    const unique = new Set(samples);
    expect(unique.size).toBeGreaterThan(5);
  });

  it('undefined background is fully neutral', () => {
    const eff = getBackgroundEffects(undefined);
    expect(eff.saleFeeMultiplier).toBe(1);
    expect(eff.budgetMultiplier).toBe(1);
    expect(eff.boardLeniency).toBe(0);
    expect(eff.extraStartWonderkids).toBe(0);
    expect(eff.extraAnnualYouth).toBe(0);
    expect(eff.interviewFlavor).toBeNull();
    expect(eff.matchTSSPct({ isRival: true, sameTier: true, rng: dummyRng() })).toBe(0);
  });
});
