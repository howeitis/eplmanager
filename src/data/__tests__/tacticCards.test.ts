import { describe, it, expect } from 'vitest';
import {
  SHAPE_CARDS,
  TEMPO_CARDS,
  ALL_TACTIC_CARDS,
  getShapeCardForFormation,
  getTempoCardForMentality,
} from '../tacticCards';
import { BALANCE } from '../balance';
import type { Formation, Mentality } from '@/engine/matchSim';

/**
 * The Phase A tactic deck is a re-skin: every card's modifier must match
 * BALANCE exactly. If anyone bumps the engine's formation/mentality numbers
 * without updating the card pool (or vice-versa), this test catches it.
 */
describe('tactic cards mirror balance config', () => {
  it('has one shape card per formation in BALANCE', () => {
    const formations = Object.keys(BALANCE.formationModifiers) as Formation[];
    expect(SHAPE_CARDS).toHaveLength(formations.length);
    for (const f of formations) {
      expect(SHAPE_CARDS.find((c) => c.formation === f)).toBeDefined();
    }
  });

  it('shape card modifiers match BALANCE.formationModifiers', () => {
    for (const card of SHAPE_CARDS) {
      expect(card.formation).toBeDefined();
      const bal = BALANCE.formationModifiers[card.formation!];
      expect(card.atkMod).toBe(bal.atk);
      expect(card.defMod).toBe(bal.def);
    }
  });

  it('has one tempo card per mentality in BALANCE', () => {
    const mentalities = Object.keys(BALANCE.mentalityModifiers) as Mentality[];
    expect(TEMPO_CARDS).toHaveLength(mentalities.length);
    for (const m of mentalities) {
      expect(TEMPO_CARDS.find((c) => c.mentality === m)).toBeDefined();
    }
  });

  it('tempo card modifiers match BALANCE.mentalityModifiers', () => {
    for (const card of TEMPO_CARDS) {
      expect(card.mentality).toBeDefined();
      const bal = BALANCE.mentalityModifiers[card.mentality!];
      expect(card.atkMod).toBe(bal.atk);
      expect(card.defMod).toBe(bal.def);
    }
  });

  it('all cards have unique ids', () => {
    const ids = new Set(ALL_TACTIC_CARDS.map((c) => c.id));
    expect(ids.size).toBe(ALL_TACTIC_CARDS.length);
  });

  it('all Phase A Shape/Tempo cards are bronze tier (Phase D adds tier variants on Instruction only)', () => {
    for (const card of ALL_TACTIC_CARDS) {
      if (card.slot === 'instruction') continue;
      expect(card.tier).toBe('bronze');
    }
  });

  it('every card has non-empty name and description', () => {
    for (const card of ALL_TACTIC_CARDS) {
      expect(card.name).toBeTruthy();
      expect(card.description).toBeTruthy();
    }
  });
});

describe('tactic card lookup helpers', () => {
  it('getShapeCardForFormation returns the right card', () => {
    const formations = Object.keys(BALANCE.formationModifiers) as Formation[];
    for (const f of formations) {
      const card = getShapeCardForFormation(f);
      expect(card.formation).toBe(f);
    }
  });

  it('getTempoCardForMentality returns the right card', () => {
    const mentalities = Object.keys(BALANCE.mentalityModifiers) as Mentality[];
    for (const m of mentalities) {
      const card = getTempoCardForMentality(m);
      expect(card.mentality).toBe(m);
    }
  });
});
