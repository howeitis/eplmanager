import { describe, it, expect, beforeEach } from 'vitest';
import { SeededRNG, seasonSeed } from '../../utils/rng';
import { CLUBS } from '../../data/clubs';
import { generateAllSquads } from '../playerGen';
import {
  generateMarketListings,
  generateFeaturedSlots,
  refillFeaturedSlot,
  refreshPlayerValue,
} from '../transfers';
import { applyMarketFilters, countActiveFilters } from '../../components/transfers/MarketBoard';
import { DEFAULT_MARKET_FILTERS, type MarketFilters, type FeaturedSlot } from '../../store/marketSlice';
import type { Club, Player, MarketListing } from '../../types/entities';

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

function buildListingsWithPlayers(listings: MarketListing[], clubs: Club[]) {
  return listings
    .map((listing) => {
      const club = clubs.find((c) => c.id === listing.clubId);
      const player = club?.roster.find((p) => p.id === listing.playerId);
      if (!player || !club) return null;
      return { player, club, listing };
    })
    .filter(Boolean) as { player: Player; club: Club; listing: MarketListing }[];
}

// ─── Part A: Filters ───

describe('Market Filters', () => {
  let clubs: Club[];
  let listings: MarketListing[];
  let listingsWithPlayers: { player: Player; club: Club; listing: MarketListing }[];

  beforeEach(() => {
    clubs = setupClubs();
    listings = setupMarket(clubs, 'ARS');
    listingsWithPlayers = buildListingsWithPlayers(listings, clubs);
  });

  it('returns all players with default filters', () => {
    const result = applyMarketFilters(listingsWithPlayers, DEFAULT_MARKET_FILTERS, 999);
    expect(result.length).toBe(listingsWithPlayers.length);
  });

  it('position filter works for ST', () => {
    const filters: MarketFilters = { ...DEFAULT_MARKET_FILTERS, positions: ['ST'] };
    const result = applyMarketFilters(listingsWithPlayers, filters, 999);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.player.position === 'ST')).toBe(true);
  });

  it('multi-position filter works for ST and MF', () => {
    const filters: MarketFilters = { ...DEFAULT_MARKET_FILTERS, positions: ['ST', 'MF'] };
    const result = applyMarketFilters(listingsWithPlayers, filters, 999);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.player.position === 'ST' || r.player.position === 'MF')).toBe(true);
  });

  it('age range filter limits results', () => {
    const filters: MarketFilters = { ...DEFAULT_MARKET_FILTERS, ageMin: 22, ageMax: 28 };
    const result = applyMarketFilters(listingsWithPlayers, filters, 999);
    expect(result.every((r) => r.player.age >= 22 && r.player.age <= 28)).toBe(true);
  });

  it('overall range filter limits results', () => {
    const filters: MarketFilters = { ...DEFAULT_MARKET_FILTERS, overallMin: 65, overallMax: 75 };
    const result = applyMarketFilters(listingsWithPlayers, filters, 999);
    expect(result.every((r) => r.player.overall >= 65 && r.player.overall <= 75)).toBe(true);
  });

  it('max price filter works', () => {
    const filters: MarketFilters = { ...DEFAULT_MARKET_FILTERS, maxPrice: 10 };
    const result = applyMarketFilters(listingsWithPlayers, filters, 999);
    expect(result.every((r) => r.listing.askingPrice <= 10)).toBe(true);
    expect(result.length).toBeLessThan(listingsWithPlayers.length);
  });

  it('stat threshold filters correctly', () => {
    const filters: MarketFilters = {
      ...DEFAULT_MARKET_FILTERS,
      statThresholds: { ATK: 75, DEF: 0, MOV: 0, PWR: 0, MEN: 0, SKL: 0 },
    };
    const result = applyMarketFilters(listingsWithPlayers, filters, 999);
    expect(result.every((r) => r.player.stats.ATK >= 75)).toBe(true);
  });

  it('name search is case-insensitive', () => {
    // Pick a real player name from the listings
    if (listingsWithPlayers.length === 0) return;
    const targetName = listingsWithPlayers[0].player.name;
    const partial = targetName.slice(0, 3).toLowerCase();
    const filters: MarketFilters = { ...DEFAULT_MARKET_FILTERS, nameSearch: partial };
    const result = applyMarketFilters(listingsWithPlayers, filters, 999);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.player.name.toLowerCase().includes(partial))).toBe(true);
  });

  it('combined filters: ST, age 22-28, min ATK 75, max price £30M', () => {
    const filters: MarketFilters = {
      ...DEFAULT_MARKET_FILTERS,
      positions: ['ST'],
      ageMin: 22,
      ageMax: 28,
      maxPrice: 30,
      statThresholds: { ATK: 75, DEF: 0, MOV: 0, PWR: 0, MEN: 0, SKL: 0 },
    };
    const result = applyMarketFilters(listingsWithPlayers, filters, 999);
    for (const r of result) {
      expect(r.player.position).toBe('ST');
      expect(r.player.age).toBeGreaterThanOrEqual(22);
      expect(r.player.age).toBeLessThanOrEqual(28);
      expect(r.player.stats.ATK).toBeGreaterThanOrEqual(75);
      expect(r.listing.askingPrice).toBeLessThanOrEqual(30);
    }
  });

  it('countActiveFilters returns 0 for defaults', () => {
    expect(countActiveFilters(DEFAULT_MARKET_FILTERS)).toBe(0);
  });

  it('countActiveFilters counts non-default filters', () => {
    const filters: MarketFilters = {
      ...DEFAULT_MARKET_FILTERS,
      positions: ['ST'],
      ageMin: 20,
      nameSearch: 'test',
    };
    expect(countActiveFilters(filters)).toBe(3);
  });
});

// ─── Part C: Featured Player Rotation ───

describe('Featured Player Rotation', () => {
  let clubs: Club[];
  let listings: MarketListing[];

  beforeEach(() => {
    clubs = setupClubs();
    listings = setupMarket(clubs, 'ARS');
  });

  it('generates up to 6 featured slots', () => {
    const rng = new SeededRNG(`${GAME_SEED}-featured-summer_window`);
    const slots = generateFeaturedSlots(rng, listings, clubs);
    expect(slots.length).toBeLessThanOrEqual(6);
    expect(slots.length).toBeGreaterThan(0);
  });

  it('slot archetypes follow prescribed order', () => {
    const rng = new SeededRNG(`${GAME_SEED}-featured-summer_window`);
    const slots = generateFeaturedSlots(rng, listings, clubs);
    if (slots.length >= 1) expect(slots[0].archetype).toBe('star');
    if (slots.length >= 2) expect(slots[1].archetype).toBe('prospect');
    if (slots.length >= 3) expect(slots[2].archetype).toBe('bargain');
    // Slots 4-6 are trending (weighted random)
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
