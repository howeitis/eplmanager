import { describe, it, expect } from 'vitest';
import {
  INSTRUCTION_CARDS,
  INSTRUCTION_TSS_CAP,
  STARTER_INSTRUCTION_CARD_IDS,
  getInstructionCard,
  pickNextInstructionToMint,
  computeInstructionDrops,
  computeInstructionDropCount,
  allowedTiersForReputation,
  MAX_SEASON_END_DROPS,
} from '../instructionCards';
import { LEGENDARY_CARDS } from '../legendaryCards';
import { ALL_TACTIC_CARDS } from '../tacticCards';
import { SeededRNG } from '../../utils/rng';
import type { ManagerSchool } from '../../types/tactics';

/**
 * Data + cap tests for the Phase B instruction pool. These are guardrails:
 * the engine enforces the TSS cap at runtime, but a card whose RAW numbers
 * exceed the cap is almost certainly a balance bug we want flagged early.
 */
describe('instruction cards', () => {
  it('every card has the instruction slot', () => {
    for (const card of INSTRUCTION_CARDS) {
      expect(card.slot).toBe('instruction');
    }
  });

  it('every card has an effect (the whole point of the slot)', () => {
    for (const card of INSTRUCTION_CARDS) {
      expect(card.effect).toBeDefined();
    }
  });

  it('every conditional effect declares a conditionLabel', () => {
    for (const card of INSTRUCTION_CARDS) {
      if (card.effect?.condition) {
        expect(card.effect.conditionLabel).toBeTruthy();
      }
    }
  });

  it('declared raw (atk+def)/2 stays within the TSS cap', () => {
    for (const card of INSTRUCTION_CARDS) {
      const e = card.effect!;
      const tssContribution = (e.atkMod + e.defMod) / 2;
      expect(Math.abs(tssContribution)).toBeLessThanOrEqual(INSTRUCTION_TSS_CAP);
    }
  });

  it('all ids are unique within the instruction pool', () => {
    const ids = new Set(INSTRUCTION_CARDS.map((c) => c.id));
    expect(ids.size).toBe(INSTRUCTION_CARDS.length);
  });

  it('all ids are unique across every tactic pool (no collisions)', () => {
    const ids = new Set(ALL_TACTIC_CARDS.map((c) => c.id));
    expect(ids.size).toBe(ALL_TACTIC_CARDS.length);
  });

  it('every instruction id is prefixed `instr-` for namespace clarity', () => {
    for (const card of INSTRUCTION_CARDS) {
      expect(card.id.startsWith('instr-')).toBe(true);
    }
  });

  it('starter ids all reference real instruction cards', () => {
    for (const id of STARTER_INSTRUCTION_CARD_IDS) {
      expect(getInstructionCard(id)).toBeDefined();
    }
  });
});

describe('pickNextInstructionToMint', () => {
  it('returns null when every instruction is owned', () => {
    const everyId = INSTRUCTION_CARDS.map((c) => c.id);
    expect(pickNextInstructionToMint(everyId, () => 0)).toBeNull();
  });

  it('returns a card the manager does not own', () => {
    const owned = STARTER_INSTRUCTION_CARD_IDS;
    const picked = pickNextInstructionToMint(owned, () => 0);
    expect(picked).not.toBeNull();
    expect(owned).not.toContain(picked!.id);
  });

  it('respects the supplied pickIndex (used for seeded RNG)', () => {
    // Phase D: legendaries are filtered out of the regular pool, so the
    // remaining length is INSTRUCTION_CARDS minus legendary cards.
    const pool = INSTRUCTION_CARDS.filter((c) => !c.legendary);
    const picked = pickNextInstructionToMint([], () => pool.length - 1);
    expect(picked!.id).toBe(pool[pool.length - 1].id);
  });

  describe('school-biased weighting', () => {
    it('returns null when every instruction is owned, even with school set', () => {
      const everyId = INSTRUCTION_CARDS.map((c) => c.id);
      const rng = new SeededRNG('school-test');
      const picked = pickNextInstructionToMint(everyId, () => 0, {
        school: 'gegenpress',
        rng,
      });
      expect(picked).toBeNull();
    });

    it('60/40 weighting puts in-school share between 0.55 and 0.65 over 10k seeded picks', () => {
      const school: ManagerSchool = 'gegenpress';
      let inSchoolHits = 0;
      const trials = 10_000;
      for (let i = 0; i < trials; i++) {
        const rng = new SeededRNG(`bias-trial-${i}`);
        const picked = pickNextInstructionToMint([], (max) => rng.randomInt(0, max - 1), {
          school,
          rng,
        });
        if (!picked) continue;
        const tagged = picked.schools && picked.schools.length > 0;
        const matches = !tagged || picked.schools!.includes(school);
        if (matches) inSchoolHits++;
      }
      const ratio = inSchoolHits / trials;
      expect(ratio).toBeGreaterThanOrEqual(0.55);
      expect(ratio).toBeLessThanOrEqual(0.65);
    });

    it('falls back to out-of-school cards when in-school bucket is exhausted', () => {
      const school: ManagerSchool = 'gegenpress';
      // Own every card tagged with gegenpress (including neutrals would still
      // be in-school, but no instruction cards are currently neutral so it
      // doesn't matter for this test).
      const ownedIds = INSTRUCTION_CARDS.filter(
        (c) => c.schools?.includes(school) || !c.schools || c.schools.length === 0,
      ).map((c) => c.id);
      const rng = new SeededRNG('fallback');
      const picked = pickNextInstructionToMint(
        ownedIds,
        (max) => rng.randomInt(0, max - 1),
        { school, rng },
      );
      expect(picked).not.toBeNull();
      expect(picked!.schools?.includes(school)).not.toBe(true);
    });
  });
});

