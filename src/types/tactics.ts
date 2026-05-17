import type { Formation, Mentality } from '@/engine/matchSim';

/**
 * Tactic Deck — Phase A.
 *
 * The pre-match formation/mentality picker is being reframed as a tactical
 * "loadout" of cards. Phase A is a mechanical re-skin: 6 Shape cards mirror
 * the existing formations, 3 Tempo cards mirror the mentalities, and the
 * Instruction slot is a locked placeholder for Phase B's deeper pool.
 *
 * Engine balance is unchanged — every Shape card's atk/def deltas come from
 * BALANCE.formationModifiers; every Tempo card's come from BALANCE.mentalityModifiers.
 * If you change one, the other follows.
 */

export type TacticSlot = 'shape' | 'tempo' | 'instruction';
export type TacticTier = 'bronze' | 'silver' | 'gold' | 'elite';

export interface TacticCard {
  /** Stable id, used as the slot's selected value and (later) save key. */
  id: string;
  slot: TacticSlot;
  name: string;
  /** Short flavour line shown on the card face. */
  description: string;
  tier: TacticTier;
  /** TSS modifier deltas — additive, identical contract to formation/mentality. */
  atkMod: number;
  defMod: number;
  /**
   * Phase A bridge fields. Shape cards carry the legacy Formation they
   * represent; Tempo cards carry the legacy Mentality. The engine still
   * receives `formation` and `mentality` enums today, so the picker maps
   * card.id → these values before calling onFormationChange / onMentalityChange.
   * Phase B can drop these in favour of card-native effect fields.
   */
  formation?: Formation;
  mentality?: Mentality;
}

export interface TacticLoadout {
  shape: string;
  tempo: string;
  instruction?: string;
}
