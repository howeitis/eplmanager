import type { LeagueTableRow } from '@/types/entities';

/**
 * Stakes payload for the Final Day cinematic. Title / topfour use top-of-
 * table contenders; relegation uses the bottom contenders. The cinematic
 * UI varies its banner copy and which slice of the table it shows based
 * on `kind`.
 */
export type FinalDayStakes =
  | { kind: 'title'; contenders: string[] }
  | { kind: 'relegation'; contenders: string[] }
  | { kind: 'topfour'; contenders: string[] };

export interface FinalDayTriggerArgs {
  leagueTable: LeagueTableRow[];
  playerClubId: string;
  /** How many league fixtures remain after this advance — usually 1. */
  fixturesRemaining: number;
}

/**
 * Returns the stakes if this advance warrants a cinematic, or null. Active
 * trigger conditions:
 *   - title race: top 2 clubs are within 5 points
 *   - relegation race: player is currently 17th-20th AND ≤5 pts above 18th
 *   - top-four race: player is 4th-6th AND ≤5 pts adrift of 4th
 *
 * Caller should already have confirmed currentPhase has just become 'may'
 * — this is a pure data check on the table shape. No React, no engine
 * coupling — safe to import from the main bundle without dragging in
 * the cinematic component.
 */
export function detectFinalDayStakes({
  leagueTable,
  playerClubId,
  fixturesRemaining,
}: FinalDayTriggerArgs): FinalDayStakes | null {
  if (fixturesRemaining < 1) return null;

  const sorted = [...leagueTable].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  if (sorted.length < 4) return null;
  const leader = sorted[0];
  const second = sorted[1];

  // Title race — 2+ within 5 pts of leader.
  if (second.points >= leader.points - 5) {
    const titleContenders = sorted
      .filter((r) => r.points >= leader.points - 5)
      .map((r) => r.clubId);
    if (titleContenders.length >= 2) {
      return { kind: 'title', contenders: titleContenders };
    }
  }

  // Player at risk of relegation (in the bottom 4 and within 5 of survival).
  const playerIdx = sorted.findIndex((r) => r.clubId === playerClubId);
  if (playerIdx >= 16) {
    const safeRow = sorted[16];
    if (safeRow && sorted[playerIdx].points <= safeRow.points + 5) {
      const contenders = sorted.slice(16).map((r) => r.clubId);
      return { kind: 'relegation', contenders };
    }
  }

  // Top-four chase — player is 5th-7th and within 5 pts of 4th. Already
  // being in 4th doesn't qualify (no dethronement pressure modelled here)
  // and being 8th+ is too far to make the final round dramatic.
  if (playerIdx >= 4 && playerIdx <= 6) {
    const fourth = sorted[3];
    if (fourth && fourth.points - sorted[playerIdx].points <= 5) {
      const contenders = sorted.slice(2, 7).map((r) => r.clubId);
      return { kind: 'topfour', contenders };
    }
  }

  return null;
}