describe('computeInstructionDropCount', () => {
  it('returns 1 with no trophies and no rep crossing', () => {
    expect(
      computeInstructionDropCount({ wonLeague: false, wonCup: false, repNow: 40, repPrev: 40 }),
    ).toBe(1);
  });

  it('adds 1 for a league title', () => {
    expect(
      computeInstructionDropCount({ wonLeague: true, wonCup: false, repNow: 40, repPrev: 40 }),
    ).toBe(2);
  });

  it('adds 1 for an FA Cup win', () => {
    expect(
      computeInstructionDropCount({ wonLeague: false, wonCup: true, repNow: 40, repPrev: 40 }),
    ).toBe(2);
  });

  it('only counts trophies once even with both', () => {
    expect(
      computeInstructionDropCount({ wonLeague: true, wonCup: true, repNow: 40, repPrev: 40 }),
    ).toBe(2);
  });

  it('adds 1 for crossing reputation 50', () => {
    expect(
      computeInstructionDropCount({ wonLeague: false, wonCup: false, repNow: 51, repPrev: 49 }),
    ).toBe(2);
  });

  it('adds 1 for crossing reputation 75', () => {
    expect(
      computeInstructionDropCount({ wonLeague: false, wonCup: false, repNow: 76, repPrev: 74 }),
    ).toBe(2);
  });

  it('does not award rep bonus when previously above threshold', () => {
    expect(
      computeInstructionDropCount({ wonLeague: false, wonCup: false, repNow: 80, repPrev: 76 }),
    ).toBe(1);
  });

  it('caps total drops at MAX_SEASON_END_DROPS (3)', () => {
    expect(
      computeInstructionDropCount({ wonLeague: true, wonCup: true, repNow: 76, repPrev: 49 }),
    ).toBe(MAX_SEASON_END_DROPS);
  });
});

