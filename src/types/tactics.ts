import type { Formation, Mentality } from '@/engine/matchSim';

/**
 * Tactic Deck.
 *
 * Phase A: a mechanical re-skin. 6 Shape cards mirror BALANCE.formationModifiers,
 *   3 Tempo cards mirror BALANCE.mentalityModifiers, Instruction slot locked.
 * Phase B: Instruction slot unlocked. Cards may carry an InstructionEffect
 *   with optional condition that fires only in certain match states.
 *
 * Engine balance is gated: each card's net TSS contribution is clamped to
 * ±2 in calculateTSS, regardless of what the card declares. This keeps the
 * total tactical TSS swing inside the ±6 envelope from the product plan.
 */

export type TacticSlot = 'shape' | 'tempo' | 'instruction';
export type TacticTier = 'bronze' | 'silver' | 'gold' | 'elite';

/**
 * Context passed to a conditional instruction's `condition` function.
 * Only includes fields the engine can supply at TSS time — keep this
 * narrow so condition functions stay testable in isolation.
 */
export interface InstructionContext {
  /** True if the player's club is playing at home. */
  isHome: boolean;
  /** True if this is a derby (mutual rivalry). */
  isDerby: boolean;
  /** True if this is an FA Cup fixture. */
  isCup: boolean;
  /** Opponent's base XI rating (post-baseline, pre-modifier). */
  opponentBaseRating: number;
  /** Player's club's own base XI rating. */
  selfBaseRating: number;
  /** Opponent club's tier (1 = top, 5 = bottom). */
  opponentTier: number;
}

/**
 * An instruction's effect on a match. Flat fields (atkMod / defMod / formMod)
 * apply when the card is equipped; `condition`, if present, must return true
 * for the effect to apply at all.
 */
export interface InstructionEffect {
  /** Added to ATK before the (atk+def)/2 TSS contribution is computed. */
  atkMod: number;
  /** Added to DEF before the (atk+def)/2 TSS contribution is computed. */
  defMod: number;
  /** Added to the squad-wide form bonus. */
  formMod: number;
  /**
   * If present, the effect only applies when this returns true. Conditions
   * must be pure functions of InstructionContext — no state, no RNG, no
   * mutation. The engine evaluates them once per match.
   */
  condition?: (ctx: InstructionContext) => boolean;
  /**
   * Human-readable label for the condition, shown in the UI ("Underdog
   * matches only" / "Derbies only" / etc.). Required when `condition` is
   * present so the picker can communicate when the card will fire.
   */
  conditionLabel?: string;
}

export interface TacticCard {
  /** Stable id, used as the slot's selected value and save key. */
  id: string;
  slot: TacticSlot;
  name: string;
  /** Short flavour line shown on the card face. */
  description: string;
  tier: TacticTier;
  /**
   * Shape and Tempo cards: TSS modifier deltas — additive, identical
   * contract to the legacy formation/mentality enums.
   * Instruction cards: 0 here; the real effect lives on `effect` so it
   * can carry a conditional.
   */
  atkMod: number;
  defMod: number;
  /**
   * Instruction-only. When present, this is what the engine evaluates.
   */
  effect?: InstructionEffect;
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
