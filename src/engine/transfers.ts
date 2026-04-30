import type {
  Player,
  Club,
  ClubData,
  Position,
  TransferOffer,
  TransferRecord,
  MarketListing,
  ContinentLeague,
  ContinentSaleResult,
} from '../types/entities';
import { SeededRNG } from '../utils/rng';
import { resetProgressionForTransfer } from './playerGen';

// --- Continent sale destinations ---

const CONTINENT_LEAGUES: ContinentLeague[] = ['La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];

const CONTINENT_CLUBS: Record<ContinentLeague, string[]> = {
  'La Liga': ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Real Sociedad', 'Villarreal', 'Valencia', 'Real Betis'],
  'Serie A': ['Juventus', 'Inter Milan', 'AC Milan', 'Napoli', 'Roma', 'Lazio', 'Atalanta', 'Fiorentina'],
  'Bundesliga': ['Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen', 'Eintracht Frankfurt', 'Wolfsburg', 'Stuttgart', 'Gladbach'],
  'Ligue 1': ['PSG', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Nice', 'Rennes', 'Lens'],
};

const CONTINENT_SALE_DISCOUNT = 0.70;

// --- Market value calculation (Section 6.4 softened formula) ---

export function calculateMarketValue(
  overall: number,
  age: number,
  _form: number = 0,
  trait?: string,
): number {
  // Normalized cubic curve: creates realistic spread between tiers
  // ((overall - 50) / 30)^3 * 45 produces:
  //   82 rated → ~55M, 74 rated → ~23M, 66 rated → ~7M, 60 rated → ~2M
  const normalized = (overall - 50) / 30;
  const base = Math.pow(normalized, 3) * 45;

  let ageFactor: number;
  if (age >= 17 && age <= 21) ageFactor = 1.3;
  else if (age >= 22 && age <= 28) ageFactor = 1.0;
  else if (age >= 29 && age <= 31) ageFactor = 0.65;
  else ageFactor = 0.35; // 32+

  let traitFactor = 1.0;
  if (trait === 'Prospect') traitFactor = 1.4;
  else if (trait === 'Clutch') traitFactor = 1.15;
  else if (trait === 'Fragile') traitFactor = 0.8;

  const raw = base * ageFactor * traitFactor;

  // Floor at £0.5M, no upper ceiling — elite players can exceed £90M.
  return Math.max(0.5, Math.round(raw * 10) / 10);
}

// --- Recalculate a player's market value ---

export function refreshPlayerValue(player: Player): number {
  return calculateMarketValue(player.overall, player.age, 0, player.trait);
}

// --- Offer willingness formula (Section 6.3) ---

export function calculateWillingness(
  offer: number,
  marketValue: number,
  playerTrait: string,
  buyerTier: number,
  sellerTier: number,
  isRival: boolean,
  sellerNeedsPosition: boolean,
  playerAge: number,
): number {
  let willingness = 50;

  if (offer > marketValue * 1.2) willingness += 25;
  if (offer > marketValue * 1.5) willingness += 20; // stacks with above

  if (playerTrait === 'Ambitious' && buyerTier < sellerTier) willingness -= 30;
  if (playerTrait === 'Loyal') willingness -= 20;
  if (isRival) willingness -= 30;
  if (sellerNeedsPosition) willingness -= 15;
  if (playerAge > 30) willingness += 15;

  return willingness;
}

// --- Check if two clubs are rivals ---

export function isRival(club1Id: string, club2Id: string, clubs: (Club | ClubData)[]): boolean {
  const c1 = clubs.find((c) => c.id === club1Id);
  const c2 = clubs.find((c) => c.id === club2Id);
  if (!c1 || !c2) return false;
  return c1.rivalries.includes(club2Id) || c2.rivalries.includes(club1Id);
}

// --- Check if selling club is thin at a position ---

export function clubNeedsPosition(club: Club, position: Position): boolean {
  const countAtPosition = club.roster.filter((p) => p.position === position && !p.isTemporary).length;
  // "Thin" = 1 or fewer non-temporary players at this position
  return countAtPosition <= 1;
}

// --- Evaluate an offer (selling club AI) ---

export interface OfferEvaluation {
  accepted: boolean;
  counterFee: number | null;
  willingness: number;
}

export function evaluateOffer(
  rng: SeededRNG,
  offer: number,
  player: Player,
  sellerClub: Club,
  buyerClubId: string,
  buyerTier: number,
  clubs: Club[],
  isListed?: boolean,
): OfferEvaluation {
  const marketValue = refreshPlayerValue(player);
  const rival = isRival(sellerClub.id, buyerClubId, clubs);
  const needsPosition = clubNeedsPosition(sellerClub, player.position);

  const willingness = calculateWillingness(
    offer,
    marketValue,
    player.trait,
    buyerTier,
    sellerClub.tier,
    rival,
    needsPosition,
    player.age,
  );

  // Listed players are easier to sign: seller is motivated
  const listedBoost = isListed ? 15 : 0;
  const effectiveWillingness = Math.min(95, willingness + listedBoost);

  if (effectiveWillingness > rng.random() * 100) {
    return { accepted: true, counterFee: null, willingness: effectiveWillingness };
  }

  // Reject outright if effectiveWillingness < 20%
  if (effectiveWillingness < 20) {
    return { accepted: false, counterFee: null, willingness: effectiveWillingness };
  }

  // Counter at marketValue * 1.3
  const counterFee = Math.round(marketValue * 1.3 * 10) / 10;
  return { accepted: false, counterFee, willingness };
}

// --- Player refusal check (Section 6.3) ---

export function checkPlayerRefusal(
  rng: SeededRNG,
  player: Player,
  buyerTier: number,
  sellerTier: number,
): boolean {
  let refusalChance = 10;

  if (buyerTier > sellerTier) refusalChance += 20; // moving to lower-tier club
  if (player.trait === 'Ambitious' && buyerTier <= sellerTier) return false; // always accepts upward/lateral
  if (player.trait === 'Loyal') refusalChance += 15;

  return rng.random() * 100 < refusalChance;
}

// --- Continent sale ---

export function getContinentSalePrice(player: Player, saleFeeMultiplier = 1): number {
  const marketValue = refreshPlayerValue(player);
  return Math.round(marketValue * CONTINENT_SALE_DISCOUNT * saleFeeMultiplier * 10) / 10;
}

export function canSellToContinent(player: Player): boolean {
  return !player.acquiredThisWindow && !player.isTemporary;
}

export function executeContinentSale(
  rng: SeededRNG,
  player: Player,
  saleFeeMultiplier = 1,
): ContinentSaleResult {
  const fee = getContinentSalePrice(player, saleFeeMultiplier);
  const league = rng.weightedPick(CONTINENT_LEAGUES, [1, 1, 1, 1]);
  const clubPool = CONTINENT_CLUBS[league];
  const destination = clubPool[rng.randomInt(0, clubPool.length - 1)];

  return { player, fee, destination, league };
}

// --- Generate market listings (available players across the league) ---

/** Average overall of a club's non-temporary, non-injured senior players */
export function clubAverageOverall(club: Club): number {
  const pool = club.roster.filter((p) => !p.isTemporary);
  if (pool.length === 0) return 65;
  const sum = pool.reduce((s, p) => s + p.overall, 0);
  return sum / pool.length;
}

/**
 * Score how attractive a player is to the user at `targetOverall`.
 * Peaks at players ±4 of target, with a slight bias toward players 1-4 points
 * above target (aspirational signings). Players >12 below target score near 0.
 */
function marketRelevanceScore(playerOverall: number, targetOverall: number): number {
  const delta = playerOverall - targetOverall;
  // Gaussian-like falloff, shifted so +2 is the peak
  const shifted = delta - 2;
  const score = Math.exp(-(shifted * shifted) / 60);
  return score;
}

export function generateMarketListings(
  rng: SeededRNG,
  clubs: Club[],
  playerClubId: string,
): MarketListing[] {
  const listings: MarketListing[] = [];

  const playerClub = clubs.find((c) => c.id === playerClubId);
  const targetOverall = playerClub ? clubAverageOverall(playerClub) : 65;

  for (const club of clubs) {
    if (club.id === playerClubId) continue; // Player's own club not in the market

    // Each AI club lists 2–3 players, biased toward overalls near the user's average.
    const numToList = rng.randomInt(2, 3);
    const eligible = club.roster.filter((p) => !p.isTemporary && !p.injured);
    if (eligible.length === 0) continue;

    // Weight each eligible player by relevance to user, boosted slightly for
    // the club's weaker end so AI clubs still shed dead weight.
    const weighted = eligible.map((p) => {
      const relevance = marketRelevanceScore(p.overall, targetOverall);
      const surplusPenalty = p.overall > targetOverall + 10 ? 0.35 : 1;
      const weight = Math.max(0.05, relevance * surplusPenalty);
      return { player: p, weight };
    });

    const picked = new Set<string>();
    for (let i = 0; i < numToList; i++) {
      const pool = weighted.filter((w) => !picked.has(w.player.id));
      if (pool.length === 0) break;
      const chosen = rng.weightedPick(pool, pool.map((w) => w.weight));
      picked.add(chosen.player.id);
      listings.push({
        playerId: chosen.player.id,
        clubId: club.id,
        askingPrice: Math.round(refreshPlayerValue(chosen.player) * 1.1 * 10) / 10,
        listedByPlayer: false,
      });
    }
  }

  return listings;
}

// --- AI transfer behavior ---

export interface AITransferAction {
  type: 'buy' | 'sell';
  clubId: string;
  playerId: string;
  targetClubId?: string;
  fee: number;
}

interface PositionNeed {
  position: Position;
  urgency: number; // higher = more urgent
}

function assessPositionNeeds(club: Club): PositionNeed[] {
  const positionCounts: Record<Position, number> = { GK: 0, CB: 0, FB: 0, MF: 0, WG: 0, ST: 0 };
  const idealCounts: Record<Position, number> = { GK: 2, CB: 3, FB: 2, MF: 4, WG: 2, ST: 3 };

  for (const player of club.roster) {
    if (!player.isTemporary) {
      positionCounts[player.position]++;
    }
  }

  const needs: PositionNeed[] = [];
  for (const pos of Object.keys(idealCounts) as Position[]) {
    const deficit = idealCounts[pos] - positionCounts[pos];
    if (deficit > 0) {
      needs.push({ position: pos, urgency: deficit });
    }
  }

  return needs.sort((a, b) => b.urgency - a.urgency);
}


export interface TransferWindowResult {
  completedTransfers: TransferRecord[];
  offers: TransferOffer[];
  tickerMessages: string[];
}

// --- Simulate AI transfers for a full window ---

export function simulateAITransferWindow(
  rng: SeededRNG,
  clubs: Club[],
  budgets: Record<string, number>,
  playerClubId: string,
  seasonNumber: number,
  windowType: 'summer' | 'january',
  saleFeeMultiplier = 1,
): TransferWindowResult {
  // Manager-background hook: scale fees on offers TO the user.
  const userOfferBoost = (rawFee: number): number =>
    Math.round(rawFee * saleFeeMultiplier * 10) / 10;
  const completedTransfers: TransferRecord[] = [];
  const incomingOffers: TransferOffer[] = [];
  const tickerMessages: string[] = [];

  // Work with mutable copies of rosters and budgets
  const mutableBudgets = { ...budgets };
  const clubMap = new Map<string, Club>();
  for (const club of clubs) {
    clubMap.set(club.id, { ...club, roster: [...club.roster] });
  }

  // AI clubs try to fill position needs
  const aiClubs = clubs.filter((c) => c.id !== playerClubId);

  for (const aiClub of aiClubs) {
    const club = clubMap.get(aiClub.id)!;
    // Hard cap: max 3 transfers per window per club
    const maxTransfersPerWindow = 3;
    const needs = assessPositionNeeds(club);
    let transfersCompleted = 0;

    for (const need of needs) {
      if (transfersCompleted >= maxTransfersPerWindow) break;

      // Find a player to buy from another club
      const availableBudget = mutableBudgets[club.id] || 0;
      if (availableBudget < 1) continue;

      // Squad size guard: don't buy if at or above 25
      if (club.roster.length >= 25) break;

      // GK cap: don't buy another GK if already have 3
      const currentGKs = club.roster.filter((p) => p.position === 'GK' && !p.isTemporary).length;
      if (need.position === 'GK' && currentGKs >= 3) continue;

      let bestCandidate: { player: Player; sellerClub: Club } | null = null;
      let bestValue = -1;

      // Target overall for this club based on tier
      const tierTargetOverall: Record<number, number> = { 1: 76, 2: 72, 3: 68, 4: 64, 5: 60 };
      const targetOvr = tierTargetOverall[club.tier] || 66;

      for (const [otherId, otherClub] of clubMap.entries()) {
        if (otherId === club.id) continue;

        // Check if selling club can spare a player at this position
        const candidatesAtPos = otherClub.roster.filter(
          (p) => p.position === need.position && !p.isTemporary && !p.acquiredThisWindow,
        );
        // Don't strip AI clubs bare (min 16 roster), but always allow scouting the user's club
        if (otherId !== playerClubId && (candidatesAtPos.length <= 1 || otherClub.roster.filter((p) => !p.isTemporary).length <= 16)) continue;

        for (const candidate of candidatesAtPos) {
          const value = refreshPlayerValue(candidate);
          if (value > availableBudget * 0.8) continue; // Don't blow entire budget
          if (candidate.overall < targetOvr - 6) continue; // Don't buy players way below tier standard
          if (candidate.overall > bestValue) {
            bestValue = candidate.overall;
            bestCandidate = { player: candidate, sellerClub: otherClub };
          }
        }
      }

      if (!bestCandidate) continue;

      const { player, sellerClub } = bestCandidate;
      const marketValue = refreshPlayerValue(player);
      const offerFee = Math.round(marketValue * rng.randomFloat(1.0, 1.25) * 10) / 10;

      const evaluation = evaluateOffer(
        rng,
        offerFee,
        player,
        sellerClub,
        club.id,
        club.tier,
        Array.from(clubMap.values()),
      );

      if (evaluation.accepted) {
        const refused = checkPlayerRefusal(rng, player, club.tier, sellerClub.tier);
        if (refused) continue;

        // Execute transfer
        const fee = offerFee;

        // If the selling club is the player's club, create an incoming offer for the player to review
        if (sellerClub.id === playerClubId) {
          incomingOffers.push({
            id: `offer-${rng.randomInt(10000, 99999)}`,
            playerId: player.id,
            playerName: player.name,
            playerPosition: player.position,
            playerOverall: player.overall,
            playerAge: player.age,
            fromClubId: sellerClub.id,
            toClubId: club.id,
            fee: userOfferBoost(fee),
            status: 'pending',
            direction: 'incoming',
          });
          continue; // Player decides
        }

        // AI-to-AI transfer
        mutableBudgets[club.id] = (mutableBudgets[club.id] || 0) - fee;
        mutableBudgets[sellerClub.id] = (mutableBudgets[sellerClub.id] || 0) + fee;

        // Move player
        const sellerMut = clubMap.get(sellerClub.id)!;
        sellerMut.roster = sellerMut.roster.filter((p) => p.id !== player.id);
        const buyerMut = clubMap.get(club.id)!;
        buyerMut.roster.push(resetProgressionForTransfer(player));

        const record: TransferRecord = {
          playerId: player.id,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          playerAge: player.age,
          fromClubId: sellerClub.id,
          toClubId: club.id,
          fee,
          season: seasonNumber,
          window: windowType,
        };
        completedTransfers.push(record);
        tickerMessages.push(
          `${club.name} signed ${player.name} (${player.position}, ${player.overall}) from ${sellerClub.name} for £${fee}M.`,
        );
        transfersCompleted++;
      }
    }

    // AI also sells aging/low-value players — simulate continent sales occasionally
    // Only sell if roster is above minimum size
    if (club.roster.filter((p) => !p.isTemporary).length > 16) {
      const agingPlayers = club.roster.filter(
        (p) => p.age > 31 && p.overall < 65 && !p.isTemporary && !p.acquiredThisWindow,
      );
      if (agingPlayers.length > 0 && rng.random() < 0.3) {
        const playerToSell = agingPlayers[rng.randomInt(0, agingPlayers.length - 1)];
        const sale = executeContinentSale(rng, playerToSell);

        const clubMut = clubMap.get(club.id)!;
        clubMut.roster = clubMut.roster.filter((p) => p.id !== playerToSell.id);
        mutableBudgets[club.id] = (mutableBudgets[club.id] || 0) + sale.fee;

        const record: TransferRecord = {
          playerId: playerToSell.id,
          playerName: playerToSell.name,
          playerPosition: playerToSell.position,
          playerOverall: playerToSell.overall,
          playerAge: playerToSell.age,
          fromClubId: club.id,
          toClubId: 'continent',
          fee: sale.fee,
          season: seasonNumber,
          window: windowType,
          isContinentSale: true,
          continentDestination: `${sale.destination} (${sale.league})`,
        };
        completedTransfers.push(record);
        tickerMessages.push(
          `${playerToSell.name} (${playerToSell.position}, ${playerToSell.overall}) sold to ${sale.destination} for £${sale.fee}M.`,
        );
      }
    }

    // ── Quality gap pursuit: find and upgrade below-average positions ──
    if (windowType === 'summer') {
      const clubAvg = clubAverageOverall(club);
      const weakPlayers = club.roster
        .filter((p) => !p.isTemporary && !p.acquiredThisWindow && p.overall < clubAvg - 5)
        .sort((a, b) => a.overall - b.overall);

      for (const weakPlayer of weakPlayers.slice(0, 2)) {
        if (transfersCompleted >= maxTransfersPerWindow) break;
        // Squad size guard
        if (club.roster.length >= 25) break;
        const budget = mutableBudgets[club.id] || 0;
        if (budget < 3) break;

        let bestUpgrade: { player: Player; sellerClub: Club } | null = null;
        let bestUpgradeOvr = weakPlayer.overall;

        for (const [otherId, otherClub] of clubMap.entries()) {
          if (otherId === club.id) continue;
          const candidates = otherClub.roster.filter(
            (p) => p.position === weakPlayer.position && !p.isTemporary && !p.acquiredThisWindow && p.overall >= bestUpgradeOvr + 3,
          );
          // Don't strip AI clubs below min roster
          const otherRealSize = otherClub.roster.filter((p) => !p.isTemporary).length;
          if (otherId !== playerClubId && (candidates.length <= 1 || otherRealSize <= 16)) continue;

          for (const candidate of candidates) {
            const value = refreshPlayerValue(candidate);
            if (value > budget * 0.8) continue;
            if (candidate.overall > bestUpgradeOvr) {
              bestUpgradeOvr = candidate.overall;
              bestUpgrade = { player: candidate, sellerClub: otherClub };
            }
          }
        }

        if (!bestUpgrade) continue;

        const { player: upgPlayer, sellerClub: upgSeller } = bestUpgrade;
        const upgValue = refreshPlayerValue(upgPlayer);
        const upgFee = Math.round(upgValue * rng.randomFloat(1.0, 1.25) * 10) / 10;

        const upgEval = evaluateOffer(
          rng, upgFee, upgPlayer, upgSeller, club.id, club.tier,
          Array.from(clubMap.values()),
        );

        if (upgEval.accepted) {
          const refused = checkPlayerRefusal(rng, upgPlayer, club.tier, upgSeller.tier);
          if (refused) continue;

          if (upgSeller.id === playerClubId) {
            incomingOffers.push({
              id: `offer-qgap-${rng.randomInt(10000, 99999)}`,
              playerId: upgPlayer.id,
              playerName: upgPlayer.name,
              playerPosition: upgPlayer.position,
              playerOverall: upgPlayer.overall,
              playerAge: upgPlayer.age,
              fromClubId: upgSeller.id,
              toClubId: club.id,
              fee: userOfferBoost(upgFee),
              status: 'pending',
              direction: 'incoming',
            });
            continue;
          }

          mutableBudgets[club.id] = (mutableBudgets[club.id] || 0) - upgFee;
          mutableBudgets[upgSeller.id] = (mutableBudgets[upgSeller.id] || 0) + upgFee;

          const sellerMut = clubMap.get(upgSeller.id)!;
          sellerMut.roster = sellerMut.roster.filter((p) => p.id !== upgPlayer.id);
          const buyerMut = clubMap.get(club.id)!;
          buyerMut.roster.push(resetProgressionForTransfer(upgPlayer));

          completedTransfers.push({
            playerId: upgPlayer.id,
            playerName: upgPlayer.name,
            playerPosition: upgPlayer.position,
            playerOverall: upgPlayer.overall,
            playerAge: upgPlayer.age,
            fromClubId: upgSeller.id,
            toClubId: club.id,
            fee: upgFee,
            season: seasonNumber,
            window: windowType,
          });
          tickerMessages.push(
            `${club.name} signed ${upgPlayer.name} (${upgPlayer.position}, ${upgPlayer.overall}) from ${upgSeller.name} for £${upgFee}M.`,
          );
          transfersCompleted++;
        }
      }
    }
  }

  // --- Speculative incoming offers for the user's squad ---
  // Independent of AI position-need pursuit: rivals proactively bid on the user's
  // best players (listed or not). More action = more transfer activity.
  const userClub = clubMap.get(playerClubId);
  if (userClub) {
    const userPlayers = userClub.roster.filter(
      (p) => !p.isTemporary && !p.acquiredThisWindow && p.overall >= 58,
    );
    const targetCount = windowType === 'summer' ? 4 : 2;
    const existingOfferPlayerIds = new Set(incomingOffers.map((o) => o.playerId));

    // Rank user's players by attractiveness (high rating, young)
    const rankedTargets = userPlayers
      .map((p) => ({ player: p, score: p.overall + (p.age <= 24 ? 5 : 0) - (p.age >= 32 ? 8 : 0) }))
      .sort((a, b) => b.score - a.score);

    let speculativeAdded = 0;
    for (const { player } of rankedTargets) {
      if (speculativeAdded >= targetCount) break;
      if (existingOfferPlayerIds.has(player.id)) continue;

      // 55% chance per eligible player per window
      if (rng.random() > 0.55) continue;

      // Tier-appropriateness filter: top teams shouldn't want low-rated players
      const maxBuyerTier = player.overall >= 75 ? 5  // Any tier can bid
        : player.overall >= 68 ? 3                    // Tier 1-3
        : player.overall >= 62 ? 5                    // Tier 2-5 (mid-range: all tiers)
        : 5;                                          // Any tier for low players, but filter below
      const minBuyerTier = player.overall < 62 ? 3 : 1; // Low-rated: only tier 3-5 bid

      // Pick a plausible buyer: AI club with budget and appropriate tier
      const buyers = aiClubs
        .map((c) => clubMap.get(c.id)!)
        .filter((c) => {
          const canAfford = (mutableBudgets[c.id] || 0) >= refreshPlayerValue(player) * 0.9;
          const tierOk = c.tier >= minBuyerTier && c.tier <= maxBuyerTier;
          return canAfford && tierOk;
        });
      if (buyers.length === 0) continue;

      // Prefer clubs needing this position, otherwise pick randomly from eligible
      const preferred = buyers.find((b) => {
        const needs = assessPositionNeeds(b);
        return needs.some((n) => n.position === player.position);
      });
      const buyer = preferred ?? buyers[rng.randomInt(0, buyers.length - 1)];

      const marketValue = refreshPlayerValue(player);
      const offerFee = Math.round(marketValue * rng.randomFloat(0.95, 1.35) * 10) / 10;
      if (offerFee > (mutableBudgets[buyer.id] || 0)) continue;

      incomingOffers.push({
        id: `offer-spec-${rng.randomInt(10000, 99999)}`,
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: playerClubId,
        toClubId: buyer.id,
        fee: userOfferBoost(offerFee),
        status: 'pending',
        direction: 'incoming',
      });
      existingOfferPlayerIds.add(player.id);
      speculativeAdded++;
    }
  }

  return { completedTransfers, offers: incomingOffers, tickerMessages };
}

// --- Featured player selection ---

import type { FeaturedSlot } from '../store/marketSlice';

export interface FeaturedCandidate {
  playerId: string;
  overall: number;
  age: number;
  price: number;
}

function buildFeaturedCandidatePool(
  listings: MarketListing[],
  clubs: Club[],
  excludeIds: Set<string>,
): FeaturedCandidate[] {
  const candidates: FeaturedCandidate[] = [];
  for (const listing of listings) {
    if (excludeIds.has(listing.playerId)) continue;
    const club = clubs.find((c) => c.id === listing.clubId);
    const player = club?.roster.find((p) => p.id === listing.playerId);
    if (!player) continue;
    candidates.push({
      playerId: player.id,
      overall: player.overall,
      age: player.age,
      price: listing.askingPrice,
    });
  }
  return candidates;
}

function pickByArchetype(
  _rng: SeededRNG,
  candidates: FeaturedCandidate[],
  archetype: 'star' | 'prospect' | 'bargain',
  usedIds: Set<string>,
  targetOverall: number,
): FeaturedCandidate | null {
  const available = candidates.filter((c) => !usedIds.has(c.playerId));
  if (available.length === 0) return null;

  if (archetype === 'star') {
    // "Star" relative to user's club: aspirational, 3-10 above target, cap-fallback to best available.
    const starMin = Math.max(70, Math.round(targetOverall + 3));
    const starMax = Math.round(targetOverall + 10);
    const stars = available.filter((c) => c.overall >= starMin && c.overall <= starMax);
    if (stars.length > 0) return stars.sort((a, b) => b.overall - a.overall)[0];
    const aboveTarget = available.filter((c) => c.overall >= starMin);
    if (aboveTarget.length > 0) return aboveTarget.sort((a, b) => a.overall - b.overall)[0];
    return available.sort((a, b) => b.overall - a.overall)[0];
  }
  if (archetype === 'prospect') {
    // Young player who could grow into a first-team piece at this tier.
    const minRating = Math.max(60, Math.round(targetOverall - 6));
    const prospects = available.filter((c) => c.age <= 21 && c.overall >= minRating);
    if (prospects.length > 0) return prospects.sort((a, b) => b.overall - a.overall)[0];
    return null;
  }
  if (archetype === 'bargain') {
    // Decent first-team contributor at a discount.
    const minRating = Math.max(62, Math.round(targetOverall - 3));
    const maxPrice = Math.max(8, Math.round(targetOverall * 0.25));
    const bargains = available.filter((c) => c.overall >= minRating && c.price <= maxPrice);
    if (bargains.length > 0) return bargains.sort((a, b) => b.overall - a.overall)[0];
    return null;
  }
  return null;
}

function pickWeightedRandom(
  rng: SeededRNG,
  candidates: FeaturedCandidate[],
  usedIds: Set<string>,
  targetOverall: number,
): FeaturedCandidate | null {
  const available = candidates.filter((c) => !usedIds.has(c.playerId));
  if (available.length === 0) return null;
  // Bias toward players near the user's club average overall.
  const weights = available.map((c) => Math.max(0.05, marketRelevanceScore(c.overall, targetOverall)));
  return rng.weightedPick(available, weights);
}

export function generateFeaturedSlots(
  rng: SeededRNG,
  listings: MarketListing[],
  clubs: Club[],
  playerClubId?: string,
): FeaturedSlot[] {
  const candidates = buildFeaturedCandidatePool(listings, clubs, new Set());
  if (candidates.length === 0) return [];

  const userClub = playerClubId ? clubs.find((c) => c.id === playerClubId) : undefined;
  const targetOverall = userClub ? clubAverageOverall(userClub) : 72;

  const slots: FeaturedSlot[] = [];
  const usedIds = new Set<string>();

  // Slot 1: Star
  const star = pickByArchetype(rng, candidates, 'star', usedIds, targetOverall);
  if (star) { slots.push({ playerId: star.playerId, archetype: 'star' }); usedIds.add(star.playerId); }

  // Slot 2: Young Prospect
  const prospect = pickByArchetype(rng, candidates, 'prospect', usedIds, targetOverall);
  if (prospect) { slots.push({ playerId: prospect.playerId, archetype: 'prospect' }); usedIds.add(prospect.playerId); }

  // Slot 3: Bargain
  const bargain = pickByArchetype(rng, candidates, 'bargain', usedIds, targetOverall);
  if (bargain) { slots.push({ playerId: bargain.playerId, archetype: 'bargain' }); usedIds.add(bargain.playerId); }

  // Slots 4-6: Weighted random biased toward user club's overall
  for (let i = 0; i < 3; i++) {
    const pick = pickWeightedRandom(rng, candidates, usedIds, targetOverall);
    if (pick) { slots.push({ playerId: pick.playerId, archetype: 'trending' }); usedIds.add(pick.playerId); }
  }

  return slots;
}

export function refillFeaturedSlot(
  rng: SeededRNG,
  slotIndex: number,
  currentSlots: FeaturedSlot[],
  listings: MarketListing[],
  clubs: Club[],
  playerClubId?: string,
): FeaturedSlot | null {
  const usedIds = new Set(currentSlots.filter((_, i) => i !== slotIndex).map((s) => s.playerId));
  const candidates = buildFeaturedCandidatePool(listings, clubs, new Set());
  if (candidates.length === 0) return null;

  const userClub = playerClubId ? clubs.find((c) => c.id === playerClubId) : undefined;
  const targetOverall = userClub ? clubAverageOverall(userClub) : 72;

  const originalArchetype = currentSlots[slotIndex]?.archetype || 'trending';

  if (originalArchetype === 'star' || originalArchetype === 'prospect' || originalArchetype === 'bargain') {
    const pick = pickByArchetype(rng, candidates, originalArchetype, usedIds, targetOverall);
    if (pick) return { playerId: pick.playerId, archetype: originalArchetype };
  }

  const pick = pickWeightedRandom(rng, candidates, usedIds, targetOverall);
  if (pick) return { playerId: pick.playerId, archetype: 'trending' };

  return null;
}

// --- Reset acquiredThisWindow flags for all clubs ---

export function resetAcquiredFlags(clubs: Club[]): Club[] {
  return clubs.map((club) => ({
    ...club,
    roster: club.roster.map((p) => ({ ...p, acquiredThisWindow: false })),
  }));
}

// --- Validate transfer: no team exceeds budget, squad sizes ok ---

export function validateTransferState(
  clubs: Club[],
  budgets: Record<string, number>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const club of clubs) {
    const budget = budgets[club.id] || 0;
    if (budget < -1) {
      errors.push(`${club.name} has negative budget: £${budget}M`);
    }
    const rosterSize = club.roster.filter((p) => !p.isTemporary).length;
    if (rosterSize > 20) {
      errors.push(`${club.name} has ${rosterSize} players (max 20)`);
    }
  }

  return { valid: errors.length === 0, errors };
}
