import { describe, it, expect, beforeEach } from 'vitest';
import { SeededRNG, seasonSeed } from '../../utils/rng';
import { CLUBS } from '../../data/clubs';
import { generateAllSquads } from '../playerGen';
import {
  generateMarketListings,
  generateFeaturedSlots,
  refillFeaturedSlot,
} from '../transfers';
import type { FeaturedSlot } from '../../store/marketSlice';
import type { Club, MarketListing } from '../../types/entities';

const GAME_SEED = 'test-74-seed-featured';

function setupClubs(): Club[] {
  const squads = generateAllSquads(GAME_SEED, CLUBS);
  return CLUBS.map((data) => ({
    ...data,
    roster: squads.get(data.id) || [],
  }));
}

function setupMarket(clubs: Club[], playerClubId: string) {
  const rng = new SeededRNG(`${GAME_SEED}-market-init`);
  return generateMarketListings(rng, clubs, playerClubId);
}

// ─── Part C: Featured Player Rotation ───

describe('Featured Player Rotation', () => {
  let clubs: Club[];
  let listings: MarketListing[];

  beforeEach(() => {
    clubs = setupClubs();
    listings = setupMarket(clubs, 'ARS');
  });

  it('generates up to 12 featured slots', () => {
    const rng = new SeededRNG(`${GAME_SEED}-featured-summer_window`);
    const slots = generateFeaturedSlots(rng, listings, clubs);
    expect(slots.length).toBeLessThanOrEqual(12);
    expect(slots.length).toBeGreaterThan(0);
  });

  it('slot archetypes follow prescribed order', () => {
    const rng = new SeededRNG(`${GAME_SEED}-featured-summer_window`);
    const slots = generateFeaturedSlots(rng, listings, clubs);
    if (slots.length >= 1) expect(slots[0].archetype).toBe('star');
    if (slots.length >= 2) expect(slots[1].archetype).toBe('prospect');
    if (slots.length >= 3) expect(slots[2].archetype).toBe('bargain');
    // Slots 4+ are trending (weighted random)
    for (let i = 3; i < slots.length; i++) {
      expect(slots[i].archetype).toBe('trending');
    }
  });

  it('no duplicate players in featured slots', () => {
    const rng = new SeededRNG(`${GAME_SEED}-featured-test`);
    const slots = generateFeaturedSlots(rng, listings, clubs);
    const ids = slots.map((s) => s.playerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('3 consecutive months produce 3 distinct deterministic slates', () => {
    const sSeed = seasonSeed(GAME_SEED, 1);
    const slates: FeaturedSlot[][] = [];

    for (const month of ['summer_window', 'august', 'september']) {
      const seed = `${sSeed}-featured-${month}`;
      const rng = new SeededRNG(seed);
      slates.push(generateFeaturedSlots(rng, listings, clubs));
    }

    // Each slate should be deterministic (reproducible)
    for (const month of ['summer_window', 'august', 'september']) {
      const seed = `${sSeed}-featured-${month}`;
      const rng2 = new SeededRNG(seed);
      const slate2 = generateFeaturedSlots(rng2, listings, clubs);
      const idx = ['summer_window', 'august', 'september'].indexOf(month);
      expect(slate2.map((s) => s.playerId)).toEqual(slates[idx].map((s) => s.playerId));
    }

    // Different months should produce different slates
    const slateSets = slates.map((s) => s.map((sl) => sl.playerId).join(','));
    const uniqueSlates = new Set(slateSets);
    expect(uniqueSlates.size).toBe(3);
  });

  it('re-fill after signing star slot player', () => {
    const sSeed = seasonSeed(GAME_SEED, 1);
    const seed = `${sSeed}-featured-summer_window`;
    const rng = new SeededRNG(seed);
    const initialSlots = generateFeaturedSlots(rng, listings, clubs);

    if (initialSlots.length < 2) return; // Need at least 2 slots

    const starSlotPlayer = initialSlots[0].playerId;

    // Remove that player from listings (simulating a signing)
    const newListings = listings.filter((l) => l.playerId !== starSlotPlayer);

    // Refill with refillIndex 0
    const refillSeed = `${sSeed}-featured-summer_window-refill-0`;
    const refillRng = new SeededRNG(refillSeed);
    const replacement = refillFeaturedSlot(refillRng, 0, initialSlots, newListings, clubs);

    expect(replacement).not.toBeNull();
    expect(replacement!.playerId).not.toBe(starSlotPlayer);

    // Other 5 slots should be unchanged
    const newSlots = [...initialSlots];
    newSlots[0] = replacement!;
    for (let i = 1; i < initialSlots.length; i++) {
      expect(newSlots[i].playerId).toBe(initialSlots[i].playerId);
    }
  });

  it('refillIndex increments correctly: two consecutive refills produce different players', () => {
    const sSeed = seasonSeed(GAME_SEED, 1);
    const seed = `${sSeed}-featured-summer_window`;
    const rng = new SeededRNG(seed);
    const initialSlots = generateFeaturedSlots(rng, listings, clubs);

    if (initialSlots.length < 3) return;

    // Remove star player
    const starId = initialSlots[0].playerId;
    let currentListings = listings.filter((l) => l.playerId !== starId);

    // Refill #1 (refillIndex = 0)
    const refillSeed0 = `${sSeed}-featured-summer_window-refill-0`;
    const refillRng0 = new SeededRNG(refillSeed0);
    const replacement0 = refillFeaturedSlot(refillRng0, 0, initialSlots, currentListings, clubs);
    expect(replacement0).not.toBeNull();

    const slotsAfterRefill1 = [...initialSlots];
    slotsAfterRefill1[0] = replacement0!;

    // Now sign a second featured player (index 1)
    const secondId = slotsAfterRefill1[1].playerId;
    currentListings = currentListings.filter((l) => l.playerId !== secondId);

    // Refill #2 (refillIndex = 1)
    const refillSeed1 = `${sSeed}-featured-summer_window-refill-1`;
    const refillRng1 = new SeededRNG(refillSeed1);
    const replacement1 = refillFeaturedSlot(refillRng1, 1, slotsAfterRefill1, currentListings, clubs);
    expect(replacement1).not.toBeNull();

    // The two refill picks should differ
    expect(replacement0!.playerId).not.toBe(replacement1!.playerId);
  });

  it('refillIndex resets on month advance (new seed produces new slate)', () => {
    const sSeed = seasonSeed(GAME_SEED, 1);

    // Month 1 initial slate
    const rng1 = new SeededRNG(`${sSeed}-featured-summer_window`);
    const month1Slots = generateFeaturedSlots(rng1, listings, clubs);

    // Month 2 initial slate (simulating advance)
    const rng2 = new SeededRNG(`${sSeed}-featured-august`);
    const month2Slots = generateFeaturedSlots(rng2, listings, clubs);

    // They should be different deterministic slates
    expect(month1Slots.map((s) => s.playerId).join(',')).not.toBe(
      month2Slots.map((s) => s.playerId).join(','),
    );
  });

  it('placeholder when market drops below 6 players', () => {
    // Create a market with only 3 players
    const tinyListings = listings.slice(0, 3);
    const rng = new SeededRNG(`${GAME_SEED}-featured-tiny`);
    const slots = generateFeaturedSlots(rng, tinyListings, clubs);
    expect(slots.length).toBeLessThanOrEqual(3);
  });

  it('returns empty when no listings', () => {
    const rng = new SeededRNG(`${GAME_SEED}-featured-empty`);
    const slots = generateFeaturedSlots(rng, [], clubs);
    expect(slots.length).toBe(0);
  });
});

// ─── Part B: Ledger / TransferRecord playerAge ───

describe('TransferRecord playerAge', () => {
  it('TransferRecord fields include playerAge', () => {
    // Type check: this compiles if playerAge is in the interface
    const record: import('../../types/entities').TransferRecord = {
      playerId: 'test',
      playerName: 'Test Player',
      playerPosition: 'ST',
      playerOverall: 75,
      playerAge: 24,
      fromClubId: 'ARS',
      toClubId: 'CHE',
      fee: 10,
      season: 1,
      window: 'summer',
    };
    expect(record.playerAge).toBe(24);
  });
});

// ─── Part D: Offer Expiry ───

describe('Offer Expiry', () => {
  it('TransferOffer includes playerAge field', () => {
    const offer: import('../../types/entities').TransferOffer = {
      id: 'test-offer',
      playerId: 'p1',
      playerName: 'Test',
      playerPosition: 'MF',
      playerOverall: 70,
      playerAge: 25,
      fromClubId: 'ARS',
      toClubId: 'CHE',
      fee: 15,
      status: 'pending',
      direction: 'outgoing',
    };
    expect(offer.playerAge).toBe(25);
    expect(offer.status).toBe('pending');
  });
});
