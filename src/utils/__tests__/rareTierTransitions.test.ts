import { describe, it, expect } from 'vitest';
import { detectRareTierTransitions, type RareTierPreState } from '../rareTierTransitions';
import type { Player, ManagerMomentCard } from '@/types/entities';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Saka',
    nationality: 'English',
    age: 21,
    position: 'WG',
    stats: { ATK: 80, DEF: 50, MOV: 85, PWR: 70, MEN: 75, SKL: 82 },
    overall: 82,
    trait: 'Flair',
    form: 0,
    injured: false,
    injuryWeeks: 0,
    goals: 12,
    assists: 9,
    cleanSheets: 0,
    value: 60,
    acquiredThisWindow: false,
    isTemporary: false,
    highPotential: true,
    earlyPeaker: false,
    seasonsAtClub: 3,
    formHistory: [],
    monthlyGoals: [],
    monthlyAssists: [],
    statsSnapshotSeasonStart: { ATK: 80, DEF: 50, MOV: 85, PWR: 70, MEN: 75, SKL: 82 },
    ...overrides,
  };
}

function pre(state: Partial<RareTierPreState>): Map<string, RareTierPreState> {
  return new Map([['p1', state]]);
}

function typesOf(cards: { kind: string; type?: string }[]): string[] {
  return cards.filter((c) => c.kind === 'manager-moment').map((c) => (c as ManagerMomentCard).type);
}

describe('detectRareTierTransitions', () => {
  it('fires Starboy when a u21 player crosses into 82+ for the first time', () => {
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ age: 21, overall: 82 })],
      playerClubId: 'arsenal',
      seasonNumber: 3,
      pre: pre({ age: 20, overall: 79 }),
    });
    expect(typesOf(cards)).toContain('starboy-emerged');
  });

  it('does not fire Starboy if the player was already a Starboy', () => {
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ age: 22, overall: 84 })],
      playerClubId: 'arsenal',
      seasonNumber: 3,
      pre: pre({ age: 21, overall: 82 }),
    });
    expect(typesOf(cards)).not.toContain('starboy-emerged');
  });

  it('does not fire Starboy if the player aged out of u21', () => {
    // 22 with 84 OVR — too old for Starboy even though numerically above 82.
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ age: 22, overall: 84 })],
      playerClubId: 'arsenal',
      seasonNumber: 3,
      pre: pre({ age: 21, overall: 80 }),
    });
    expect(typesOf(cards)).not.toContain('starboy-emerged');
  });

  it('fires Starboy for a freshly-graduated youth player at 82+', () => {
    // No pre-snapshot — fresh youth intake. Should still earn Starboy.
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ id: 'p2', age: 17, overall: 82 })],
      playerClubId: 'arsenal',
      seasonNumber: 3,
      pre: new Map(),
    });
    expect(typesOf(cards)).toContain('starboy-emerged');
  });

  it('fires Icon when a player crosses 90 OVR for the first time', () => {
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ overall: 90 })],
      playerClubId: 'arsenal',
      seasonNumber: 5,
      pre: pre({ overall: 89, age: 27 }),
    });
    expect(typesOf(cards)).toContain('icon-arrived');
  });

  it('does not fire Icon if the player was already 90+', () => {
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ overall: 91 })],
      playerClubId: 'arsenal',
      seasonNumber: 5,
      pre: pre({ overall: 90, age: 27 }),
    });
    expect(typesOf(cards)).not.toContain('icon-arrived');
  });

  it('fires Legend when career trophies hit 8 for the first time', () => {
    const cards = detectRareTierTransitions({
      postAgingRoster: [
        makePlayer({
          trophiesWon: Array.from({ length: 8 }, (_, i) => ({ season: i + 1, type: 'league' as const })),
        }),
      ],
      playerClubId: 'arsenal',
      seasonNumber: 8,
      pre: pre({ overall: 82, age: 30, trophies: 7 }),
    });
    expect(typesOf(cards)).toContain('legend-status');
  });

  it('does not fire Legend if the player was already at 8+ trophies', () => {
    const cards = detectRareTierTransitions({
      postAgingRoster: [
        makePlayer({
          trophiesWon: Array.from({ length: 9 }, (_, i) => ({ season: i + 1, type: 'league' as const })),
        }),
      ],
      playerClubId: 'arsenal',
      seasonNumber: 9,
      pre: pre({ overall: 82, age: 30, trophies: 8 }),
    });
    expect(typesOf(cards)).not.toContain('legend-status');
  });

  it('fires nothing for ordinary tier-band crossings', () => {
    // Bronze (64) → Silver (76) — historical "Riser" territory. Now no card.
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ overall: 76, age: 23 })],
      playerClubId: 'arsenal',
      seasonNumber: 2,
      pre: pre({ overall: 64, age: 22 }),
    });
    expect(cards).toHaveLength(0);
  });

  it('can fire multiple transitions on the same player in one season', () => {
    // Edge case: a player both ages out of u21 starboy AND crosses 90.
    // Should still earn Icon (and not Starboy, since they're 22).
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ age: 22, overall: 90 })],
      playerClubId: 'arsenal',
      seasonNumber: 4,
      pre: pre({ overall: 88, age: 21 }),
    });
    expect(typesOf(cards)).toEqual(['icon-arrived']);
  });

  it('uses stable ids per player+season so re-running is idempotent', () => {
    const args = {
      postAgingRoster: [makePlayer({ age: 21, overall: 82 })],
      playerClubId: 'arsenal',
      seasonNumber: 3,
      pre: pre({ age: 20, overall: 79 }),
    };
    const first = detectRareTierTransitions(args);
    const second = detectRareTierTransitions(args);
    expect(first[0].id).toBe(second[0].id);
  });

  it('skips temporary fill-in players', () => {
    const cards = detectRareTierTransitions({
      postAgingRoster: [makePlayer({ age: 21, overall: 82, isTemporary: true })],
      playerClubId: 'arsenal',
      seasonNumber: 3,
      pre: pre({ age: 20, overall: 79 }),
    });
    expect(cards).toHaveLength(0);
  });
});