describe('computeInstructionDrops', () => {
  it('returns at most MAX_SEASON_END_DROPS unique cards', () => {
    const drops = computeInstructionDrops({
      wonLeague: true,
      wonCup: true,
      repNow: 80,
      repPrev: 49,
      ownedIds: [],
      seed: 'season-drops',
    });
    expect(drops.length).toBeLessThanOrEqual(MAX_SEASON_END_DROPS);
    const ids = new Set(drops.map((d) => d.id));
    expect(ids.size).toBe(drops.length); // no duplicates
  });

  it('is deterministic across runs for the same seed', () => {
    const args = {
      wonLeague: false,
      wonCup: false,
      repNow: 60,
      repPrev: 60,
      ownedIds: [] as string[],
      seed: 'determinism',
    };
    const a = computeInstructionDrops(args);
    const b = computeInstructionDrops(args);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  it('returns an empty array when every card is already owned', () => {
    const everyId = INSTRUCTION_CARDS.map((c) => c.id);
    const drops = computeInstructionDrops({
      wonLeague: true,
      wonCup: true,
      repNow: 80,
      repPrev: 49,
      ownedIds: everyId,
      seed: 'all-owned',
    });
    expect(drops).toEqual([]);
  });

  it('grants exactly 1 card on a quiet season (no trophies, no milestone)', () => {
    const drops = computeInstructionDrops({
      wonLeague: false,
      wonCup: false,
      repNow: 50,
      repPrev: 50,
      ownedIds: [],
      seed: 'quiet',
    });
    expect(drops.length).toBe(1);
  });
});

describe('Phase D reputation-gated tier skew', () => {
  it('allowedTiersForReputation matches the spec table', () => {
    expect([...allowedTiersForReputation(0)]).toEqual(['bronze']);
    expect([...allowedTiersForReputation(49)]).toEqual(['bronze']);
    expect([...allowedTiersForReputation(50)].sort()).toEqual(['bronze', 'silver']);
    expect([...allowedTiersForReputation(74)].sort()).toEqual(['bronze', 'silver']);
    expect([...allowedTiersForReputation(75)].sort()).toEqual(['bronze', 'gold', 'silver']);
    expect([...allowedTiersForReputation(89)].sort()).toEqual(['bronze', 'gold', 'silver']);
    expect([...allowedTiersForReputation(90)].sort()).toEqual(['bronze', 'elite', 'gold', 'silver']);
  });

  it('low-rep manager never mints silver/gold/elite', () => {
    for (let i = 0; i < 200; i++) {
      const rng = new SeededRNG(`low-rep-${i}`);
      const card = pickNextInstructionToMint([], (max) => rng.randomInt(0, max - 1), {
        rng,
        reputation: 30,
      });
      if (!card) continue;
      expect(card.tier).toBe('bronze');
    }
  });

  it('mid-rep manager never mints gold/elite', () => {
    for (let i = 0; i < 400; i++) {
      const rng = new SeededRNG(`mid-rep-${i}`);
      const card = pickNextInstructionToMint([], (max) => rng.randomInt(0, max - 1), {
        rng,
        reputation: 60,
      });
      if (!card) continue;
      expect(['bronze', 'silver']).toContain(card.tier);
    }
  });

  it('high-rep manager can mint silver and gold', () => {
    let sawBronze = false;
    let sawSilver = false;
    let sawGold = false;
    for (let i = 0; i < 600; i++) {
      const rng = new SeededRNG(`high-rep-${i}`);
      const card = pickNextInstructionToMint([], (max) => rng.randomInt(0, max - 1), {
        rng,
        reputation: 80,
      });
      if (!card) continue;
      if (card.tier === 'bronze') sawBronze = true;
      if (card.tier === 'silver') sawSilver = true;
      if (card.tier === 'gold') sawGold = true;
      expect(card.tier).not.toBe('elite');
    }
    expect(sawBronze).toBe(true);
    expect(sawSilver).toBe(true);
    expect(sawGold).toBe(true);
  });

  it('legendaries are never minted by the regular pool, regardless of rep', () => {
    const legendaryIds = new Set(LEGENDARY_CARDS.map((c) => c.id));
    for (let i = 0; i < 200; i++) {
      const rng = new SeededRNG(`no-legend-${i}`);
      const card = pickNextInstructionToMint([], (max) => rng.randomInt(0, max - 1), {
        rng,
        reputation: 95,
      });
      if (!card) continue;
      expect(legendaryIds.has(card.id)).toBe(false);
    }
  });
});

describe('Phase D legendary minting in computeInstructionDrops', () => {
  it('mints a legendary when its unlock condition fires for the first time', () => {
    const drops = computeInstructionDrops({
      wonLeague: true,
      wonCup: false,
      repNow: 60,
      repPrev: 60,
      ownedIds: [],
      seed: 'legend-title',
    });
    // Drop count for wonLeague=true is 2; the title legendary should be one of them.
    expect(drops.some((c) => c.id === 'instr-legend-invincibles-wing-play')).toBe(true);
  });

  it('does not re-mint a legendary the manager already owns', () => {
    const drops = computeInstructionDrops({
      wonLeague: true,
      wonCup: false,
      repNow: 60,
      repPrev: 60,
      ownedIds: ['instr-legend-invincibles-wing-play'],
      seed: 'legend-owned',
    });
    expect(drops.every((c) => c.id !== 'instr-legend-invincibles-wing-play')).toBe(true);
    expect(drops.length).toBe(2); // 1 base + 1 trophy
  });

  it('legendary mints respect the cap-3 drop budget', () => {
    const drops = computeInstructionDrops({
      wonLeague: true,
      wonCup: true,
      repNow: 76,
      repPrev: 49,
      ownedIds: [],
      seed: 'legend-cap',
      beatTier1InCup: true,
    });
    expect(drops.length).toBeLessThanOrEqual(MAX_SEASON_END_DROPS);
  });

  it('is deterministic for the same seed + context', () => {
    const args = {
      wonLeague: true,
      wonCup: false,
      repNow: 60,
      repPrev: 60,
      ownedIds: [] as string[],
      seed: 'deterministic-legend',
    };
    const a = computeInstructionDrops(args);
    const b = computeInstructionDrops(args);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });
});
