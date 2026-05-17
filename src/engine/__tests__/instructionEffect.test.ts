import { describe, it, expect } from 'vitest';
import { evaluateInstructionEffect, resolveInstructionEffect } from '../matchSim';
import { INSTRUCTION_CARDS, INSTRUCTION_TSS_CAP, getInstructionCard } from '@/data/instructionCards';
import type { InstructionContext } from '@/types/tactics';

const NEUTRAL_CTX: InstructionContext = {
  isHome: true,
  isDerby: false,
  isCup: false,
  opponentBaseRating: 70,
  selfBaseRating: 70,
  opponentTier: 3,
};

describe('evaluateInstructionEffect', () => {
  it('returns zero when no effect is supplied', () => {
    const result = evaluateInstructionEffect(undefined, NEUTRAL_CTX);
    expect(result.tss).toBe(0);
    expect(result.form).toBe(0);
  });

  it('applies a flat effect every time (no condition)', () => {
    const result = evaluateInstructionEffect(
      { atkMod: 2, defMod: 0, formMod: -1 },
      NEUTRAL_CTX,
    );
    // (2 + 0)/2 = 1, well under cap
    expect(result.tss).toBe(1);
    expect(result.form).toBe(-1);
  });

  it('returns zero when the condition is not met', () => {
    const result = evaluateInstructionEffect(
      { atkMod: 2, defMod: 0, formMod: 1, condition: (c) => c.isDerby, conditionLabel: 'Derby only' },
      NEUTRAL_CTX,
    );
    expect(result.tss).toBe(0);
    expect(result.form).toBe(0);
  });

  it('applies the effect when the condition is met', () => {
    const result = evaluateInstructionEffect(
      { atkMod: 2, defMod: 0, formMod: 1, condition: (c) => c.isDerby, conditionLabel: 'Derby only' },
      { ...NEUTRAL_CTX, isDerby: true },
    );
    expect(result.tss).toBe(1);
    expect(result.form).toBe(1);
  });

  it('caps positive TSS contribution at INSTRUCTION_TSS_CAP', () => {
    // Net (10 + 10)/2 = 10, well over cap.
    const result = evaluateInstructionEffect(
      { atkMod: 10, defMod: 10, formMod: 0 },
      NEUTRAL_CTX,
    );
    expect(result.tss).toBe(INSTRUCTION_TSS_CAP);
  });

  it('caps negative TSS contribution at -INSTRUCTION_TSS_CAP', () => {
    const result = evaluateInstructionEffect(
      { atkMod: -10, defMod: -10, formMod: 0 },
      NEUTRAL_CTX,
    );
    expect(result.tss).toBe(-INSTRUCTION_TSS_CAP);
  });

  it('does not cap form modifier (form has its own engine clamp)', () => {
    const result = evaluateInstructionEffect(
      { atkMod: 0, defMod: 0, formMod: 5 },
      NEUTRAL_CTX,
    );
    expect(result.form).toBe(5);
  });
});

describe('resolveInstructionEffect', () => {
  it('returns undefined for null/undefined/empty input', () => {
    expect(resolveInstructionEffect(null)).toBeUndefined();
    expect(resolveInstructionEffect(undefined)).toBeUndefined();
    expect(resolveInstructionEffect('')).toBeUndefined();
  });

  it('returns undefined for unknown id (defensive)', () => {
    expect(resolveInstructionEffect('nope-not-real')).toBeUndefined();
  });

  it('returns the effect for a real instruction card', () => {
    const card = INSTRUCTION_CARDS[0];
    const eff = resolveInstructionEffect(card.id);
    expect(eff).toBeDefined();
    expect(eff).toBe(card.effect);
  });
});

