import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { SaveMetadata } from '../types/entities';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SaveableState = Record<string, any>;

const SAVE_KEY_PREFIX = 'epl-manager-save-';
const METADATA_KEY = 'epl-manager-save-metadata';

/**
 * Bump this whenever the persisted shape of SaveData changes in a way that
 * isn't backward-compatible. When bumping, add a step to migrateSaveData()
 * that upgrades the previous version to the new one, and add a Vitest.
 *
 * History:
 *  v1 — implicit (pre-versioning). previousLeagueTable and clubReputation
 *       were optional; some saves omit them entirely.
 *  v2 — schemaVersion introduced. Migration backfills the optional fields.
 *  v3 — goalkeeper stats relabelled (DIV/HAN/KIC/REF/MEN/POS) and equal-
 *       weighted into overall. Migration reshapes every existing GK's
 *       six stat slots so the new average equals the stored overall,
 *       preserving rating continuity across the schema change.
 */
export const CURRENT_SCHEMA_VERSION = 3;

export interface SaveData {
  schemaVersion: number;
  clubs: unknown[];
  fixtures: unknown[];
  leagueTable: unknown[];
  previousLeagueTable: unknown[];
  budgets: Record<string, number>;
  transferHistory: unknown[];
  currentPhase: string;
  seasonNumber: number;
  gameSeed: string;
  events: unknown[];
  activeModifiers: unknown[];
  manager: unknown;
  boardExpectation: unknown;
  seasonHistories: unknown[];
  saveSlot: number;
  saveMetadata: SaveMetadata;
  startingXI: Record<string, string>;
  startingXIHistory: unknown[];
  shortlist: string[];
  clubReputation: Record<string, number>;
}

/** Raw shape coming off disk — fields are optional because old saves may omit them. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawSaveData = Record<string, any>;

export class SaveCorruptedError extends Error {
  constructor(reason: string) {
    super(`Save file is corrupted or invalid: ${reason}`);
    this.name = 'SaveCorruptedError';
  }
}

function getSaveKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

/**
 * Step a save forward through every schema version until it matches CURRENT_SCHEMA_VERSION.
 * Each `if (version < N)` block must upgrade vN-1 → vN, then bump `version`.
 *
 * Pre-versioning saves (no schemaVersion field at all) are treated as v1.
 */
export function migrateSaveData(raw: RawSaveData): SaveData {
  let version: number = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  let data: RawSaveData = { ...raw };

  if (version < 2) {
    // v1 → v2: backfill fields that were optional in v1 and stamp the version.
    data = {
      ...data,
      previousLeagueTable: Array.isArray(data.previousLeagueTable) ? data.previousLeagueTable : [],
      clubReputation:
        data.clubReputation && typeof data.clubReputation === 'object' ? data.clubReputation : {},
      startingXI: data.startingXI && typeof data.startingXI === 'object' ? data.startingXI : {},
      startingXIHistory: Array.isArray(data.startingXIHistory) ? data.startingXIHistory : [],
      shortlist: Array.isArray(data.shortlist) ? data.shortlist : [],
    };
    version = 2;
  }

  if (version < 3) {
    // v2 → v3: GK stats are now equally-weighted into overall. Reshape every
    // existing keeper so the new equal-weighted average equals the stored
    // overall — preserving rating continuity. Outfield players are untouched.
    data = { ...data, clubs: reshapeGoalkeeperStats(data.clubs) };
    version = 3;
  }

  return { ...data, schemaVersion: version } as SaveData;
}

const GK_STAT_SLOTS = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'] as const;

/**
 * v2 → v3 helper. For every GK in every club roster, recompute their six
 * stats so the flat average matches the stored overall. We start by shifting
 * the existing biased values uniformly; if clamping at 1/99 throws the
 * average off, we top up the slots that still have headroom until the
 * average lands. statsSnapshotSeasonStart gets the same treatment so the
 * aging report doesn't show phantom +/- changes after the migration.
 */
function reshapeGoalkeeperStats(clubs: unknown): unknown {
  if (!Array.isArray(clubs)) return clubs;
  return clubs.map((club) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = club as Record<string, any>;
    const roster = Array.isArray(c?.roster) ? c.roster : null;
    if (!roster) return club;

    const newRoster = roster.map((player) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = player as Record<string, any>;
      if (p?.position !== 'GK' || !p?.stats || typeof p.overall !== 'number') return player;
      const target = Math.round(p.overall);
      return {
        ...p,
        stats: reshapeToEqualWeightedAverage(p.stats, target),
        statsSnapshotSeasonStart: p.statsSnapshotSeasonStart
          ? reshapeToEqualWeightedAverage(p.statsSnapshotSeasonStart, target)
          : undefined,
      };
    });

    return { ...c, roster: newRoster };
  });
}

/**
 * Take a six-stat object and adjust each slot so the flat average lands on
 * `target`. Pure utility — no rng. Used by the v2 → v3 migration and only
 * exported for tests.
 */
export function reshapeToEqualWeightedAverage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stats: any,
  target: number,
): Record<string, number> {
  // Snapshot inputs and clamp to the legal range, falling back to the
  // target value if a slot is missing or non-numeric. Defensive against
  // arbitrary disk shapes.
  const values: Record<string, number> = {};
  for (const k of GK_STAT_SLOTS) {
    const raw = stats?.[k];
    const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : target;
    values[k] = Math.max(1, Math.min(99, Math.round(n)));
  }

  // Uniform shift toward target.
  const avg = (values.ATK + values.DEF + values.MOV + values.PWR + values.MEN + values.SKL) / 6;
  const delta = Math.round(target - avg);
  if (delta !== 0) {
    for (const k of GK_STAT_SLOTS) {
      values[k] = Math.max(1, Math.min(99, values[k] + delta));
    }
  }

  // Top up / trim to hit target exactly, distributing the leftover +/- 1's
  // across slots that still have headroom (or capacity to give).
  let leftover = target * 6 - (values.ATK + values.DEF + values.MOV + values.PWR + values.MEN + values.SKL);
  let guard = 0;
  while (leftover !== 0 && guard < 60) {
    guard++;
    for (const k of GK_STAT_SLOTS) {
      if (leftover > 0 && values[k] < 99) { values[k]++; leftover--; }
      else if (leftover < 0 && values[k] > 1) { values[k]--; leftover++; }
      if (leftover === 0) break;
    }
  }

  return values;
}

