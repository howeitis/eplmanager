/**
 * Position-aware stat labels.
 *
 * Storage shape — `PlayerStats { ATK, DEF, MOV, PWR, MEN, SKL }` — is shared
 * by every player, but those keys are outfield-centric. Goalkeepers have
 * their own six attributes (Diving, Handling, Kicking, Reflexes, Mentality,
 * Position), so when we render stats for a GK we relabel each slot.
 *
 *   Outfield   |  Goalkeeper
 *   ───────────┼─────────────
 *   ATK        |  DIV  (Diving)
 *   DEF        |  HAN  (Handling)
 *   MOV        |  KIC  (Kicking)
 *   PWR        |  REF  (Reflexes)
 *   MEN        |  MEN  (Mentality — unchanged)
 *   SKL        |  POS  (Position)
 */

import type { PlayerStats, Position } from '../types/entities';

export type StatKey = keyof PlayerStats;

export const STAT_KEYS: StatKey[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];

const OUTFIELD_SHORT: Record<StatKey, string> = {
  ATK: 'ATK', DEF: 'DEF', MOV: 'MOV', PWR: 'PWR', MEN: 'MEN', SKL: 'SKL',
};
const OUTFIELD_LONG: Record<StatKey, string> = {
  ATK: 'Attack', DEF: 'Defense', MOV: 'Movement', PWR: 'Power', MEN: 'Mentality', SKL: 'Skill',
};

const GK_SHORT: Record<StatKey, string> = {
  ATK: 'DIV', DEF: 'HAN', MOV: 'KIC', PWR: 'REF', MEN: 'MEN', SKL: 'POS',
};
const GK_LONG: Record<StatKey, string> = {
  ATK: 'Diving', DEF: 'Handling', MOV: 'Kicking', PWR: 'Reflexes', MEN: 'Mentality', SKL: 'Position',
};

/** 3-letter label for a stat slot, branched on whether it's a GK or outfield player. */
export function getStatLabel(position: Position, key: StatKey): string {
  return position === 'GK' ? GK_SHORT[key] : OUTFIELD_SHORT[key];
}

/** Full descriptive name (e.g. "Diving") for a stat slot — for hover titles and prose. */
export function getStatLongName(position: Position, key: StatKey): string {
  return position === 'GK' ? GK_LONG[key] : OUTFIELD_LONG[key];
}
