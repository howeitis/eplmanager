import type { Position } from '../types/entities';
import type { Formation } from '../engine/matchSim';

/**
 * Each formation slot has a unique name, a primary position (for auto-population
 * and position-compatibility checks), and x/y coordinates for pitch rendering.
 * Coordinates are percentages (0-100) on a vertical pitch (0,0 = bottom-left).
 */
export interface FormationSlotDef {
  slot: string;           // Unique slot name (e.g., 'GK', 'LCB', 'RW')
  position: Position;     // Primary position for this slot
  x: number;              // Pitch X coordinate (0-100, left to right)
  y: number;              // Pitch Y coordinate (0-100, bottom to top)
}

export const FORMATION_SLOTS: Record<Formation, FormationSlotDef[]> = {
  '4-4-2': [
    { slot: 'GK',  position: 'GK', x: 50, y: 5 },
    { slot: 'LB',  position: 'FB', x: 15, y: 25 },
    { slot: 'LCB', position: 'CB', x: 37, y: 22 },
    { slot: 'RCB', position: 'CB', x: 63, y: 22 },
    { slot: 'RB',  position: 'FB', x: 85, y: 25 },
    { slot: 'LM',  position: 'WG', x: 15, y: 50 },
    { slot: 'LCM', position: 'MF', x: 37, y: 47 },
    { slot: 'RCM', position: 'MF', x: 63, y: 47 },
    { slot: 'RM',  position: 'WG', x: 85, y: 50 },
    { slot: 'LST', position: 'ST', x: 37, y: 75 },
    { slot: 'RST', position: 'ST', x: 63, y: 75 },
  ],

  '4-3-3': [
    { slot: 'GK',  position: 'GK', x: 50, y: 5 },
    { slot: 'LB',  position: 'FB', x: 15, y: 25 },
    { slot: 'LCB', position: 'CB', x: 37, y: 22 },
    { slot: 'RCB', position: 'CB', x: 63, y: 22 },
    { slot: 'RB',  position: 'FB', x: 85, y: 25 },
    { slot: 'LCM', position: 'MF', x: 30, y: 47 },
    { slot: 'CM',  position: 'MF', x: 50, y: 44 },
    { slot: 'RCM', position: 'MF', x: 70, y: 47 },
    { slot: 'LW',  position: 'WG', x: 15, y: 72 },
    { slot: 'ST',  position: 'ST', x: 50, y: 78 },
    { slot: 'RW',  position: 'WG', x: 85, y: 72 },
  ],

  '3-5-2': [
    { slot: 'GK',  position: 'GK', x: 50, y: 5 },
    { slot: 'LCB', position: 'CB', x: 30, y: 22 },
    { slot: 'CB',  position: 'CB', x: 50, y: 20 },
    { slot: 'RCB', position: 'CB', x: 70, y: 22 },
    { slot: 'LWB', position: 'FB', x: 10, y: 42 },
    { slot: 'LCM', position: 'MF', x: 30, y: 47 },
    { slot: 'CM',  position: 'MF', x: 50, y: 44 },
    { slot: 'RCM', position: 'MF', x: 70, y: 47 },
    { slot: 'RWB', position: 'FB', x: 90, y: 42 },
    { slot: 'LST', position: 'ST', x: 37, y: 75 },
    { slot: 'RST', position: 'ST', x: 63, y: 75 },
  ],

  '4-2-3-1': [
    { slot: 'GK',  position: 'GK', x: 50, y: 5 },
    { slot: 'LB',  position: 'FB', x: 15, y: 25 },
    { slot: 'LCB', position: 'CB', x: 37, y: 22 },
    { slot: 'RCB', position: 'CB', x: 63, y: 22 },
    { slot: 'RB',  position: 'FB', x: 85, y: 25 },
    { slot: 'LDM', position: 'MF', x: 37, y: 40 },
    { slot: 'RDM', position: 'MF', x: 63, y: 40 },
    { slot: 'LW',  position: 'WG', x: 20, y: 60 },
    { slot: 'CAM', position: 'MF', x: 50, y: 58 },
    { slot: 'RW',  position: 'WG', x: 80, y: 60 },
    { slot: 'ST',  position: 'ST', x: 50, y: 78 },
  ],

  '5-3-2': [
    { slot: 'GK',  position: 'GK', x: 50, y: 5 },
    { slot: 'LWB', position: 'FB', x: 10, y: 30 },
    { slot: 'LCB', position: 'CB', x: 30, y: 22 },
    { slot: 'CB',  position: 'CB', x: 50, y: 20 },
    { slot: 'RCB', position: 'CB', x: 70, y: 22 },
    { slot: 'RWB', position: 'FB', x: 90, y: 30 },
    { slot: 'LCM', position: 'MF', x: 30, y: 50 },
    { slot: 'CM',  position: 'MF', x: 50, y: 47 },
    { slot: 'RCM', position: 'MF', x: 70, y: 50 },
    { slot: 'LST', position: 'ST', x: 37, y: 75 },
    { slot: 'RST', position: 'ST', x: 63, y: 75 },
  ],

  '3-4-3': [
    { slot: 'GK',  position: 'GK', x: 50, y: 5 },
    { slot: 'LCB', position: 'CB', x: 30, y: 22 },
    { slot: 'CB',  position: 'CB', x: 50, y: 20 },
    { slot: 'RCB', position: 'CB', x: 70, y: 22 },
    { slot: 'LWB', position: 'FB', x: 15, y: 45 },
    { slot: 'LCM', position: 'MF', x: 37, y: 47 },
    { slot: 'RCM', position: 'MF', x: 63, y: 47 },
    { slot: 'RWB', position: 'FB', x: 85, y: 45 },
    { slot: 'LW',  position: 'WG', x: 20, y: 72 },
    { slot: 'ST',  position: 'ST', x: 50, y: 78 },
    { slot: 'RW',  position: 'WG', x: 80, y: 72 },
  ],
};

