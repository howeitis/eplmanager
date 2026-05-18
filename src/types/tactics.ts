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
 * Phase C: a manager's declared tactical identity. Picked at career creation,
 * permanent for the career (a "rebrand" event is a Phase D concern).
 *
 * Used to bias instruction-card drops at pack-mint time (60/40 in-school vs
 * out-of-school) — it has no engine-side effect on TSS.
 */
export type ManagerSchool =
  | 'gegenpress'
  | 'tiki-taka'
  | 'catenaccio'
  | 'direct'
  | 'total-football';

export interface ManagerSchoolMeta {
  /** Display name shown in the picker and on tactic-card chips. */
  name: string;
  /** Single-line tagline shown under the name. */
  tagline: string;
  /** Longer flavour copy shown when the school is selected. */
  description: string;
}

export const MANAGER_SCHOOLS: Record<ManagerSchool, ManagerSchoolMeta> = {
  gegenpress: {
    name: 'Gegenpress',
    tagline: 'Win it high, score before they breathe.',
    description: 'Aggressive front-foot football. Cards bias toward pressing, transitions and underdog edges.',
  },
  'tiki-taka': {
    name: 'Tiki-Taka',
    tagline: 'Control the ball. Control the game.',
    description: 'Possession is sovereignty. Cards bias toward patience, midfield control, home-soil dominance.',
  },
  catenaccio: {
    name: 'Catenaccio',
    tagline: 'Two banks. One scoreline. Three points.',
    description: 'Defensive identity built on shape and discipline. Cards bias toward low-block, time-wasting, holding lines.',
  },
  direct: {
    name: 'Direct',
    tagline: 'First contact forward. No nonsense.',
    description: 'Vertical football — long balls, fast transitions, second-ball dominance.',
  },
  'total-football': {
    name: 'Total Football',
    tagline: 'Every player, every role.',
    description: 'Versatility across the XI. Cards bias toward big-stage temperament and shape-fluid identities.',
  },
};

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
  /**
   * Phase C: which manager schools count this card as "in-school" for the
   * 60/40 weighted mint. Multi-tag — a card can belong to multiple schools.
   * Omit (or empty) for neutral cards that are always eligible regardless
   * of the manager's school.
   */
  schools?: ManagerSchool[];
  /**
   * Phase D: groups tier variants of the same card together. e.g. the
   * bronze/silver/gold/elite "Press From The Front" cards all share
   * `family: 'press-from-front'`. Used by the collection UI to render
   * "best tier owned" pips. The engine ignores `family` — each card's
   * own `effect` is what fires.
   */
  family?: string;
  /**
   * Phase D legendary cards: a hand-authored card minted only when this
   * condition is met during season-end. Receives the current season's
   * achievement context. Must be a pure function (no RNG, no state, no
   * DOM) — same contract as InstructionEffect.condition. When omitted,
   * the card is part of the regular reputation-gated pool.
   */
  unlockCondition?: (ctx: LegendaryUnlockContext) => boolean;
  /**
   * Phase D: free-text description of the unlock condition shown on the
   * card back when the legendary is revealed. Required when
   * `unlockCondition` is present.
   */
  unlockLabel?: string;
  /**
   * Phase D: true for hand-authored legendaries. Cosmetic flag — the
   * picker can apply a special foil treatment, and the engine excludes
   * them from the reputation-skewed regular pool (they only mint via
   * their unlock condition).
   */
  legendary?: boolean;
}

/**
 * Phase D context for evaluating a legendary card's unlock condition at
 * season-end. Pure data — same purity contract as InstructionContext.
 */
export interface LegendaryUnlockContext {
  /** Did the player's club finish 1st in the league this season? */
  wonLeague: boolean;
  /** Did the player's club win the FA Cup this season? */
  wonCup: boolean;
  /** Did the player's club beat a tier-1 club in the FA Cup this season? */
  beatTier1InCup: boolean;
  /** Did manager reputation cross 75 this season (50 → ≥75)? */
  crossed75: boolean;
  /** Did manager reputation cross 90 this season? */
  crossed90: boolean;
  /** True when the player survived relegation against an explicit board expectation to go down. */
  survivedRelegation: boolean;
  /** Manager's tactical school. */
  school?: ManagerSchool;
  /** Reputation as it stands at this season's end. */
  reputation: number;
}

export interface TacticLoadout {
  shape: string;
  tempo: string;
  instruction?: string;
}
