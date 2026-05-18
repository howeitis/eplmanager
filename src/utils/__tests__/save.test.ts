import { describe, it, expect } from 'vitest';
import {
  migrateSaveData,
  validateSaveData,
  extractSaveData,
  reshapeToEqualWeightedAverage,
  defaultSchoolFromBackground,
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

  describe('v4 → v5 (tactic deck)', () => {
    it('grants STARTER_INSTRUCTION_CARD_IDS to a v4 save with no tactic state', () => {
      const v4: Record<string, unknown> = makeValidSaveShape({ schemaVersion: 4 });
      delete v4.ownedTacticCards;
      delete v4.activeInstructionCardId;

      const migrated = migrateSaveData(v4);
      expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(Array.isArray(migrated.ownedTacticCards)).toBe(true);
      // At least the starters land — engine asserts later that they're real ids.
      expect(migrated.ownedTacticCards.length).toBeGreaterThan(0);
      expect(migrated.activeInstructionCardId).toBeNull();
    });

    it('does not stomp on existing ownership when present', () => {
      const v4: Record<string, unknown> = makeValidSaveShape({
        schemaVersion: 4,
        ownedTacticCards: ['instr-tempo-quickens'],
        activeInstructionCardId: 'instr-tempo-quickens',
      });

      const migrated = migrateSaveData(v4);
      expect(migrated.ownedTacticCards).toContain('instr-tempo-quickens');
      expect(migrated.activeInstructionCardId).toBe('instr-tempo-quickens');
    });

    it('dedupes when starter ids overlap existing ownership', () => {
      // Pre-grant a starter, then run migration. Should appear exactly once.
      const v4: Record<string, unknown> = makeValidSaveShape({
        schemaVersion: 4,
        ownedTacticCards: ['instr-press-from-front'],
      });

      const migrated = migrateSaveData(v4);
      const occurrences = migrated.ownedTacticCards.filter((id) => id === 'instr-press-from-front').length;
      expect(occurrences).toBe(1);
    });

    it('passes a v5-shaped save through unchanged in its tactic state', () => {
      const v5: Record<string, unknown> = makeValidSaveShape({
        ownedTacticCards: ['instr-press-from-front'],
        activeInstructionCardId: null,
      });
      const migrated = migrateSaveData(v5);
      expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(migrated.ownedTacticCards).toEqual(['instr-press-from-front']);
    });
  });

  describe('v5 → v6 (tactic schools)', () => {
    it('defaults manager.school from playingBackground when missing', () => {
      const v5: Record<string, unknown> = makeValidSaveShape({
        schemaVersion: 5,
        manager: { name: 'Howe', playingBackground: 'former-pro', reputation: 60 },
      });
      const migrated = migrateSaveData(v5);
      expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = migrated.manager as any;
      expect(m.school).toBe('total-football');
      expect(m.previousReputation).toBe(60);
    });

    it('preserves an existing manager.school if already set', () => {
      const v5: Record<string, unknown> = makeValidSaveShape({
        schemaVersion: 5,
        manager: { name: 'Howe', playingBackground: 'former-pro', school: 'gegenpress', reputation: 70 },
      });
      const migrated = migrateSaveData(v5);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = migrated.manager as any;
      expect(m.school).toBe('gegenpress');
      expect(m.previousReputation).toBe(70);
    });

    it('mirrors reputation into previousReputation only when missing', () => {
      const v5: Record<string, unknown> = makeValidSaveShape({
        schemaVersion: 5,
        manager: { name: 'Howe', reputation: 50, previousReputation: 30 },
      });
      const migrated = migrateSaveData(v5);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = migrated.manager as any;
      expect(m.previousReputation).toBe(30);
    });

    it('defaults previousReputation to 50 when reputation is missing entirely', () => {
      const v5: Record<string, unknown> = makeValidSaveShape({
        schemaVersion: 5,
        manager: { name: 'Howe' },
      });
      const migrated = migrateSaveData(v5);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = migrated.manager as any;
      expect(m.previousReputation).toBe(50);
    });
  });
});

