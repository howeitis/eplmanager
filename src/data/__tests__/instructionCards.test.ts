import { describe, it, expect } from 'vitest';
import {
  INSTRUCTION_CARDS,
  INSTRUCTION_TSS_CAP,
  STARTER_INSTRUCTION_CARD_IDS,
  getInstructionCard,
  pickNextInstructionToMint,
} from '../instructionCards';
import { ALL_TACTIC_CARDS } from '../tacticCards';

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
    const owned: string[] = [];
    const picked = pickNextInstructionToMint(owned, () => INSTRUCTION_CARDS.length - 1);
    expect(picked!.id).toBe(INSTRUCTION_CARDS[INSTRUCTION_CARDS.length - 1].id);
  });
});