describe('conditional cards fire in the right contexts', () => {
  const fire = (cardId: string, ctx: InstructionContext): boolean => {
    const card = getInstructionCard(cardId)!;
    const result = evaluateInstructionEffect(card.effect, ctx);
    return result.tss !== 0 || result.form !== 0;
  };

  it('Underdog\'s Bite — fires when opponent rating exceeds self by 4+', () => {
    expect(fire('instr-underdog-bite', { ...NEUTRAL_CTX, selfBaseRating: 65, opponentBaseRating: 70 })).toBe(true);
    expect(fire('instr-underdog-bite', { ...NEUTRAL_CTX, selfBaseRating: 70, opponentBaseRating: 70 })).toBe(false);
    expect(fire('instr-underdog-bite', { ...NEUTRAL_CTX, selfBaseRating: 70, opponentBaseRating: 65 })).toBe(false);
  });

  it('Derby Day — fires only in derbies', () => {
    expect(fire('instr-derby-day', { ...NEUTRAL_CTX, isDerby: true })).toBe(true);
    expect(fire('instr-derby-day', { ...NEUTRAL_CTX, isDerby: false })).toBe(false);
  });

  it('Away Days — fires only away from home', () => {
    expect(fire('instr-away-days', { ...NEUTRAL_CTX, isHome: false })).toBe(true);
    expect(fire('instr-away-days', { ...NEUTRAL_CTX, isHome: true })).toBe(false);
  });

  it('Home Comforts — fires only at home', () => {
    expect(fire('instr-home-comforts', { ...NEUTRAL_CTX, isHome: true })).toBe(true);
    expect(fire('instr-home-comforts', { ...NEUTRAL_CTX, isHome: false })).toBe(false);
  });

  it('Cup Tied — fires only in cup matches', () => {
    expect(fire('instr-cup-tied', { ...NEUTRAL_CTX, isCup: true })).toBe(true);
    expect(fire('instr-cup-tied', { ...NEUTRAL_CTX, isCup: false })).toBe(false);
  });

  it('Big Game — fires vs tier 1 or 2 only', () => {
    expect(fire('instr-big-game', { ...NEUTRAL_CTX, opponentTier: 1 })).toBe(true);
    expect(fire('instr-big-game', { ...NEUTRAL_CTX, opponentTier: 2 })).toBe(true);
    expect(fire('instr-big-game', { ...NEUTRAL_CTX, opponentTier: 3 })).toBe(false);
    expect(fire('instr-big-game', { ...NEUTRAL_CTX, opponentTier: 5 })).toBe(false);
  });

  it('Bully Pulpit — fires vs tier 4 or 5 only', () => {
    expect(fire('instr-bully-pulpit', { ...NEUTRAL_CTX, opponentTier: 4 })).toBe(true);
    expect(fire('instr-bully-pulpit', { ...NEUTRAL_CTX, opponentTier: 5 })).toBe(true);
    expect(fire('instr-bully-pulpit', { ...NEUTRAL_CTX, opponentTier: 3 })).toBe(false);
    expect(fire('instr-bully-pulpit', { ...NEUTRAL_CTX, opponentTier: 1 })).toBe(false);
  });

  it('Park The Bus — fires only when underdog by 4+', () => {
    expect(fire('instr-park-the-bus', { ...NEUTRAL_CTX, selfBaseRating: 65, opponentBaseRating: 70 })).toBe(true);
    expect(fire('instr-park-the-bus', { ...NEUTRAL_CTX, selfBaseRating: 70, opponentBaseRating: 70 })).toBe(false);
  });
});

describe('balance — no single instruction blows the TSS envelope', () => {
  it('every instruction card, when its condition is met, lands inside ±INSTRUCTION_TSS_CAP', () => {
    // Compose a context that satisfies every condition simultaneously,
    // then assert each card's contribution is still within the cap.
    const everythingTrueCtx: InstructionContext = {
      isHome: true,
      isDerby: true,
      isCup: true,
      opponentBaseRating: 80,
      selfBaseRating: 60,
      opponentTier: 1,
    };
    const oppositeCtx: InstructionContext = {
      isHome: false,
      isDerby: false,
      isCup: false,
      opponentBaseRating: 60,
      selfBaseRating: 80,
      opponentTier: 5,
    };
    for (const card of INSTRUCTION_CARDS) {
      for (const ctx of [everythingTrueCtx, oppositeCtx]) {
        const result = evaluateInstructionEffect(card.effect, ctx);
        expect(Math.abs(result.tss)).toBeLessThanOrEqual(INSTRUCTION_TSS_CAP);
      }
    }
  });
});
