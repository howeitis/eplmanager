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
  form: number,
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

  // Form factor: map form (-5 to +5) to 0.85–1.15
  const formFactor = 0.85 + ((Math.max(-5, Math.min(5, form)) + 5) / 10) * 0.3;

  let traitFactor = 1.0;
  if (trait === 'Prospect') traitFactor = 1.4;
  else if (trait === 'Clutch') traitFactor = 1.15;
  else if (trait === 'Fragile') traitFactor = 0.8;

  const raw = base * ageFactor * formFactor * traitFactor;

  // Floor at £0.5M, cap at £90M, round to 1 decimal
  return Math.max(0.5, Math.min(90, Math.round(raw * 10) / 10));
}

// --- Recalculate a player's market value ---

export function refreshPlayerValue(player: Player): number {
  return calculateMarketValue(player.overall, player.age, player.form, player.trait);
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

  if (willingness > rng.random() * 100) {
    return { accepted: true, counterFee: null, willingness };
  }

  // Reject outright if willingness < 20%
  if (willingness < 20) {
    return { accepted: false, counterFee: null, willingness };
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

export function getContinentSalePrice(player: Player): number {
  const marketValue = refreshPlayerValue(player);
  return Math.round(marketValue * CONTINENT_SALE_DISCOUNT * 10) / 10;
}

export function canSellToContinent(player: Player): boolean {
  return !player.acquiredThisWindow && !player.isTemporary;
}

export function executeContinentSale(
  rng: SeededRNG,
  player: Player,
): ContinentSaleResult {
  const fee = getContinentSalePrice(player);
  const league = rng.weightedPick(CONTINENT_LEAGUES, [1, 1, 1, 1]);
  const clubPool = CONTINENT_CLUBS[league];
  const destination = clubPool[rng.randomInt(0, clubPool.length - 1)];

  return { player, fee, destination, league };
}

// --- Generate market listings (available players across the league) ---

export function generateMarketListings(
  rng: SeededRNG,
  clubs: Club[],
  playerClubId: string,
): MarketListing[] {
  const listings: MarketListing[] = [];

  for (const club of clubs) {
    if (club.id === playerClubId) continue; // Player's own club not in the market

    // Each AI club lists 1–3 players based on squad composition
    const numToList = rng.randomInt(1, 3);
    const eligible = club.roster
      .filter((p) => !p.isTemporary && !p.injured)
      .sort((a, b) => a.overall - b.overall); // worst players more likely to be listed

    const toList = eligible.slice(0, Math.min(numToList, eligible.length));
    for (const player of toList) {
      listings.push({
        playerId: player.id,
        clubId: club.id,
        askingPrice: Math.round(refreshPlayerValue(player) * 1.1 * 10) / 10, // 10% markup
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
): TransferWindowResult {
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
  const maxTransfersPerWindow = windowType === 'summer' ? 3 : 1;

  for (const aiClub of aiClubs) {
    const club = clubMap.get(aiClub.id)!;
    const needs = assessPositionNeeds(club);
    let transfersCompleted = 0;

    for (const need of needs) {
      if (transfersCompleted >= maxTransfersPerWindow) break;

      // Find a player to buy from another club
      const availableBudget = mutableBudgets[club.id] || 0;
      if (availableBudget < 1) continue;

      let bestCandidate: { player: Player; sellerClub: Club } | null = null;
      let bestValue = -1;

      for (const [otherId, otherClub] of clubMap.entries()) {
        if (otherId === club.id) continue;

        // Check if selling club can spare a player at this position
        const candidatesAtPos = otherClub.roster.filter(
          (p) => p.position === need.position && !p.isTemporary && !p.acquiredThisWindow,
        );
        if (candidatesAtPos.length <= 1) continue; // Don't strip them bare

        for (const candidate of candidatesAtPos) {
          const value = refreshPlayerValue(candidate);
          if (value > availableBudget * 0.6) continue; // Don't blow entire budget
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
            fromClubId: sellerClub.id,
            toClubId: club.id,
            fee,
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
        buyerMut.roster.push({ ...player, acquiredThisWindow: true });

        const record: TransferRecord = {
          playerId: player.id,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
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

  return { completedTransfers, offers: incomingOffers, tickerMessages };
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
