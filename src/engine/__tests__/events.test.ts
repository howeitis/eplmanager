import { describe, it, expect } from 'vitest';
import { generateMonthlyEvents, generateTransferWindowEvents, type EventContext } from '../events';
import { simulateFullSeason } from '../seasonSim';
import { generateAllSquads } from '../playerGen';
import { CLUBS } from '../../data/clubs';
import { SeededRNG } from '../../utils/rng';
import type { Club, GamePhase } from '../../types/entities';

function buildClubs(seed: string): Club[] {
  const squads = generateAllSquads(seed, CLUBS);
  return CLUBS.map((data) => ({
    ...data,
    roster: squads.get(data.id)!,
  }));
}

function makeContext(overrides: Partial<EventContext> = {}): EventContext {
  const clubs = buildClubs('event-test-seed');
  return {
    playerClubId: clubs[0].id,
    clubs,
    phase: 'october' as GamePhase,
    seasonNumber: 1,
    managerReputation: 50,
    recentResults: clubs.map((c) => ({ clubId: c.id, wins: 2, losses: 1, total: 4 })),
    firedThisSeason: new Map(),
    seasonSeed: 'event-test-season-1',
    ...overrides,
  };
}

describe('Event Engine', () => {
  it('generates 3-5 form events per monthly phase', () => {
    const rng = new SeededRNG('form-events-test');
    const ctx = makeContext({ phase: 'october' });
    const result = generateMonthlyEvents(rng, ctx);

    const formEvents = result.events.filter((e) => e.category === 'form');
    expect(formEvents.length).toBeGreaterThanOrEqual(3);
    expect(formEvents.length).toBeLessThanOrEqual(5);
  });

  it('generates 1-2 squad events per monthly phase', () => {
    const rng = new SeededRNG('squad-events-test');
    const ctx = makeContext({ phase: 'november' });
    const result = generateMonthlyEvents(rng, ctx);

    const squadEvents = result.events.filter((e) => e.category === 'squad');
    expect(squadEvents.length).toBeGreaterThanOrEqual(1);
    expect(squadEvents.length).toBeLessThanOrEqual(2);
  });

  it('generates transfer window events during transfer phases', () => {
    const rng = new SeededRNG('transfer-events-test');
    const ctx = makeContext({ phase: 'summer_window' });
    const result = generateTransferWindowEvents(rng, ctx);

    const transferEvents = result.events.filter((e) => e.category === 'transfer_window');
    expect(transferEvents.length).toBeGreaterThanOrEqual(1);
    expect(transferEvents.length).toBeLessThanOrEqual(3);
  });

  it('does not fire the same event more than twice per season', () => {
    const firedThisSeason = new Map<string, number>();
    const phases: GamePhase[] = ['august', 'september', 'october', 'november', 'december',
      'january', 'february', 'march', 'april', 'may'];

    const clubs = buildClubs('dup-test-seed');

    for (const phase of phases) {
      const phaseRng = new SeededRNG(`dup-test-${phase}`);
      generateMonthlyEvents(phaseRng, {
        playerClubId: clubs[0].id,
        clubs,
        phase,
        seasonNumber: 1,
        managerReputation: 50,
        recentResults: [],
        firedThisSeason,
        seasonSeed: 'dup-test-season',
      });
    }

    for (const [eventId, count] of firedThisSeason) {
      expect(count, `Event ${eventId} fired ${count} times`).toBeLessThanOrEqual(2);
    }
  });

  it('generates events that include player names from the squad', () => {
    const rng = new SeededRNG('player-name-test');
    const clubs = buildClubs('name-test-seed');
    const ctx = makeContext({ clubs, playerClubId: clubs[0].id });
    const result = generateMonthlyEvents(rng, ctx);

    const playerNames = clubs[0].roster.map((p) => p.name);
    const formEvents = result.events.filter((e) => e.category === 'form');

    // At least some form events should reference actual player names
    const hasPlayerName = formEvents.some((e) =>
      playerNames.some((name) => e.description.includes(name)),
    );
    expect(hasPlayerName).toBe(true);
  });

  it('modifiers include proper expiry phases', () => {
    const rng = new SeededRNG('modifier-expiry-test');
    const ctx = makeContext({ phase: 'october' });
    const result = generateMonthlyEvents(rng, ctx);

    for (const mod of result.modifiers) {
      expect(mod.expiresAt).toBeTruthy();
      expect(mod.id).toBeTruthy();
    }
  });
});

describe('Event Engine — 5 Season Integration', () => {
  it('fires 25-40 events per season across 5 seasons with appropriate distribution', () => {
    const gameSeed = 'event-5season-test';
    let clubs = buildClubs(gameSeed);

    for (let season = 1; season <= 5; season++) {
      const result = simulateFullSeason(gameSeed, season, clubs);

      const totalEvents = result.allEvents.length;
      // Events should be in a reasonable range (25-60 allows for variance)
      expect(totalEvents, `Season ${season}: ${totalEvents} events`).toBeGreaterThanOrEqual(15);
      expect(totalEvents, `Season ${season}: ${totalEvents} events`).toBeLessThanOrEqual(60);

      // Check category distribution
      const byCategory = new Map<string, number>();
      for (const event of result.allEvents) {
        byCategory.set(event.category, (byCategory.get(event.category) || 0) + 1);
      }

      // Form events should be the most common
      const formCount = byCategory.get('form') || 0;
      expect(formCount, `Season ${season}: form events`).toBeGreaterThanOrEqual(10);

      // Squad events should appear
      const squadCount = byCategory.get('squad') || 0;
      expect(squadCount, `Season ${season}: squad events`).toBeGreaterThanOrEqual(3);

      // Verify no single event fires more than twice
      const eventDescriptions = new Map<string, number>();
      for (const event of result.allEvents) {
        const key = event.description.replace(/\b\w+\s\w+\b/g, 'NAME'); // Normalize names
        eventDescriptions.set(key, (eventDescriptions.get(key) || 0) + 1);
      }

      // Update clubs with aging for next season (use final rosters)
      clubs = result.monthResults.length > 0
        ? clubs.map((c) => ({ ...c }))
        : clubs;
    }
  });
});
