/**
 * Starting XI Engine — Pure functions for Starting XI management.
 * No React imports. Operates on game state and returns results.
 */

import type { Player, GamePhase } from '@/types/entities';
import type { Formation } from './matchSim';
import { getFormationSlots, checkPositionCompatibility } from '@/data/formations';
import type { FormationSlotDef } from '@/data/formations';

// ─── Types ───

/** Mapping of slot name → player ID */
export type StartingXIMap = Record<string, string>;

export interface XISwap {
  slot: string;
  outPlayerId: string;
  outPlayerName: string;
  inPlayerId: string;
  inPlayerName: string;
}

export interface XIAutoSwapResult {
  newXI: StartingXIMap;
  swaps: XISwap[];
  unfillableSlots: string[];
}

export interface XIValidation {
  valid: boolean;
  filledCount: number;
  errors: string[];
  warnings: string[];
}

export interface MonthlyXIRecord {
  phase: GamePhase;
  formation: Formation;
  xi: StartingXIMap;
}

// ─── Auto-Select Starting XI ───

/**
 * Auto-select the best Starting XI for a given formation and roster.
 * Picks the highest-rated eligible (non-injured, non-temporary) player per slot.
 * Each player can only fill one slot.
 */
export function autoSelectXI(
  formation: Formation,
  roster: Player[],
): StartingXIMap {
  const slots = getFormationSlots(formation);
  const xi: StartingXIMap = {};
  const usedPlayerIds = new Set<string>();

  // Available players: non-injured, non-temporary
  const available = roster
    .filter((p) => !p.injured && !p.isTemporary)
    .sort((a, b) => b.overall - a.overall);

  // First pass: assign exact position matches (best first)
  for (const slotDef of slots) {
    const candidate = available.find(
      (p) => p.position === slotDef.position && !usedPlayerIds.has(p.id),
    );
    if (candidate) {
      xi[slotDef.slot] = candidate.id;
      usedPlayerIds.add(candidate.id);
    }
  }

  // Second pass: fill remaining slots with best available (compatible first, then any)
  for (const slotDef of slots) {
    if (xi[slotDef.slot]) continue;

    // Try compatible positions first (including stat-based WG↔FB adaptation)
    const compatible = available.find(
      (p) =>
        !usedPlayerIds.has(p.id) &&
        checkPositionCompatibility(slotDef.position, p.position, p.stats) === 'compatible',
    );
    if (compatible) {
      xi[slotDef.slot] = compatible.id;
      usedPlayerIds.add(compatible.id);
      continue;
    }

    // Then any remaining player
    const anyPlayer = available.find((p) => !usedPlayerIds.has(p.id));
    if (anyPlayer) {
      xi[slotDef.slot] = anyPlayer.id;
      usedPlayerIds.add(anyPlayer.id);
    }
  }

  return xi;
}

// ─── Injury Auto-Swap ───

/**
 * Check the current Starting XI for injured players and auto-swap them
 * with the best available bench player for that slot's position.
 * Falls through to temp fill-in system if no valid senior player exists.
 */
export function autoSwapInjuredPlayers(
  xi: StartingXIMap,
  formation: Formation,
  roster: Player[],
): XIAutoSwapResult {
  const slots = getFormationSlots(formation);
  const newXI = { ...xi };
  const swaps: XISwap[] = [];
  const unfillableSlots: string[] = [];

  // Get all player IDs currently in the XI
  const xiPlayerIds = new Set(Object.values(newXI));

  for (const slotDef of slots) {
    const currentPlayerId = newXI[slotDef.slot];
    if (!currentPlayerId) continue;

    const currentPlayer = roster.find((p) => p.id === currentPlayerId);
    if (!currentPlayer || !currentPlayer.injured) continue;

    // Find best replacement from bench (not in XI, not injured, not temporary)
    const benchPlayers = roster
      .filter((p) => !xiPlayerIds.has(p.id) && !p.injured && !p.isTemporary)
      .sort((a, b) => b.overall - a.overall);

    // Priority: exact position match → compatible position → any
    let replacement = benchPlayers.find((p) => p.position === slotDef.position);
    if (!replacement) {
      replacement = benchPlayers.find(
        (p) => checkPositionCompatibility(slotDef.position, p.position, p.stats) === 'compatible',
      );
    }
    if (!replacement) {
      replacement = benchPlayers.find(
        (p) => p.position !== 'GK' || slotDef.position === 'GK', // Don't put outfield players in GK or vice versa unless GK slot
      );
    }

    if (replacement) {
      newXI[slotDef.slot] = replacement.id;
      xiPlayerIds.delete(currentPlayerId);
      xiPlayerIds.add(replacement.id);
      swaps.push({
        slot: slotDef.slot,
        outPlayerId: currentPlayer.id,
        outPlayerName: currentPlayer.name,
        inPlayerId: replacement.id,
        inPlayerName: replacement.name,
      });
    } else {
      // No valid senior player — mark as unfillable (temp fill-in system handles this)
      unfillableSlots.push(slotDef.slot);
    }
  }

  return { newXI, swaps, unfillableSlots };
}

// ─── Player Resolution ───

/**
 * Get the Player objects for all players in the Starting XI.
 */
export function getStartingXIPlayers(
  xi: StartingXIMap,
  roster: Player[],
): Player[] {
  const playerIds = Object.values(xi);
  return roster.filter((p) => playerIds.includes(p.id));
}

/**
 * Get bench players: all non-injured roster players NOT in the Starting XI.
 * Excludes temporary fill-ins.
 */
export function getBenchPlayers(
  xi: StartingXIMap,
  roster: Player[],
): Player[] {
  const xiPlayerIds = new Set(Object.values(xi));
  return roster.filter(
    (p) => !xiPlayerIds.has(p.id) && !p.injured && !p.isTemporary,
  );
}