describe('defaultSchoolFromBackground', () => {
  it('maps each known background to a school', () => {
    expect(defaultSchoolFromBackground('former-pro')).toBe('total-football');
    expect(defaultSchoolFromBackground('lower-league-pro')).toBe('direct');
    expect(defaultSchoolFromBackground('academy-coach')).toBe('tiki-taka');
    expect(defaultSchoolFromBackground('journalist')).toBe('gegenpress');
    expect(defaultSchoolFromBackground('analyst')).toBe('catenaccio');
    expect(defaultSchoolFromBackground('never-played')).toBe('gegenpress');
  });

  it('falls back to gegenpress for an unknown value', () => {
    expect(defaultSchoolFromBackground(undefined)).toBe('gegenpress');
    expect(defaultSchoolFromBackground('something-else')).toBe('gegenpress');
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

describe('v3 → v4 binder migration', () => {
  it('adds an empty binder when the manager has none and no accomplishments', () => {
    const v3: Record<string, unknown> = {
      schemaVersion: 3,
      clubs: [],
      fixtures: [],
      manager: { name: 'Howe', clubId: 'newcastle', accomplishments: [] },
      gameSeed: 'seed',
      seasonNumber: 1,
    };
    const migrated = migrateSaveData(v3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mgr = migrated.manager as any;
    expect(mgr.binder).toEqual([]);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('synthesises manager-moment cards from accomplishments', () => {
    const v3: Record<string, unknown> = {
      schemaVersion: 3,
      clubs: [],
      fixtures: [],
      manager: {
        name: 'Howe',
        clubId: 'newcastle',
        accomplishments: [
          { id: 'a1', season: 1, clubId: 'newcastle', type: 'club-hired', headline: 'Took charge at Newcastle' },
          { id: 'a2', season: 3, clubId: 'newcastle', type: 'league-title', headline: 'Won the Premier League with Newcastle' },
          { id: 'a3', season: 4, clubId: 'newcastle', type: 'league-title', headline: 'Won the Premier League with Newcastle' },
          { id: 'a4', season: 3, clubId: 'newcastle', type: 'fa-cup', headline: 'Won the FA Cup with Newcastle' },
          { id: 'a5', season: 5, clubId: 'newcastle', type: 'milestone-games', headline: '100 career games managed' },
        ],
      },
      gameSeed: 'seed',
      seasonNumber: 5,
    };
    const migrated = migrateSaveData(v3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const binder = (migrated.manager as any).binder as Array<{ kind: string; type: string; season: number }>;
    expect(binder).toHaveLength(5);
    // First-title vs subsequent: count-aware
    const titleTypes = binder.filter((c) => c.type === 'first-title' || c.type === 'league-title');
    expect(titleTypes).toHaveLength(2);
    expect(titleTypes[0].type).toBe('first-title');
    expect(titleTypes[1].type).toBe('league-title');
    // FA Cup is first → first-cup
    expect(binder.find((c) => c.type === 'first-cup')).toBeTruthy();
    // First hire & milestone are present
    expect(binder.find((c) => c.type === 'first-hire')).toBeTruthy();
    expect(binder.find((c) => c.type === 'milestone-games')).toBeTruthy();
  });

  it('preserves an existing binder', () => {
    const existing = [{ kind: 'manager-moment', id: 'mm-x', type: 'first-title', title: 't', subtitle: 's', season: 1, clubId: 'arsenal', mintedAt: 1 }];
    const v3: Record<string, unknown> = {
      schemaVersion: 3,
      clubs: [],
      fixtures: [],
      manager: { name: 'Arteta', clubId: 'arsenal', accomplishments: [], binder: existing },
      gameSeed: 'seed',
      seasonNumber: 1,
    };
    const migrated = migrateSaveData(v3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((migrated.manager as any).binder).toBe(existing);
  });

  it('is a no-op for managers that are null or absent', () => {
    const v3: Record<string, unknown> = {
      schemaVersion: 3,
      clubs: [],
      fixtures: [],
      manager: null,
      gameSeed: 'seed',
      seasonNumber: 1,
    };
    const migrated = migrateSaveData(v3);
    expect(migrated.manager).toBeNull();
  });
});
