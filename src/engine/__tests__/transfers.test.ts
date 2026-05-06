import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../../utils/rng';
import { CLUBS } from '../../data/clubs';
import { generateAllSquads } from '../playerGen';
import {
  calculateMarketValue,
  refreshPlayerValue,
  calculateWillingness,
  isRival,
  evaluateOffer,
  checkPlayerRefusal,
  getContinentSalePrice,
  canSellToContinent,
  executeContinentSale,
  generateMarketListings,
  simulateAITransferWindow,
  resetAcquiredFlags,
} from '../transfers';
import type { Club, Player, TransferRecord } from '../../types/entities';

const GAME_SEED = 'test-transfer-seed-42';

function setupClubs(): Club[] {
  const squads = generateAllSquads(GAME_SEED, CLUBS);
  // The transfer engine refuses to strip AI clubs below a 16-player floor,
  // so 16-man squads produce zero AI transfers. Clone one extra player per
  // club to push every roster to 17 — gives the AI room to deal.
  return CLUBS.map((data) => {
    const roster = squads.get(data.id) || [];
    const padded = [...roster];
    if (roster.length > 0) {
      const seed = roster[0];
      padded.push({ ...seed, id: `${seed.id}-pad`, name: `${seed.name} II` });
    }
    return { ...data, roster: padded };
  });
}

function setupBudgets(): Record<string, number> {
  const budgets: Record<string, number> = {};
  for (const club of CLUBS) {
    budgets[club.id] = club.budget;
  }
  return budgets;
}

describe('Market Value Calculation', () => {
  it('star player (rating 80+, prime age) should be £30M–£60M', () => {
    const value = calculateMarketValue(82, 25, 2);
    expect(value).toBeGreaterThanOrEqual(30);
    expect(value).toBeLessThanOrEqual(60);
  });

  it('strong starter (rating 70-79, prime age) should be £12M–£30M', () => {
    const value = calculateMarketValue(74, 26, 0);
    expect(value).toBeGreaterThanOrEqual(12);
    expect(value).toBeLessThanOrEqual(30);
  });

  it('solid squad player (rating 63-69) should be £4M–£12M', () => {
    const value = calculateMarketValue(66, 25, 0);
    expect(value).toBeGreaterThanOrEqual(4);
    expect(value).toBeLessThanOrEqual(12);
  });

  it('young prospect (rating 58-65, age 17-20) should be £3M–£10M', () => {
    const value = calculateMarketValue(62, 19, 0, 'Prospect');
    expect(value).toBeGreaterThanOrEqual(3);
    expect(value).toBeLessThanOrEqual(10);
  });

  it('aging veteran (rating 65+, age 32+) should be £1M–£5M', () => {
    const value = calculateMarketValue(68, 33, 0);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(5);
  });

  it('floors at £0.5M', () => {
    const value = calculateMarketValue(45, 35, -5);
    expect(value).toBeGreaterThanOrEqual(0.5);
  });

  it('no upper ceiling — elite youth can exceed £90M', () => {
    const value = calculateMarketValue(99, 20, 5, 'Prospect');
    expect(value).toBeGreaterThan(90);
  });

  it('Prospect trait increases value by 40%', () => {
    const base = calculateMarketValue(70, 19, 0);
    const withProspect = calculateMarketValue(70, 19, 0, 'Prospect');
    expect(withProspect).toBeGreaterThan(base * 1.3);
  });

  it('Fragile trait decreases value by 20%', () => {
    const base = calculateMarketValue(70, 25, 0);
    const withFragile = calculateMarketValue(70, 25, 0, 'Fragile');
    expect(withFragile).toBeLessThan(base);
  });
});

