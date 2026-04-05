import { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { SeededRNG } from '../../utils/rng';
import { seasonSeed, transferSeed } from '../../utils/rng';
import {
  evaluateOffer,
  checkPlayerRefusal,
  canSellToContinent,
  executeContinentSale,
  generateMarketListings,
  simulateAITransferWindow,
} from '../../engine/transfers';
import type {
  Player,
  Club,
  TransferOffer,
  TransferRecord,
  MarketListing,
} from '../../types/entities';
import { MarketBoard } from './MarketBoard';
import { SquadPanel } from './SquadPanel';
import { IncomingOffers } from './IncomingOffers';
import { OutgoingOffers } from './OutgoingOffers';
import { TransferTicker } from './TransferTicker';

type TransferTab = 'market' | 'squad' | 'incoming' | 'outgoing' | 'ticker';

interface TransferCenterProps {
  onClose: () => void;
}

export function TransferCenter({ onClose }: TransferCenterProps) {
  const [activeTab, setActiveTab] = useState<TransferTab>('market');
  const [initialized, setInitialized] = useState(false);

  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const budgets = useGameStore((s) => s.budgets);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const gameSeed = useGameStore((s) => s.gameSeed);
  const transferOffers = useGameStore((s) => s.transferOffers);
  const marketListings = useGameStore((s) => s.marketListings);
  const tickerMessages = useGameStore((s) => s.tickerMessages);

  const addTransferOffer = useGameStore((s) => s.addTransferOffer);
  const updateTransferOffer = useGameStore((s) => s.updateTransferOffer);
  const adjustBudget = useGameStore((s) => s.adjustBudget);
  const addPlayerToClub = useGameStore((s) => s.addPlayerToClub);
  const removePlayerFromClub = useGameStore((s) => s.removePlayerFromClub);
  const recordTransfer = useGameStore((s) => s.recordTransfer);
  const setMarketListings = useGameStore((s) => s.setMarketListings);
  const removeMarketListing = useGameStore((s) => s.removeMarketListing);
  const addTickerMessage = useGameStore((s) => s.addTickerMessage);
  const setTickerMessages = useGameStore((s) => s.setTickerMessages);

  const playerClubId = manager?.clubId || '';
  const playerClub = clubs.find((c) => c.id === playerClubId);
  const playerBudget = budgets[playerClubId] || 0;

  const windowType: 'summer' | 'january' =
    currentPhase === 'january_window' ? 'january' : 'summer';

  // Initialize market on first render
  const initializeWindow = useCallback(() => {
    if (initialized) return;

    const sSeed = seasonSeed(gameSeed, seasonNumber);
    const tSeed = transferSeed(sSeed, windowType);
    const rng = new SeededRNG(tSeed + '-init-' + Date.now());

    // Generate market listings
    const listings = generateMarketListings(rng, clubs, playerClubId);
    setMarketListings(listings);

    // Simulate AI transfer activity
    const aiResult = simulateAITransferWindow(
      rng,
      clubs,
      budgets,
      playerClubId,
      seasonNumber,
      windowType,
    );

    // Apply AI-to-AI transfers to the store
    for (const transfer of aiResult.completedTransfers) {
      if (transfer.toClubId === 'continent') {
        removePlayerFromClub(transfer.fromClubId, transfer.playerId);
        adjustBudget(transfer.fromClubId, transfer.fee);
      } else {
        const sellerClub = clubs.find((c) => c.id === transfer.fromClubId);
        const player = sellerClub?.roster.find((p) => p.id === transfer.playerId);
        if (player) {
          removePlayerFromClub(transfer.fromClubId, transfer.playerId);
          addPlayerToClub(transfer.toClubId, { ...player, acquiredThisWindow: true });
          adjustBudget(transfer.fromClubId, transfer.fee);
          adjustBudget(transfer.toClubId, -transfer.fee);
        }
      }
      recordTransfer(transfer);
    }

    // Add AI incoming offers for the player
    for (const offer of aiResult.offers) {
      addTransferOffer(offer);
    }

    // Set ticker messages
    setTickerMessages(aiResult.tickerMessages);

    setInitialized(true);
  }, [initialized, gameSeed, seasonNumber, windowType, clubs, budgets, playerClubId,
    setMarketListings, removePlayerFromClub, addPlayerToClub, adjustBudget,
    recordTransfer, addTransferOffer, setTickerMessages]);

  // Initialize on mount
  if (!initialized) {
    initializeWindow();
  }

  // Handle player making an offer for a market player
  const handleMakeOffer = useCallback(
    (playerId: string, sellerClubId: string, offerFee: number) => {
      const sellerClub = clubs.find((c) => c.id === sellerClubId);
      if (!sellerClub) return;
      const player = sellerClub.roster.find((p) => p.id === playerId);
      if (!player) return;
      if (offerFee > playerBudget) return;

      const rng = new SeededRNG(`offer-${playerId}-${Date.now()}`);
      const evaluation = evaluateOffer(
        rng,
        offerFee,
        player,
        sellerClub,
        playerClubId,
        playerClub?.tier || 3,
        clubs,
      );

      const offerId = `offer-${rng.randomInt(10000, 99999)}`;

      if (evaluation.accepted) {
        // Check player refusal
        const refused = checkPlayerRefusal(rng, player, playerClub?.tier || 3, sellerClub.tier);
        if (refused) {
          addTransferOffer({
            id: offerId,
            playerId,
            playerName: player.name,
            playerPosition: player.position,
            playerOverall: player.overall,
            fromClubId: sellerClubId,
            toClubId: playerClubId,
            fee: offerFee,
            status: 'player_refused',
            direction: 'outgoing',
          });
          addTickerMessage(`${player.name} refused to join ${playerClub?.name}.`);
          return;
        }

        // Transfer accepted and player agrees!
        removePlayerFromClub(sellerClubId, playerId);
        addPlayerToClub(playerClubId, { ...player, acquiredThisWindow: true });
        adjustBudget(playerClubId, -offerFee);
        adjustBudget(sellerClubId, offerFee);
        removeMarketListing(playerId);

        const record: TransferRecord = {
          playerId,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          fromClubId: sellerClubId,
          toClubId: playerClubId,
          fee: offerFee,
          season: seasonNumber,
          window: windowType,
        };
        recordTransfer(record);

        addTransferOffer({
          id: offerId,
          playerId,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          fromClubId: sellerClubId,
          toClubId: playerClubId,
          fee: offerFee,
          status: 'accepted',
          direction: 'outgoing',
        });
        addTickerMessage(
          `${playerClub?.name} signed ${player.name} (${player.position}, ${player.overall}) from ${sellerClub.name} for £${offerFee}M.`,
        );
      } else if (evaluation.counterFee !== null) {
        addTransferOffer({
          id: offerId,
          playerId,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          fromClubId: sellerClubId,
          toClubId: playerClubId,
          fee: offerFee,
          status: 'countered',
          counterFee: evaluation.counterFee,
          direction: 'outgoing',
        });
      } else {
        addTransferOffer({
          id: offerId,
          playerId,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          fromClubId: sellerClubId,
          toClubId: playerClubId,
          fee: offerFee,
          status: 'rejected',
          direction: 'outgoing',
        });
      }
    },
    [clubs, playerClubId, playerClub, playerBudget, seasonNumber, windowType,
      addTransferOffer, removePlayerFromClub, addPlayerToClub, adjustBudget,
      recordTransfer, removeMarketListing, addTickerMessage],
  );

  // Handle accepting a counter offer
  const handleAcceptCounter = useCallback(
    (offer: TransferOffer) => {
      if (!offer.counterFee || offer.counterFee > playerBudget) return;

      const sellerClub = clubs.find((c) => c.id === offer.fromClubId);
      const player = sellerClub?.roster.find((p) => p.id === offer.playerId);
      if (!sellerClub || !player) return;

      const rng = new SeededRNG(`accept-counter-${offer.id}-${Date.now()}`);
      const refused = checkPlayerRefusal(rng, player, playerClub?.tier || 3, sellerClub.tier);

      if (refused) {
        updateTransferOffer(offer.id, 'player_refused');
        addTickerMessage(`${player.name} refused to join ${playerClub?.name}.`);
        return;
      }

      removePlayerFromClub(offer.fromClubId, offer.playerId);
      addPlayerToClub(playerClubId, { ...player, acquiredThisWindow: true });
      adjustBudget(playerClubId, -offer.counterFee);
      adjustBudget(offer.fromClubId, offer.counterFee);
      removeMarketListing(offer.playerId);
      updateTransferOffer(offer.id, 'accepted');

      const record: TransferRecord = {
        playerId: offer.playerId,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        fromClubId: offer.fromClubId,
        toClubId: playerClubId,
        fee: offer.counterFee,
        season: seasonNumber,
        window: windowType,
      };
      recordTransfer(record);
      addTickerMessage(
        `${playerClub?.name} signed ${player.name} (${player.position}, ${player.overall}) from ${sellerClub.name} for £${offer.counterFee}M.`,
      );
    },
    [clubs, playerClubId, playerClub, playerBudget, seasonNumber, windowType,
      updateTransferOffer, removePlayerFromClub, addPlayerToClub, adjustBudget,
      recordTransfer, removeMarketListing, addTickerMessage],
  );

  // Handle selling to continent
  const handleSellToContinent = useCallback(
    (player: Player) => {
      if (!canSellToContinent(player)) return;

      const rng = new SeededRNG(`continent-${player.id}-${Date.now()}`);
      const sale = executeContinentSale(rng, player);

      removePlayerFromClub(playerClubId, player.id);
      adjustBudget(playerClubId, sale.fee);

      const record: TransferRecord = {
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        fromClubId: playerClubId,
        toClubId: 'continent',
        fee: sale.fee,
        season: seasonNumber,
        window: windowType,
        isContinentSale: true,
        continentDestination: `${sale.destination} (${sale.league})`,
      };
      recordTransfer(record);
      addTickerMessage(
        `${player.name} (${player.position}, ${player.overall}) sold to ${sale.destination} for £${sale.fee}M.`,
      );
    },
    [playerClubId, seasonNumber, windowType, removePlayerFromClub, adjustBudget,
      recordTransfer, addTickerMessage],
  );

  // Handle responding to incoming AI offers
  const handleRespondToOffer = useCallback(
    (offer: TransferOffer, accept: boolean) => {
      if (accept) {
        const player = playerClub?.roster.find((p) => p.id === offer.playerId);
        if (!player) return;

        removePlayerFromClub(playerClubId, offer.playerId);
        addPlayerToClub(offer.toClubId, { ...player, acquiredThisWindow: true });
        adjustBudget(playerClubId, offer.fee);
        adjustBudget(offer.toClubId, -offer.fee);
        updateTransferOffer(offer.id, 'accepted');

        const buyerClub = clubs.find((c) => c.id === offer.toClubId);
        const record: TransferRecord = {
          playerId: offer.playerId,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          fromClubId: playerClubId,
          toClubId: offer.toClubId,
          fee: offer.fee,
          season: seasonNumber,
          window: windowType,
        };
        recordTransfer(record);
        addTickerMessage(
          `${buyerClub?.name} signed ${player.name} (${player.position}, ${player.overall}) from ${playerClub?.name} for £${offer.fee}M.`,
        );
      } else {
        updateTransferOffer(offer.id, 'rejected');
      }
    },
    [clubs, playerClubId, playerClub, seasonNumber, windowType,
      removePlayerFromClub, addPlayerToClub, adjustBudget,
      updateTransferOffer, recordTransfer, addTickerMessage],
  );

  const incomingOffers = transferOffers.filter(
    (o) => o.direction === 'incoming' && o.status === 'pending',
  );
  const outgoingOffers = transferOffers.filter((o) => o.direction === 'outgoing');

  // Find player data for market listings
  const marketPlayersWithListings = useMemo(() => {
    return marketListings
      .map((listing) => {
        const club = clubs.find((c) => c.id === listing.clubId);
        const player = club?.roster.find((p) => p.id === listing.playerId);
        if (!player || !club) return null;
        return { player, club, listing };
      })
      .filter(Boolean) as { player: Player; club: Club; listing: MarketListing }[];
  }, [marketListings, clubs]);

  const tabs: { key: TransferTab; label: string; badge?: number }[] = [
    { key: 'market', label: 'Market' },
    { key: 'squad', label: 'Squad' },
    { key: 'incoming', label: 'Incoming', badge: incomingOffers.length || undefined },
    { key: 'outgoing', label: 'Outgoing', badge: outgoingOffers.length || undefined },
    { key: 'ticker', label: 'Ticker' },
  ];

  return (
    <div className="plm-min-h-screen plm-bg-gray-50">
      {/* Header */}
      <div className="plm-bg-white plm-border-b plm-border-gray-200 plm-px-4 plm-py-3">
        <div className="plm-max-w-6xl plm-mx-auto plm-flex plm-items-center plm-justify-between">
          <div>
            <button
              onClick={onClose}
              aria-label="Back to Hub"
              className="plm-text-sm plm-text-gray-500 hover:plm-text-gray-700 plm-mb-1 plm-min-h-[44px] plm-inline-flex plm-items-center"
            >
              &larr; Back to Hub
            </button>
            <h1 className="plm-text-lg plm-font-bold plm-text-gray-900">
              Transfer Center
            </h1>
            <p className="plm-text-xs plm-text-gray-500">
              {windowType === 'summer' ? 'Summer' : 'January'} Window &middot; Season {seasonNumber}
            </p>
          </div>
          <div className="plm-text-right">
            <div className="plm-text-xs plm-text-gray-400">Budget</div>
            <div className="plm-text-lg plm-font-bold plm-text-green-700">
              &pound;{playerBudget.toFixed(1)}M
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="lg:plm-hidden plm-bg-white plm-border-b plm-border-gray-200 plm-px-2 plm-overflow-x-auto">
        <div className="plm-flex plm-gap-1 plm-min-w-max" role="tablist" aria-label="Transfer sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`plm-px-3 plm-py-3 plm-text-sm plm-font-medium plm-whitespace-nowrap plm-border-b-2 plm-transition-colors plm-min-h-[44px] ${
                activeTab === tab.key
                  ? 'plm-border-gray-900 plm-text-gray-900'
                  : 'plm-border-transparent plm-text-gray-500 hover:plm-text-gray-700'
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="plm-ml-1 plm-bg-red-500 plm-text-white plm-text-xs plm-rounded-full plm-px-1.5 plm-py-0.5" aria-label={`${tab.badge} pending`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="plm-max-w-6xl plm-mx-auto plm-px-4 plm-py-4">
        {/* Desktop: side-by-side layout */}
        <div className="plm-hidden lg:plm-grid lg:plm-grid-cols-3 lg:plm-gap-4">
          {/* Left panel: Market Board */}
          <div className="plm-col-span-2">
            <MarketBoard
              listings={marketPlayersWithListings}
              budget={playerBudget}
              onMakeOffer={handleMakeOffer}
              playerClubId={playerClubId}
              clubs={clubs}
            />
          </div>

          {/* Right panel: Squad + Offers + Ticker */}
          <div className="plm-space-y-4">
            <SquadPanel
              club={playerClub!}
              onSellToContinent={handleSellToContinent}
            />
            {incomingOffers.length > 0 && (
              <IncomingOffers
                offers={incomingOffers}
                clubs={clubs}
                onRespond={handleRespondToOffer}
              />
            )}
            {outgoingOffers.length > 0 && (
              <OutgoingOffers
                offers={outgoingOffers}
                clubs={clubs}
                budget={playerBudget}
                onAcceptCounter={handleAcceptCounter}
              />
            )}
            <TransferTicker messages={tickerMessages} />
          </div>
        </div>

        {/* Mobile: tab content */}
        <div className="lg:plm-hidden">
          {activeTab === 'market' && (
            <MarketBoard
              listings={marketPlayersWithListings}
              budget={playerBudget}
              onMakeOffer={handleMakeOffer}
              playerClubId={playerClubId}
              clubs={clubs}
            />
          )}
          {activeTab === 'squad' && playerClub && (
            <SquadPanel
              club={playerClub}
              onSellToContinent={handleSellToContinent}
            />
          )}
          {activeTab === 'incoming' && (
            <IncomingOffers
              offers={incomingOffers}
              clubs={clubs}
              onRespond={handleRespondToOffer}
            />
          )}
          {activeTab === 'outgoing' && (
            <OutgoingOffers
              offers={outgoingOffers}
              clubs={clubs}
              budget={playerBudget}
              onAcceptCounter={handleAcceptCounter}
            />
          )}
          {activeTab === 'ticker' && (
            <TransferTicker messages={tickerMessages} />
          )}
        </div>
      </div>
    </div>
  );
}
