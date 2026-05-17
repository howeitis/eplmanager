import { describe, it, expect } from 'vitest';
import {
  mintPlayerCard,
  mintManagerMoment,
  playerCardId,
  playerCards,
  managerMomentCards,
} from '@/utils/binder';
import type { Player, BinderCard } from '@/types/entities';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Saka',
    nationality: 'English',
    age: 24,
    position: 'WG',
    stats: { ATK: 80, DEF: 50, MOV: 88, PWR: 70, MEN: 75, SKL: 85 },
    overall: 84,
    trait: 'Flair',
    form: 2,
    injured: false,
    injuryWeeks: 0,
    goals: 12,
    assists: 9,
    cleanSheets: 0,
    value: 90,
    acquiredThisWindow: false,
    isTemporary: false,
    highPotential: true,
    earlyPeaker: false,
    seasonsAtClub: 3,
    formHistory: [1, 2, 2],
    monthlyGoals: [3, 4, 5],
    monthlyAssists: [2, 3, 4],
    statsSnapshotSeasonStart: { ATK: 80, DEF: 50, MOV: 88, PWR: 70, MEN: 75, SKL: 85 },
    ...overrides,
  };
}

describe('playerCardId', () => {
  it('produces a stable id for the same player/season/type triple', () => {
    expect(playerCardId('saka', 3, 'signing')).toBe('binder-saka-s3-signing');
    expect(playerCardId('saka', 3, 'signing')).toBe(playerCardId('saka', 3, 'signing'));
  });

  it('differs by type', () => {
    expect(playerCardId('saka', 3, 'signing')).not.toBe(playerCardId('saka', 3, 'retirement'));
  });
});

describe('mintPlayerCard', () => {
  it('snapshots the player so later mutations do not leak in', () => {
    const player = makePlayer();
    const card = mintPlayerCard(player, 'arsenal', 3, 'signing', { fee: 80 });

    player.goals = 999;
    player.stats.ATK = 99;
    player.trophiesWon = [{ season: 3, type: 'league' }];

    // Card kept the original goals + stats — the live mutation didn't leak.
    expect(card.player.goals).toBe(12);
    expect(card.player.stats.ATK).toBe(80);
    expect(card.fee).toBe(80);
    expect(card.type).toBe('signing');
    expect(card.clubId).toBe('arsenal');
    expect(card.season).toBe(3);
  });

  it('produces a stable id', () => {
    const a = mintPlayerCard(makePlayer(), 'arsenal', 3, 'signing');
    const b = mintPlayerCard(makePlayer(), 'arsenal', 3, 'signing');
    expect(a.id).toBe(b.id);
  });
});

describe('mintManagerMoment', () => {
  it('builds a manager-moment card with default id', () => {
    const card = mintManagerMoment({
      type: 'first-title',
      title: 'Champions',
      subtitle: 'First title.',
      season: 4,
      clubId: 'newcastle',
    });
    expect(card.kind).toBe('manager-moment');
    expect(card.id).toBe('mm-first-title-newcastle-s4');
    expect(card.season).toBe(4);
  });

  it('respects a user-provided id and accent', () => {
    const card = mintManagerMoment({
      type: 'milestone-games',
      id: 'mm-milestone-100-newcastle-s5',
      title: '100 Games',
      subtitle: '',
      season: 5,
      clubId: 'newcastle',
      accentColor: '#abc123',
    });
    expect(card.id).toBe('mm-milestone-100-newcastle-s5');
    expect(card.accentColor).toBe('#abc123');
  });
});

describe('selectors', () => {
  it('splits player and moment cards', () => {
    const cards: BinderCard[] = [
      mintPlayerCard(makePlayer(), 'arsenal', 3, 'signing'),
      mintManagerMoment({ type: 'first-title', title: 't', subtitle: 's', season: 4, clubId: 'arsenal' }),
      mintPlayerCard(makePlayer({ id: 'p2' }), 'arsenal', 4, 'tots'),
    ];
    expect(playerCards(cards)).toHaveLength(2);
    expect(managerMomentCards(cards)).toHaveLength(1);
  });

  it('handles undefined binder', () => {
    expect(playerCards(undefined)).toEqual([]);
    expect(managerMomentCards(undefined)).toEqual([]);
  });
});