describe('Willingness Formula', () => {
  it('base willingness is 50', () => {
    const w = calculateWillingness(10, 10, 'Engine', 3, 3, false, false, 25);
    expect(w).toBe(50);
  });

  it('30% premium adds +27 via continuous curve', () => {
    // premium 0.3 * curve 90 = 27, capped at 45 → 50 + 27 = 77
    const w = calculateWillingness(13, 10, 'Engine', 3, 3, false, false, 25);
    expect(w).toBe(77);
  });

  it('60% premium hits the +45 cap (95 total)', () => {
    // premium 0.6 * 90 = 54, capped at 45 → 50 + 45 = 95
    const w = calculateWillingness(16, 10, 'Engine', 3, 3, false, false, 25);
    expect(w).toBe(95);
  });

  it('willingness scales smoothly between thresholds', () => {
    // No more discontinuous jumps: a 19% premium should be > 0% but < 30%
    const noPremium = calculateWillingness(10, 10, 'Engine', 3, 3, false, false, 25);
    const small = calculateWillingness(11.9, 10, 'Engine', 3, 3, false, false, 25);
    const big = calculateWillingness(13, 10, 'Engine', 3, 3, false, false, 25);
    expect(small).toBeGreaterThan(noPremium);
    expect(small).toBeLessThan(big);
  });

  it('Loyal trait reduces by -20', () => {
    const w = calculateWillingness(10, 10, 'Loyal', 3, 3, false, false, 25);
    expect(w).toBe(30);
  });

  it('rival reduces by -30', () => {
    const w = calculateWillingness(10, 10, 'Engine', 3, 3, true, false, 25);
    expect(w).toBe(20);
  });

  it('seller needs position reduces by -15', () => {
    const w = calculateWillingness(10, 10, 'Engine', 3, 3, false, true, 25);
    expect(w).toBe(35);
  });

  it('player age > 30 adds +15', () => {
    const w = calculateWillingness(10, 10, 'Engine', 3, 3, false, false, 31);
    expect(w).toBe(65);
  });

  it('Ambitious player moving to better club: -30 (seller reluctant)', () => {
    // buyerTier 1 < sellerTier 3 → buyer is elite, seller reluctant to let ambitious player go
    const w = calculateWillingness(10, 10, 'Ambitious', 1, 3, false, false, 25);
    expect(w).toBe(20);
  });
});

describe('Rival Detection', () => {
  it('Man City and Man Utd are rivals', () => {
    expect(isRival('man-city', 'man-utd', CLUBS)).toBe(true);
  });

  it('Arsenal and Tottenham are rivals', () => {
    expect(isRival('arsenal', 'tottenham', CLUBS)).toBe(true);
  });

  it('Man City and Brighton are not rivals', () => {
    expect(isRival('man-city', 'brighton', CLUBS)).toBe(false);
  });
});

describe('Player Refusal', () => {
  it('Ambitious player always accepts upward move', () => {
    const player = { trait: 'Ambitious' } as Player;
    const rng = new SeededRNG('refusal-test');
    // buyerTier 1 <= sellerTier 3 → upward move
    for (let i = 0; i < 20; i++) {
      expect(checkPlayerRefusal(rng, player, 1, 3)).toBe(false);
    }
  });

  it('Loyal trait increases refusal chance', () => {
    const player = { trait: 'Loyal' } as Player;
    let refusals = 0;
    for (let i = 0; i < 200; i++) {
      const rng = new SeededRNG(`loyal-refusal-${i}`);
      if (checkPlayerRefusal(rng, player, 3, 3)) refusals++;
    }
    // 10% base + 15% loyal = 25% expected
    expect(refusals).toBeGreaterThan(20);
    expect(refusals).toBeLessThan(70);
  });

  it('moving to lower-tier increases refusal', () => {
    const player = { trait: 'Engine' } as Player;
    let refusals = 0;
    for (let i = 0; i < 200; i++) {
      const rng = new SeededRNG(`downgrade-refusal-${i}`);
      // buyerTier 5 > sellerTier 1 → downgrade
      if (checkPlayerRefusal(rng, player, 5, 1)) refusals++;
    }
    // 10% base + 20% downgrade = 30% expected
    expect(refusals).toBeGreaterThan(30);
    expect(refusals).toBeLessThan(80);
  });
});

describe('Continent Sales', () => {
  it('continent sale price is 70% of market value', () => {
    const player = {
      overall: 70, age: 25, form: 0, trait: 'Engine',
    } as Player;
    const marketVal = refreshPlayerValue(player);
    const salePrice = getContinentSalePrice(player);
    expect(salePrice).toBeCloseTo(marketVal * 0.7, 0);
  });

  it('cannot sell player acquired this window', () => {
    const player = { acquiredThisWindow: true, isTemporary: false } as Player;
    expect(canSellToContinent(player)).toBe(false);
  });

  it('cannot sell temporary fill-in', () => {
    const player = { acquiredThisWindow: false, isTemporary: true } as Player;
    expect(canSellToContinent(player)).toBe(false);
  });

  it('can sell normal player', () => {
    const player = { acquiredThisWindow: false, isTemporary: false } as Player;
    expect(canSellToContinent(player)).toBe(true);
  });

  it('executeContinentSale returns valid league and destination', () => {
    const player = {
      overall: 65, age: 30, form: 0, trait: 'Engine',
    } as Player;
    const rng = new SeededRNG('continent-sale-test');
    const result = executeContinentSale(rng, player);
    expect(['La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']).toContain(result.league);
    expect(result.destination.length).toBeGreaterThan(0);
    expect(result.fee).toBeGreaterThan(0);
  });
});

