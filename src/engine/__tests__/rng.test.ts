import { describe, it, expect } from 'vitest';
import { createRNG, seasonSeed, matchSeed, transferSeed } from '../../utils/rng';

describe('SeededRNG', () => {
  it('produces identical sequences with the same seed', () => {
    const rng1 = createRNG('test-seed-123');
    const rng2 = createRNG('test-seed-123');

    const seq1 = Array.from({ length: 20 }, () => rng1.random());
    const seq2 = Array.from({ length: 20 }, () => rng2.random());

    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences with different seeds', () => {
    const rng1 = createRNG('seed-a');
    const rng2 = createRNG('seed-b');

    const val1 = rng1.random();
    const val2 = rng2.random();

    expect(val1).not.toEqual(val2);
  });

  it('randomInt returns values in [min, max]', () => {
    const rng = createRNG('int-test');
    for (let i = 0; i < 100; i++) {
      const val = rng.randomInt(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('randomFloat returns values in [min, max)', () => {
    const rng = createRNG('float-test');
    for (let i = 0; i < 100; i++) {
      const val = rng.randomFloat(1.0, 5.0);
      expect(val).toBeGreaterThanOrEqual(1.0);
      expect(val).toBeLessThan(5.0);
    }
  });

  it('poissonRandom returns non-negative integers', () => {
    const rng = createRNG('poisson-test');
    for (let i = 0; i < 100; i++) {
      const val = rng.poissonRandom(2.5);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('poissonRandom mean is approximately lambda over many samples', () => {
    const rng = createRNG('poisson-mean-test');
    const lambda = 3.0;
    const n = 10000;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += rng.poissonRandom(lambda);
    }
    const mean = sum / n;
    expect(mean).toBeGreaterThan(2.5);
    expect(mean).toBeLessThan(3.5);
  });

  it('weightedPick respects weights', () => {
    const rng = createRNG('weighted-test');
    const items = ['rare', 'common'];
    const weights = [1, 99];
    let rareCount = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      if (rng.weightedPick(items, weights) === 'rare') rareCount++;
    }
    // Rare should be ~1% of picks
    expect(rareCount).toBeLessThan(50);
  });

  it('weightedPick is deterministic with same seed', () => {
    const rng1 = createRNG('wp-seed');
    const rng2 = createRNG('wp-seed');
    const items = ['a', 'b', 'c', 'd'];
    const weights = [10, 20, 30, 40];

    const picks1 = Array.from({ length: 50 }, () => rng1.weightedPick(items, weights));
    const picks2 = Array.from({ length: 50 }, () => rng2.weightedPick(items, weights));

    expect(picks1).toEqual(picks2);
  });
});

describe('Seed derivation', () => {
  it('seasonSeed produces consistent results', () => {
    expect(seasonSeed('game123', 1)).toBe('game123-season-1');
    expect(seasonSeed('game123', 2)).toBe('game123-season-2');
  });

  it('matchSeed produces consistent results', () => {
    expect(matchSeed('s1', 'fix-42')).toBe('s1-match-fix-42');
  });

  it('transferSeed produces consistent results', () => {
    expect(transferSeed('s1', 'summer')).toBe('s1-transfer-summer');
  });
});
