import { describe, it, expect } from 'vitest';
import { LEGENDARY_CARDS, findUnlockedLegendaries, getLegendaryCard } from '../legendaryCards';
import { INSTRUCTION_TSS_CAP } from '../instructionCards';
import type { LegendaryUnlockContext } from '@/types/tactics';

const baseCtx: LegendaryUnlockContext = {
  wonLeague: false,
  wonCup: false,
  beatTier1InCup: false,
  crossed75: false,
  crossed90: false,
  survivedRelegation: false,
  reputation: 60,
};

describe('legendary cards', () => {
  it('has at least 6 hand-authored cards', () => {
    expect(LEGENDARY_CARDS.length).toBeGreaterThanOrEqual(6);
  });

  it('every card has legendary: true', () => {
    for (const c of LEGENDARY_CARDS) {
      expect(c.legendary).toBe(true);
    }
  });

  it('every card has an unlockCondition and unlockLabel', () => {
    for (const c of LEGENDARY_CARDS) {
      expect(c.unlockCondition).toBeDefined();
      expect(typeof c.unlockLabel).toBe('string');
      expect(c.unlockLabel!.length).toBeGreaterThan(0);
    }
  });

  it('all ids are unique', () => {
    const ids = new Set(LEGENDARY_CARDS.map((c) => c.id));
    expect(ids.size).toBe(LEGENDARY_CARDS.length);
  });

  it('every legendary respects INSTRUCTION_TSS_CAP on its raw declared effect', () => {
    for (const c of LEGENDARY_CARDS) {
      const e = c.effect!;
      const tss = (e.atkMod + e.defMod) / 2;
      expect(Math.abs(tss)).toBeLessThanOrEqual(INSTRUCTION_TSS_CAP);
    }
  });

  it('every legendary is tagged with at least one school', () => {
    for (const c of LEGENDARY_CARDS) {
      expect(c.schools?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('getLegendaryCard finds cards by id', () => {
    const card = LEGENDARY_CARDS[0];
    expect(getLegendaryCard(card.id)?.id).toBe(card.id);
    expect(getLegendaryCard('not-a-real-id')).toBeUndefined();
  });
});

describe('findUnlockedLegendaries', () => {
  it('returns nothing for a quiet season', () => {
    expect(findUnlockedLegendaries(baseCtx, [])).toEqual([]);
  });

  it('returns the title legendary when wonLeague is true', () => {
    const unlocked = findUnlockedLegendaries({ ...baseCtx, wonLeague: true }, []);
    expect(unlocked.some((c) => c.id === 'instr-legend-invincibles-wing-play')).toBe(true);
  });

  it('returns the cup legendary when wonCup is true', () => {
    const unlocked = findUnlockedLegendaries({ ...baseCtx, wonCup: true }, []);
    expect(unlocked.some((c) => c.id === 'instr-legend-cup-final-march')).toBe(true);
  });

  it('returns the rep-75 legendary when crossed75 is true', () => {
    const unlocked = findUnlockedLegendaries({ ...baseCtx, crossed75: true }, []);
    expect(unlocked.some((c) => c.id === 'instr-legend-sacchi-pressing-trap')).toBe(true);
  });

  it('returns the rep-90 legendary when crossed90 is true', () => {
    const unlocked = findUnlockedLegendaries({ ...baseCtx, crossed90: true }, []);
    expect(unlocked.some((c) => c.id === 'instr-legend-total-football-74')).toBe(true);
  });

  it('returns the FA-cup-upset legendary when beatTier1InCup is true', () => {
    const unlocked = findUnlockedLegendaries({ ...baseCtx, beatTier1InCup: true }, []);
    expect(unlocked.some((c) => c.id === 'instr-legend-cloughie-two-banks')).toBe(true);
  });

  it('returns the survival legendary when survivedRelegation is true', () => {
    const unlocked = findUnlockedLegendaries({ ...baseCtx, survivedRelegation: true }, []);
    expect(unlocked.some((c) => c.id === 'instr-legend-survival-instinct')).toBe(true);
  });

  it('does not re-return a legendary the manager already owns', () => {
    const ctx = { ...baseCtx, wonLeague: true };
    const unlocked = findUnlockedLegendaries(ctx, ['instr-legend-invincibles-wing-play']);
    expect(unlocked.every((c) => c.id !== 'instr-legend-invincibles-wing-play')).toBe(true);
  });
});