/**
 * Get the slot definitions for a formation.
 */
export function getFormationSlots(formation: Formation): FormationSlotDef[] {
  return FORMATION_SLOTS[formation];
}

/**
 * Get the primary position required for a given slot in a formation.
 */
export function getSlotPosition(formation: Formation, slotName: string): Position | undefined {
  const slot = FORMATION_SLOTS[formation].find((s) => s.slot === slotName);
  return slot?.position;
}

/**
 * Position compatibility for cross-position warnings.
 * Returns 'exact' for same position, 'compatible' for related positions
 * (warn but allow), 'cross' for unrelated (strong warning, still allowed).
 * GK is strictly GK-only.
 *
 * Stat-based adaptation: wingers with high DEF (>=65) can adapt to FB,
 * and fullbacks with high ATK (>=65) can adapt to WG.
 * Pass playerStats to enable this check.
 */
export function checkPositionCompatibility(
  slotPosition: Position,
  playerPosition: Position,
  playerStats?: { ATK: number; DEF: number },
): 'exact' | 'compatible' | 'cross' {
  if (slotPosition === playerPosition) return 'exact';

  // GK is unique — never cross-assignable
  if (slotPosition === 'GK' || playerPosition === 'GK') return 'cross';

  // Compatibility groups
  const compatGroups: Position[][] = [
    ['CB', 'FB'],       // Defensive interchangeability
    ['MF', 'WG'],       // Midfield/wing interchangeability
    ['ST', 'WG'],       // Forward interchangeability
  ];

  for (const group of compatGroups) {
    if (group.includes(slotPosition) && group.includes(playerPosition)) {
      return 'compatible';
    }
  }

  // Stat-based adaptation: WG → FB if high DEF, FB → WG if high ATK
  if (playerStats) {
    if (playerPosition === 'WG' && slotPosition === 'FB' && playerStats.DEF >= 65) {
      return 'compatible';
    }
    if (playerPosition === 'FB' && slotPosition === 'WG' && playerStats.ATK >= 65) {
      return 'compatible';
    }
  }

  return 'cross';
}
