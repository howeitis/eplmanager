/**
 * Mid-season stat adjustments — applied at the start of January.
 * Only targets outlier players: young breakouts, steep veteran decline,
 * extreme hot/cold form streaks. Keeps changes small and targeted.
 * The full end-of-season aging system remains unchanged.
 */

import type { Player, Club } from '../types/entities';
import { SeededRNG } from '../utils/rng';
import { calculateOverall, calculateMarketValue } from './playerGen';

export interface MidSeasonAdjustment {
  playerId: string;
  playerName: string;
  clubId: string;
  oldOverall: number;
  newOverall: number;
  reason: string;
}

/**
 * Process mid-season stat adjustments for all clubs.
 * Only outlier players are affected — this is NOT a full aging pass.
 */
export function processMidSeasonAdjustments(
  rng: SeededRNG,
  clubs: Club[],
): MidSeasonAdjustment[] {
  const adjustments: MidSeasonAdjustment[] = [];

  for (const club of clubs) {
    const clubRng = new SeededRNG(`${rng.random()}-midseason-${club.id}`);

    for (const player of club.roster) {
      if (player.isTemporary) continue;

      const adjustment = calculateMidSeasonChange(clubRng, player);
      if (adjustment) {
        const oldOverall = player.overall;
        const statKeys: (keyof Player['stats'])[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];

        // Apply stat changes
        for (const key of statKeys) {
          if (adjustment.statChanges[key]) {
            player.stats[key] = Math.max(1, Math.min(99, player.stats[key] + adjustment.statChanges[key]));
          }
        }

        player.overall = calculateOverall(player.stats, player.position);
        player.value = calculateMarketValue(player.overall, player.age, 0, player.trait);

        if (player.overall !== oldOverall) {
          adjustments.push({
            playerId: player.id,
            playerName: player.name,
            clubId: club.id,
            oldOverall,
            newOverall: player.overall,
            reason: adjustment.reason,
          });
        }
      }
    }
  }

  return adjustments;
}

interface StatChangeResult {
  statChanges: Partial<Record<keyof Player['stats'], number>>;
  reason: string;
}

function calculateMidSeasonChange(
  rng: SeededRNG,
  player: Player,
): StatChangeResult | null {
  // Young breakout: age ≤ 22, overall < 72, ~15% chance
  if (player.age <= 22 && player.overall < 72 && rng.random() < 0.15) {
    const boost = rng.randomInt(2, 5);
    // Distribute boost across position-relevant stats
    const statChanges: Partial<Record<keyof Player['stats'], number>> = {};
    const keys: (keyof Player['stats'])[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];
    for (let i = 0; i < boost; i++) {
      const key = keys[rng.randomInt(0, keys.length - 1)];
      statChanges[key] = (statChanges[key] || 0) + 1;
    }
    return { statChanges, reason: 'Young breakout — rapid mid-season improvement' };
  }

  // Veteran steep decline: age ≥ 32, ~10% chance
  if (player.age >= 32 && rng.random() < 0.10) {
    const drop = rng.randomInt(2, 4);
    return {
      statChanges: {
        MOV: -Math.ceil(drop / 2),
        PWR: -Math.floor(drop / 2),
      },
      reason: 'Veteran decline — fitness dipping mid-season',
    };
  }

  // Hot streak permanent boost: form ≥ 4, ~10% chance
  if (player.form >= 4 && rng.random() < 0.10) {
    const boost = rng.randomInt(1, 3);
    const statChanges: Partial<Record<keyof Player['stats'], number>> = {};
    const keys: (keyof Player['stats'])[] = ['ATK', 'SKL', 'MEN'];
    for (let i = 0; i < boost; i++) {
      const key = keys[rng.randomInt(0, keys.length - 1)];
      statChanges[key] = (statChanges[key] || 0) + 1;
    }
    return { statChanges, reason: 'Hot streak — confidence translating to permanent improvement' };
  }

  // Poor form crisis: form ≤ -4, ~10% chance
  if (player.form <= -4 && rng.random() < 0.10) {
    const drop = rng.randomInt(1, 3);
    const statChanges: Partial<Record<keyof Player['stats'], number>> = {};
    const keys: (keyof Player['stats'])[] = ['MEN', 'SKL', 'ATK'];
    for (let i = 0; i < drop; i++) {
      const key = keys[rng.randomInt(0, keys.length - 1)];
      statChanges[key] = (statChanges[key] || 0) - 1;
    }
    return { statChanges, reason: 'Crisis of confidence — form slump taking its toll' };
  }

  return null;
}