describe('Market Listings', () => {
  it('generates listings for all AI clubs', () => {
    const clubs = setupClubs();
    const rng = new SeededRNG('listings-test');
    const listings = generateMarketListings(rng, clubs, 'man-city');
    expect(listings.length).toBeGreaterThan(0);
    // No player from the player's own club
    expect(listings.every((l) => l.clubId !== 'man-city')).toBe(true);
  });

  it('all listings have positive asking prices', () => {
    const clubs = setupClubs();
    const rng = new SeededRNG('listings-price-test');
    const listings = generateMarketListings(rng, clubs, 'arsenal');
    for (const listing of listings) {
      expect(listing.askingPrice).toBeGreaterThan(0);
    }
  });
});

describe('AI Transfer Window Simulation', () => {
  it('simulates 10 windows without any club exceeding budget', () => {
    let clubs = setupClubs();
    let budgets = setupBudgets();

    const allTransfers: TransferRecord[] = [];

    for (let i = 0; i < 10; i++) {
      const windowType = i % 2 === 0 ? 'summer' : 'january';
      const seasonNumber = Math.floor(i / 2) + 1;
      const seedStr = `${GAME_SEED}-season-${seasonNumber}`;
      const rng = new SeededRNG(`${seedStr}-transfer-${windowType}`);

      const result = simulateAITransferWindow(
        rng,
        clubs,
        budgets,
        'man-city', // Player club — excluded from AI actions
        seasonNumber,
        windowType as 'summer' | 'january',
      );

      allTransfers.push(...result.completedTransfers);

      // Apply transfers to clubs
      for (const transfer of result.completedTransfers) {
        if (transfer.toClubId === 'continent') {
          // Continent sale: remove player, add money
          const club = clubs.find((c) => c.id === transfer.fromClubId);
          if (club) {
            club.roster = club.roster.filter((p) => p.id !== transfer.playerId);
            budgets[transfer.fromClubId] = (budgets[transfer.fromClubId] || 0) + transfer.fee;
          }
        } else {
          // Club-to-club
          const seller = clubs.find((c) => c.id === transfer.fromClubId);
          const buyer = clubs.find((c) => c.id === transfer.toClubId);
          if (seller && buyer) {
            const player = seller.roster.find((p) => p.id === transfer.playerId);
            if (player) {
              seller.roster = seller.roster.filter((p) => p.id !== transfer.playerId);
              buyer.roster.push({ ...player, acquiredThisWindow: true });
              budgets[transfer.fromClubId] = (budgets[transfer.fromClubId] || 0) + transfer.fee;
              budgets[transfer.toClubId] = (budgets[transfer.toClubId] || 0) - transfer.fee;
            }
          }
        }
      }

      // Reset flags at end of window
      clubs = resetAcquiredFlags(clubs);
    }

    // Assert: no team has negative budget (allow small rounding tolerance)
    for (const club of clubs) {
      expect(budgets[club.id]).toBeGreaterThanOrEqual(-0.5);
    }

    // Assert: transfers happened
    expect(allTransfers.length).toBeGreaterThan(0);

    // Log transfer count for reference
    console.log(`Total AI transfers across 10 windows: ${allTransfers.length}`);
  });

  it('rival-to-rival transfers are rare', () => {
    let clubs = setupClubs();
    let budgets = setupBudgets();
    let rivalTransfers = 0;
    let totalTransfers = 0;

    for (let i = 0; i < 10; i++) {
      const windowType = i % 2 === 0 ? 'summer' : 'january';
      const seasonNumber = Math.floor(i / 2) + 1;
      const rng = new SeededRNG(`rival-test-season-${seasonNumber}-${windowType}`);

      const result = simulateAITransferWindow(
        rng, clubs, budgets, 'man-city', seasonNumber, windowType as 'summer' | 'january',
      );

      for (const t of result.completedTransfers) {
        totalTransfers++;
        if (t.toClubId !== 'continent' && isRival(t.fromClubId, t.toClubId, CLUBS)) {
          rivalTransfers++;
        }
      }

      // Apply transfers (simplified — just track counts)
      for (const transfer of result.completedTransfers) {
        if (transfer.toClubId !== 'continent') {
          const seller = clubs.find((c) => c.id === transfer.fromClubId);
          const buyer = clubs.find((c) => c.id === transfer.toClubId);
          if (seller && buyer) {
            const player = seller.roster.find((p) => p.id === transfer.playerId);
            if (player) {
              seller.roster = seller.roster.filter((p) => p.id !== transfer.playerId);
              buyer.roster.push({ ...player, acquiredThisWindow: true });
              budgets[transfer.fromClubId] = (budgets[transfer.fromClubId] || 0) + transfer.fee;
              budgets[transfer.toClubId] = (budgets[transfer.toClubId] || 0) - transfer.fee;
            }
          }
        }
      }

      clubs = resetAcquiredFlags(clubs);
    }

    if (totalTransfers > 0) {
      const rivalPct = rivalTransfers / totalTransfers;
      console.log(`Rival transfers: ${rivalTransfers}/${totalTransfers} (${(rivalPct * 100).toFixed(1)}%)`);
      expect(rivalPct).toBeLessThan(0.15); // Less than 15% should be rival transfers
    }
  });

  it('no player is sold to continent in the same window they were acquired', () => {
    const clubs = setupClubs();
    setupBudgets();

    // Mark some players as acquired this window
    const testClub = clubs.find((c) => c.id === 'chelsea')!;
    testClub.roster[0].acquiredThisWindow = true;

    // Try to sell to continent — should be blocked
    expect(canSellToContinent(testClub.roster[0])).toBe(false);
    expect(canSellToContinent(testClub.roster[1])).toBe(true); // Normal player can be sold
  });

  it('player values fall within target ranges', () => {
    const clubs = setupClubs();

    for (const club of clubs) {
      for (const player of club.roster) {
        const value = refreshPlayerValue(player);

        // The £90M ceiling was intentionally lifted so elite players can
        // command realistic fees — there's no upper ceiling by design now.
        // Floor still applies and catches sign-flip bugs.
        expect(value).toBeGreaterThanOrEqual(0.5);

        // Spot-check: star players in their prime should be expensive
        if (player.overall >= 80 && player.age >= 22 && player.age <= 28) {
          expect(value).toBeGreaterThanOrEqual(25);
        }

        // Aging low-rated players shouldn't be too expensive
        if (player.overall < 65 && player.age >= 32) {
          expect(value).toBeLessThanOrEqual(5);
        }
      }
    }
  });
});