/**
 * Validate that a migrated save has the structural invariants the game relies on.
 * Throws SaveCorruptedError with a specific reason on failure.
 */
export function validateSaveData(data: SaveData): void {
  if (!Array.isArray(data.clubs) || data.clubs.length !== 20) {
    throw new SaveCorruptedError(`expected 20 clubs, got ${(data.clubs as unknown[])?.length ?? 0}`);
  }
  if (!Array.isArray(data.fixtures) || data.fixtures.length !== 380) {
    throw new SaveCorruptedError(
      `expected 380 fixtures, got ${(data.fixtures as unknown[])?.length ?? 0}`,
    );
  }
  if (!data.manager) {
    throw new SaveCorruptedError('manager is missing');
  }
  if (typeof data.gameSeed !== 'string' || data.gameSeed.length === 0) {
    throw new SaveCorruptedError('gameSeed is missing');
  }
  if (typeof data.seasonNumber !== 'number') {
    throw new SaveCorruptedError('seasonNumber is missing');
  }
}

/** Extract saveable state from the game store (excludes tempFillIns and transferOffers) */
export function extractSaveData(state: SaveableState): SaveData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    clubs: state.clubs as unknown[],
    fixtures: state.fixtures as unknown[],
    leagueTable: state.leagueTable as unknown[],
    budgets: state.budgets as Record<string, number>,
    transferHistory: state.transferHistory as unknown[],
    currentPhase: state.currentPhase as string,
    seasonNumber: state.seasonNumber as number,
    gameSeed: state.gameSeed as string,
    events: state.events as unknown[],
    activeModifiers: state.activeModifiers as unknown[],
    manager: state.manager,
    boardExpectation: state.boardExpectation,
    seasonHistories: state.seasonHistories as unknown[],
    saveSlot: state.saveSlot as number,
    saveMetadata: state.saveMetadata as SaveMetadata,
    startingXI: (state.startingXI || {}) as Record<string, string>,
    startingXIHistory: (state.startingXIHistory || []) as unknown[],
    shortlist: (state.shortlist || []) as string[],
    previousLeagueTable: (state.previousLeagueTable || []) as unknown[],
    clubReputation: (state.clubReputation || {}) as Record<string, number>,
  };
}

export async function saveGame(slot: number, state: SaveableState): Promise<void> {
  const data = extractSaveData(state);

  // Recompute metadata from latest state so the slot picker always reflects
  // current league position, phase, and timestamp — independent of caller hygiene.
  const playerClubId = (state.manager as { clubId?: string } | null | undefined)?.clubId;
  const table = (state.leagueTable as { clubId: string; points: number; goalDifference: number; goalsFor: number; played?: number }[]) ?? [];
  const anyMatchesPlayed = table.some((r) => (r.played ?? 0) > 0);
  const sorted = [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  const prevMetadata = (state.saveMetadata as SaveMetadata | null) ?? null;
  const computedPos = playerClubId ? sorted.findIndex((r) => r.clubId === playerClubId) + 1 : 0;
  // Before any matches are played, sort is essentially arbitrary — keep the previous
  // value (0 on a brand-new save) rather than reporting a misleading position.
  const leaguePosition = anyMatchesPlayed && computedPos > 0 ? computedPos : (prevMetadata?.leaguePosition ?? 0);
  const freshMetadata: SaveMetadata = {
    ...(prevMetadata as SaveMetadata),
    leaguePosition,
    currentPhase: state.currentPhase as SaveMetadata['currentPhase'],
    seasonNumber: state.seasonNumber as number,
    lastSaved: new Date().toISOString(),
  };
  data.saveMetadata = freshMetadata;

  await idbSet(getSaveKey(slot), data);

  // Update metadata index
  const allMetadata = await getAllSaveMetadata();
  allMetadata[slot] = freshMetadata;
  await idbSet(METADATA_KEY, allMetadata);
}

export async function loadGame(slot: number): Promise<SaveData | null> {
  const raw = await idbGet<RawSaveData>(getSaveKey(slot));
  if (!raw) return null;

  const migrated = migrateSaveData(raw);
  validateSaveData(migrated);
  return migrated;
}

export async function deleteSave(slot: number): Promise<void> {
  await idbDel(getSaveKey(slot));

  const allMetadata = await getAllSaveMetadata();
  delete allMetadata[slot];
  await idbSet(METADATA_KEY, allMetadata);
}

export async function getAllSaveMetadata(): Promise<Record<number, SaveMetadata>> {
  const metadata = await idbGet<Record<number, SaveMetadata>>(METADATA_KEY);
  return metadata || {};
}

/** Cull season data for archival — strip match-level detail, keep aggregates */
export function cullSeasonData(seasonHistory: {
  finalTable: unknown[];
  playerStats: unknown[];
  transferLog: unknown[];
  events: unknown[];
}): typeof seasonHistory {
  // The season history format already stores only aggregates.
  // This function is called at season end to ensure no match-level data leaks in.
  return {
    finalTable: seasonHistory.finalTable,
    playerStats: seasonHistory.playerStats,
    transferLog: seasonHistory.transferLog,
    events: seasonHistory.events,
  };
}
