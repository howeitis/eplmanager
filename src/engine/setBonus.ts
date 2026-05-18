import type { Formation, Mentality } from './matchSim';
import type { ManagerSchool, TacticCard } from '@/types/tactics';
import { getShapeCardForFormation, getTempoCardForMentality } from '@/data/tacticCards';
import { getInstructionCard } from '@/data/instructionCards';

/**
 * Phase D set bonus.
 *
 * The user's three tactic slots (Shape, Tempo, Instruction) each carry an
 * optional `schools` tag. When all three share at least one school, a
 * synthetic +SET_BONUS_TSS modifier is added to the user's TSS. This is
 * cosmetic-feeling but mechanically real: a +1 swing on a marginal match.
 *
 * The bonus is one-sided — AI sides never get it because they don't equip
 * Instruction cards. That keeps `fullBalanceCheck` unaffected.
 *
 * Cap: a single shared school can only contribute one bonus per match,
 * regardless of how many schools overlap.
 */

export const SET_BONUS_TSS = 1;

export interface SetBonusResult {
  /** TSS delta to add when an active set is detected (0 or SET_BONUS_TSS). */
  tssDelta: number;
  /** First school that all three slots share, or null when no set is active. */
  school: ManagerSchool | null;
}

/**
 * Detect a school set across three explicit cards. Returns +SET_BONUS_TSS
 * and the matching school when all three slots' `schools` tags share at
 * least one school; otherwise returns 0 / null.
 *
 * An Instruction slot is required for a set: the player can leave it
 * empty, in which case there's no set.
 */
export function detectSchoolSetBonusFromCards(
  shape: TacticCard | undefined | null,
  tempo: TacticCard | undefined | null,
  instruction: TacticCard | undefined | null,
): SetBonusResult {
  if (!shape || !tempo || !instruction) return { tssDelta: 0, school: null };
  const shapeSchools = shape.schools ?? [];
  const tempoSchools = tempo.schools ?? [];
  const instrSchools = instruction.schools ?? [];
  if (shapeSchools.length === 0 || tempoSchools.length === 0 || instrSchools.length === 0) {
    return { tssDelta: 0, school: null };
  }
  // Find a school present in all three tag lists. Order matches shape's
  // declared list so the picker can render a stable label.
  for (const s of shapeSchools) {
    if (tempoSchools.includes(s) && instrSchools.includes(s)) {
      return { tssDelta: SET_BONUS_TSS, school: s };
    }
  }
  return { tssDelta: 0, school: null };
}

/**
 * Convenience wrapper used by the match sim. Looks up the shape and tempo
 * cards from the player's formation + mentality enums, looks up the
 * instruction card by id (legacy or legendary), and delegates to
 * `detectSchoolSetBonusFromCards`. Returns 0 / null when the instruction
 * slot is empty.
 */
export function detectSchoolSetBonus(
  formation: Formation,
  mentality: Mentality,
  instructionCardId: string | null | undefined,
): SetBonusResult {
  if (!instructionCardId) return { tssDelta: 0, school: null };
  const shape = getShapeCardForFormation(formation);
  const tempo = getTempoCardForMentality(mentality);
  const instruction = getInstructionCard(instructionCardId);
  return detectSchoolSetBonusFromCards(shape, tempo, instruction);
}