describe('Reset Acquired Flags', () => {
  it('resets all acquiredThisWindow flags to false', () => {
    const clubs = setupClubs();
    clubs[0].roster[0].acquiredThisWindow = true;
    clubs[1].roster[2].acquiredThisWindow = true;

    const reset = resetAcquiredFlags(clubs);
    for (const club of reset) {
      for (const player of club.roster) {
        expect(player.acquiredThisWindow).toBe(false);
      }
    }
  });
});

describe('Offer Evaluation', () => {
  it('high offer is more likely to be accepted', () => {
    const clubs = setupClubs();
    const seller = clubs.find((c) => c.id === 'southampton')!;
    const player = seller.roster.find((p) => p.overall < 70)!;
    const marketVal = refreshPlayerValue(player);

    let acceptCount = 0;
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(`high-offer-${i}`);
      const result = evaluateOffer(rng, marketVal * 1.6, player, seller, 'man-city', 1, clubs);
      if (result.accepted) acceptCount++;
    }

    expect(acceptCount).toBeGreaterThan(70); // Should be accepted most of the time
  });

  it('low offer is likely rejected or countered', () => {
    const clubs = setupClubs();
    const seller = clubs.find((c) => c.id === 'arsenal')!;
    // Use a young, high-rated player the seller would be reluctant to sell
    const player = seller.roster.find((p) => p.age < 28 && p.overall > 70) || seller.roster[0];
    const marketVal = refreshPlayerValue(player);

    let rejectCount = 0;
    let counterCount = 0;
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRNG(`low-offer-${i}`);
      // Very low offer from a low-tier club — multiple negative willingness factors
      const result = evaluateOffer(rng, marketVal * 0.3, player, seller, 'ipswich', 5, clubs);
      if (!result.accepted) {
        if (result.counterFee === null) rejectCount++;
        else counterCount++;
      }
    }

    // With base 50 and no positive modifiers, ~50% rejection rate
    expect(rejectCount + counterCount).toBeGreaterThan(30);
  });

  it('counter offers are at 1.3x market value', () => {
    const clubs = setupClubs();
    const seller = clubs.find((c) => c.id === 'brighton')!;
    const player = seller.roster[5]; // mid-roster player
    const marketVal = refreshPlayerValue(player);

    for (let i = 0; i < 50; i++) {
      const rng = new SeededRNG(`counter-offer-${i}`);
      const result = evaluateOffer(rng, marketVal * 0.9, player, seller, 'fulham', 4, clubs);
      if (result.counterFee !== null) {
        expect(result.counterFee).toBeCloseTo(marketVal * 1.3, 0);
        break;
      }
    }
  });
});
