import { describe, it, expect } from 'vitest';
import {
  computeTeamModifiers,
  computeAgingModifiers,
  getEffectivePlayer,
  EMPTY_TEAM_MODS,
  EMPTY_AGING_MODS,
} from '@/engine/modifierEffects';
import type { ActiveModifier, Player } from '@/types/entities';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Test Player',
    nationality: 'english',
    age: 25,
    position: 'ST',
    stats: { ATK: 70, DEF: 50, MOV: 70, PWR: 65, MEN: 60, SKL: 70 },
    overall: 75,
    trait: 'Leader',
    form: 0,
    injured: false,
    injuryWeeks: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    value: 10,
    acquiredThisWindow: false,
    isTemporary: false,
    highPotential: false,
    earlyPeaker: false,
    seasonsAtClub: 1,
    formHistory: [],
    monthlyGoals: [],
    monthlyAssists: [],
    statsSnapshotSeasonStart: { ATK: 70, DEF: 50, MOV: 70, PWR: 65, MEN: 60, SKL: 70 },
    ...overrides,
  };
}

let modCounter = 0;
function makeMod(effect: Record<string, number>, opts: { targetClubId?: string; targetPlayerId?: string } = {}): ActiveModifier {
  modCounter++;
  return {
    id: `mod-${modCounter}`,
    description: 'test',
    effect,
    expiresAt: 'september',
    targetClubId: opts.targetClubId ?? 'club-a',
    targetPlayerId: opts.targetPlayerId,
  };
}

describe('computeTeamModifiers', () => {
  it('returns empty struct when no modifiers', () => {
    expect(computeTeamModifiers([], 'club-a')).toEqual(EMPTY_TEAM_MODS);
    expect(computeTeamModifiers(undefined, 'club-a')).toEqual(EMPTY_TEAM_MODS);
  });

  it('aggregates TSS / TSS_HOME / TSS_UNDERDOG / DERBY_CHAOS effects', () => {
    const mods = [
      makeMod({ TSS: 2 }),
      makeMod({ TSS: -1 }),
      makeMod({ TSS_HOME: 1 }),
      makeMod({ TSS_UNDERDOG: 2 }),
      makeMod({ DERBY_CHAOS: 1 }),
      makeMod({ FORM: -1 }),
    ];
    const out = computeTeamModifiers(mods, 'club-a');
    expect(out.tssBonus).toBe(1);
    expect(out.tssHomeBonus).toBe(1);
    expect(out.tssUnderdogBonus).toBe(2);
    expect(out.derbyChaosBonus).toBe(1);
    expect(out.squadFormShift).toBe(-1);
    expect(out.formationDoubleActive).toBe(false);
  });

  it('flips formationDoubleActive when FORMATION_DOUBLE > 0', () => {
    const mods = [makeMod({ FORMATION_DOUBLE: 1 })];
    expect(computeTeamModifiers(mods, 'club-a').formationDoubleActive).toBe(true);
  });

  it('ignores modifiers targeting other clubs', () => {
    const mods = [makeMod({ TSS: 5 }, { targetClubId: 'club-b' })];
    expect(computeTeamModifiers(mods, 'club-a').tssBonus).toBe(0);
  });

  it('skips player-targeted mods (those flow through getEffectivePlayer)', () => {
    const mods = [makeMod({ TSS: 3 }, { targetPlayerId: 'p1' })];
    expect(computeTeamModifiers(mods, 'club-a').tssBonus).toBe(0);
  });
});

describe('getEffectivePlayer', () => {
  it('returns the same player when no modifiers apply', () => {
    const p = makePlayer();
    const out = getEffectivePlayer(p, [], 'club-a');
    expect(out).toBe(p);
  });

  it('applies stat deltas and re-derives overall', () => {
    const p = makePlayer();
    const boostedMods = [makeMod({ ATK: 4 }, { targetPlayerId: 'p1' })];
    const out = getEffectivePlayer(p, boostedMods, 'club-a');
    expect(out.stats.ATK).toBe(74);

    // Re-derivation: a +4 ATK boost on a striker (position weights lean ATK)
    // should produce a higher position-weighted overall than the same player
    // with a -4 ATK debuff. We compare both against each other so the
    // assertion doesn't depend on the synthetic seed-player overall field.
    const debuffedMods = [makeMod({ ATK: -4 }, { targetPlayerId: 'p1' })];
    const debuffed = getEffectivePlayer(p, debuffedMods, 'club-a');
    expect(out.overall).toBeGreaterThan(debuffed.overall);
    expect(out).not.toBe(p);
  });

  it('clamps stats to [1, 99]', () => {
    const p = makePlayer({ stats: { ATK: 97, DEF: 50, MOV: 70, PWR: 65, MEN: 60, SKL: 70 } });
    const mods = [makeMod({ ATK: 5 }, { targetPlayerId: 'p1' })];
    const out = getEffectivePlayer(p, mods, 'club-a');
    expect(out.stats.ATK).toBe(99);
  });

  it('applies FORM deltas and clamps to [-5, 5]', () => {
    const p = makePlayer({ form: 4 });
    const mods = [makeMod({ FORM: 3 }, { targetPlayerId: 'p1' })];
    const out = getEffectivePlayer(p, mods, 'club-a');
    expect(out.form).toBe(5);
  });

  it('applies club-wide stat mods (no targetPlayerId) to every player on that club', () => {
    const p = makePlayer();
    const mods = [makeMod({ MEN: 2 })];
    const out = getEffectivePlayer(p, mods, 'club-a');
    expect(out.stats.MEN).toBe(62);
  });

  it('ignores modifiers targeting other players', () => {
    const p = makePlayer({ id: 'p1' });
    const mods = [makeMod({ ATK: 4 }, { targetPlayerId: 'p99' })];
    const out = getEffectivePlayer(p, mods, 'club-a');
    expect(out).toBe(p);
  });
});

describe('computeAgingModifiers', () => {
  it('returns empty struct when no modifiers', () => {
    expect(computeAgingModifiers([], 'club-a')).toEqual(EMPTY_AGING_MODS);
  });

  it('aggregates DEV_BONUS and YOUTH_BOOST', () => {
    const mods = [
      makeMod({ DEV_BONUS: 1 }),
      makeMod({ DEV_BONUS: 1 }),
      makeMod({ YOUTH_BOOST: 3 }),
    ];
    const out = computeAgingModifiers(mods, 'club-a');
    expect(out.devBonus).toBe(2);
    expect(out.youthBoost).toBe(3);
  });

  it('ignores modifiers targeting other clubs', () => {
    const mods = [makeMod({ DEV_BONUS: 2 }, { targetClubId: 'club-b' })];
    expect(computeAgingModifiers(mods, 'club-a').devBonus).toBe(0);
  });
});
