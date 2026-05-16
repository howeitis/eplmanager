import { describe, it, expect } from 'vitest';
import {
  migrateSaveData,
  validateSaveData,
  extractSaveData,
  reshapeToEqualWeightedAverage,
  CURRENT_SCHEMA_VERSION,
  SaveCorruptedError,
} from '@/utils/save';

function makeValidSaveShape(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    clubs: Array.from({ length: 20 }, (_, i) => ({ id: `c${i}` })),
    fixtures: Array.from({ length: 380 }, (_, i) => ({ id: i })),
    leagueTable: [],
    previousLeagueTable: [],
    budgets: {},
    transferHistory: [],
    currentPhase: 'aug',
    seasonNumber: 1,
    gameSeed: 'seed-abc',
    events: [],
    activeModifiers: [],
    manager: { name: 'Howe' },
    boardExpectation: { band: 'mid' },
    seasonHistories: [],
    saveSlot: 1,
    saveMetadata: { savedAt: 0, label: 'Slot 1' },
    startingXI: {},
    startingXIHistory: [],
    shortlist: [],
    clubReputation: {},
    ...overrides,
  };
}

describe('migrateSaveData', () => {
  it('stamps schemaVersion=1 onto pre-versioning saves (no field at all)', () => {
    const raw = makeValidSaveShape();
    // simulate a v1 save: no schemaVersion field
    const v1Shape = { ...raw };
    delete (v1Shape as Record<string, unknown>).schemaVersion;

    const migrated = migrateSaveData(v1Shape);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('backfills missing v1 optional fields on migration to v2', () => {
    const v1Shape: Record<string, unknown> = makeValidSaveShape();
    delete v1Shape.schemaVersion;
    delete v1Shape.previousLeagueTable;
    delete v1Shape.clubReputation;
    delete v1Shape.startingXI;
    delete v1Shape.startingXIHistory;
    delete v1Shape.shortlist;

    const migrated = migrateSaveData(v1Shape);

    expect(migrated.previousLeagueTable).toEqual([]);
    expect(migrated.clubReputation).toEqual({});
    expect(migrated.startingXI).toEqual({});
    expect(migrated.startingXIHistory).toEqual([]);
    expect(migrated.shortlist).toEqual([]);
  });

  it('passes through v2 saves unchanged in shape', () => {
    const v2 = makeValidSaveShape();
    const migrated = migrateSaveData(v2);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.clubs).toBe(v2.clubs);
    expect(migrated.fixtures).toBe(v2.fixtures);
    expect(migrated.gameSeed).toBe('seed-abc');
  });

  it('preserves user-set fields when backfilling', () => {
    const v1Shape: Record<string, unknown> = makeValidSaveShape({
      clubReputation: { c0: 75 },
    });
    delete v1Shape.schemaVersion;

    const migrated = migrateSaveData(v1Shape);
    expect(migrated.clubReputation).toEqual({ c0: 75 });
  });
});

describe('validateSaveData', () => {
  it('accepts a well-formed save', () => {
    expect(() => validateSaveData(makeValidSaveShape() as never)).not.toThrow();
  });

  it('throws SaveCorruptedError when clubs.length !== 20', () => {
    const bad = makeValidSaveShape({ clubs: [{ id: 'c0' }] });
    expect(() => validateSaveData(bad as never)).toThrow(SaveCorruptedError);
    expect(() => validateSaveData(bad as never)).toThrow(/20 clubs/);
  });

  it('throws SaveCorruptedError when fixtures.length !== 380', () => {
    const bad = makeValidSaveShape({ fixtures: [] });
    expect(() => validateSaveData(bad as never)).toThrow(/380 fixtures/);
  });

  it('throws SaveCorruptedError when manager is missing', () => {
    const bad = makeValidSaveShape({ manager: null });
    expect(() => validateSaveData(bad as never)).toThrow(/manager is missing/);
  });

  it('throws SaveCorruptedError when gameSeed is missing', () => {
    const bad = makeValidSaveShape({ gameSeed: '' });
    expect(() => validateSaveData(bad as never)).toThrow(/gameSeed/);
  });

  it('throws SaveCorruptedError on a truncated save object', () => {
    const truncated = { clubs: [] };
    expect(() => validateSaveData(truncated as never)).toThrow(SaveCorruptedError);
  });
});

describe('extractSaveData', () => {
  it('stamps the current schemaVersion onto extracted saves', () => {
    const state = makeValidSaveShape();
    const extracted = extractSaveData(state);
    expect(extracted.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('falls back to empty defaults for optional fields not on the state', () => {
    const minimal: Record<string, unknown> = makeValidSaveShape();
    delete minimal.shortlist;
    delete minimal.startingXI;
    delete minimal.previousLeagueTable;
    delete minimal.clubReputation;
    delete minimal.startingXIHistory;

    const extracted = extractSaveData(minimal);
    expect(extracted.shortlist).toEqual([]);
    expect(extracted.startingXI).toEqual({});
    expect(extracted.previousLeagueTable).toEqual([]);
    expect(extracted.clubReputation).toEqual({});
    expect(extracted.startingXIHistory).toEqual([]);
  });
});

describe('v2 → v3 goalkeeper migration', () => {
  it('reshapes existing GK stats so the equal-weighted average equals stored overall', () => {
    // v2-era GK with biased stats (high DEF/PWR/MEN, low ATK/MOV/SKL).
    // Old position-weighted formula produced overall=78. Under the new equal
    // formula the same stats would average to (60+92+65+88+85+60)/6 = 75 —
    // the migration must reshape them so the equal average comes back to 78.
    const v2: Record<string, unknown> = {
      schemaVersion: 2,
      clubs: [
        {
          id: 'test-club',
          roster: [
            {
              id: 'gk1',
              position: 'GK',
              overall: 78,
              stats: { ATK: 60, DEF: 92, MOV: 65, PWR: 88, MEN: 85, SKL: 60 },
              statsSnapshotSeasonStart: { ATK: 60, DEF: 92, MOV: 65, PWR: 88, MEN: 85, SKL: 60 },
            },
            // Outfield player should be left alone.
            {
              id: 'st1',
              position: 'ST',
              overall: 82,
              stats: { ATK: 90, DEF: 50, MOV: 85, PWR: 80, MEN: 75, SKL: 80 },
            },
          ],
        },
      ],
      fixtures: Array.from({ length: 380 }, (_, i) => ({ id: i })),
      manager: { name: 'Howe' },
      gameSeed: 'seed',
      seasonNumber: 1,
    };

    const migrated = migrateSaveData(v2);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const club = (migrated.clubs as any[])[0];
    const gk = club.roster.find((p: { id: string }) => p.id === 'gk1');
    const st = club.roster.find((p: { id: string }) => p.id === 'st1');

    // GK: equal-weighted average lands exactly on stored overall.
    const gkAvg = (gk.stats.ATK + gk.stats.DEF + gk.stats.MOV + gk.stats.PWR + gk.stats.MEN + gk.stats.SKL) / 6;
    expect(gkAvg).toBe(78);

    // Snapshot reshaped too so the aging report doesn't show phantom shifts.
    const snapAvg =
      (gk.statsSnapshotSeasonStart.ATK + gk.statsSnapshotSeasonStart.DEF +
        gk.statsSnapshotSeasonStart.MOV + gk.statsSnapshotSeasonStart.PWR +
        gk.statsSnapshotSeasonStart.MEN + gk.statsSnapshotSeasonStart.SKL) / 6;
    expect(snapAvg).toBe(78);

    // Outfield player untouched.
    expect(st.stats).toEqual({ ATK: 90, DEF: 50, MOV: 85, PWR: 80, MEN: 75, SKL: 80 });
  });

  it('reshapeToEqualWeightedAverage hits target across the legal range', () => {
    for (const target of [45, 60, 75, 85, 95]) {
      const out = reshapeToEqualWeightedAverage(
        { ATK: 60, DEF: 90, MOV: 60, PWR: 85, MEN: 80, SKL: 55 },
        target,
      );
      const avg = (out.ATK + out.DEF + out.MOV + out.PWR + out.MEN + out.SKL) / 6;
      expect(avg).toBe(target);
      for (const k of ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'] as const) {
        expect(out[k]).toBeGreaterThanOrEqual(1);
        expect(out[k]).toBeLessThanOrEqual(99);
      }
    }
  });
});

describe('migrate → validate round trip', () => {
  it('a v1 save migrates and then validates cleanly', () => {
    const v1Shape: Record<string, unknown> = makeValidSaveShape();
    delete v1Shape.schemaVersion;
    delete v1Shape.previousLeagueTable;
    delete v1Shape.clubReputation;

    const migrated = migrateSaveData(v1Shape);
    expect(() => validateSaveData(migrated)).not.toThrow();
  });
});