// ─── Validation ───

/**
 * Validate a Starting XI selection.
 * Returns errors (block advance) and warnings (allow but inform).
 */
export function validateXI(
  xi: StartingXIMap,
  formation: Formation,
  roster: Player[],
): XIValidation {
  const slots = getFormationSlots(formation);
  const errors: string[] = [];
  const warnings: string[] = [];
  let filledCount = 0;

  // Check filled count
  const assignedPlayerIds: string[] = [];
  for (const slotDef of slots) {
    const playerId = xi[slotDef.slot];
    if (playerId) {
      filledCount++;
      assignedPlayerIds.push(playerId);

      // Check for duplicates
      const duplicateCount = assignedPlayerIds.filter((id) => id === playerId).length;
      if (duplicateCount > 1) {
        const player = roster.find((p) => p.id === playerId);
        errors.push(`${player?.name || 'Unknown'} is assigned to multiple slots`);
      }

      // Check position compatibility
      const player = roster.find((p) => p.id === playerId);
      if (player) {
        const compat = checkPositionCompatibility(slotDef.position, player.position, player.stats);
        if (compat === 'cross') {
          warnings.push(`${player.name} (${player.position}) playing as ${slotDef.slot} — out of position`);
        } else if (compat === 'compatible') {
          warnings.push(`${player.name} (${player.position}) in ${slotDef.slot} — can adapt`);
        }

        // Check if injured
        if (player.injured) {
          warnings.push(`${player.name} is injured (${player.injuryWeeks}w remaining)`);
        }
      }
    }
  }

  if (filledCount < 11) {
    errors.push(`Only ${filledCount}/11 players selected — need a full XI to advance`);
  }

  // Deduplicate errors
  const uniqueErrors = [...new Set(errors)];
  const uniqueWarnings = [...new Set(warnings)];

  return {
    valid: uniqueErrors.length === 0,
    filledCount,
    errors: uniqueErrors,
    warnings: uniqueWarnings,
  };
}

// ─── Squad Depth Bonus ───

/**
 * Calculate the SquadDepthBonus based on bench player average rating.
 * bench_avg_rating >= 75: +2
 * bench_avg_rating >= 70: +1
 * bench_avg_rating >= 65:  0
 * bench_avg_rating <  65: -1
 */
export function calculateSquadDepthBonus(benchPlayers: Player[]): number {
  if (benchPlayers.length === 0) return -1;

  const avgRating =
    benchPlayers.reduce((sum, p) => sum + p.overall, 0) / benchPlayers.length;

  if (avgRating >= 75) return 2;
  if (avgRating >= 70) return 1;
  if (avgRating >= 65) return 0;
  return -1;
}

// ─── TSS Squad Component (new formula) ───

/**
 * Calculate the squad component of TSS using the new Starting-XI-plus-depth formula.
 * TSS_squad_component = StartingXI_avg_rating + SquadDepthBonus
 */
export function calculateXIBasedSquadRating(
  startingXIPlayers: Player[],
  benchPlayers: Player[],
): number {
  if (startingXIPlayers.length === 0) return 50;

  const xiAvg =
    startingXIPlayers.reduce((sum, p) => sum + p.overall, 0) / startingXIPlayers.length;
  const depthBonus = calculateSquadDepthBonus(benchPlayers);

  return xiAvg + depthBonus;
}

// ─── Auto-Sub Returning Players ───

/**
 * When players return from injury, check if they should be restored to the
 * Starting XI. A recovered player replaces the current holder of a matching
 * position slot if the recovered player has higher (overall + form).
 */
export function autoSubReturningPlayers(
  xi: StartingXIMap,
  formation: Formation,
  roster: Player[],
  recoveredPlayerIds: string[],
): { newXI: StartingXIMap; swaps: XISwap[] } {
  if (recoveredPlayerIds.length === 0) return { newXI: xi, swaps: [] };

  const slots = getFormationSlots(formation);
  const newXI = { ...xi };
  const swaps: XISwap[] = [];

  for (const recoveredId of recoveredPlayerIds) {
    const recovered = roster.find((p) => p.id === recoveredId);
    if (!recovered || recovered.isTemporary) continue;

    const recoveredScore = recovered.overall + recovered.form;

    // Already in XI? Skip
    if (Object.values(newXI).includes(recoveredId)) continue;

    // Find all slots that match this player's position
    const matchingSlots = slots.filter((s) => s.position === recovered.position);

    // Also check compatible slots (e.g., WG in MF slot)
    const compatSlots = slots.filter(
      (s) =>
        s.position !== recovered.position &&
        checkPositionCompatibility(s.position, recovered.position, recovered.stats) !== 'cross',
    );

    // Check matching slots first, then compatible
    for (const slotDef of [...matchingSlots, ...compatSlots]) {
      const currentHolderId = newXI[slotDef.slot];
      if (!currentHolderId) continue;

      const currentHolder = roster.find((p) => p.id === currentHolderId);
      if (!currentHolder) continue;

      const currentScore = currentHolder.overall + currentHolder.form;

      if (recoveredScore > currentScore) {
        newXI[slotDef.slot] = recoveredId;
        swaps.push({
          slot: slotDef.slot,
          outPlayerId: currentHolder.id,
          outPlayerName: currentHolder.name,
          inPlayerId: recovered.id,
          inPlayerName: recovered.name,
        });
        break; // Player placed — move to next recovered player
      }
    }
  }

  return { newXI, swaps };
}

// ─── Formation Slot Helpers (re-exported for convenience) ───

export { getFormationSlots, checkPositionCompatibility };
export type { FormationSlotDef };

