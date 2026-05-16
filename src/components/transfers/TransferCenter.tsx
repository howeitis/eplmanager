import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { SeededRNG } from '@/utils/rng';
import { seasonSeed, transferSeed } from '@/utils/rng';
import {
  evaluateOffer,
  checkPlayerRefusal,
  canSellToContinent,
  executeContinentSale,
  generateMarketListings,
  simulateAITransferWindow,
  generateFeaturedSlots,
  refillFeaturedSlot,
} from '@/engine/transfers';
import { resetProgressionForTransfer } from '@/engine/playerGen';
import { getBackgroundEffects } from '@/engine/managerBackground';
import { CLUBS } from '@/data/clubs';
import type {
  Player,
  Club,
  TransferOffer,
  TransferRecord,
  MarketListing,
} from '@/types/entities';
import { FeaturedRow } from './FeaturedRow';
import { SquadPanel } from './SquadPanel';
import { IncomingOffers } from './IncomingOffers';
import { OutgoingOffers } from './OutgoingOffers';
import { TransferTicker } from './TransferTicker';
import { TransferLedger } from './TransferLedger';
import { ShortlistPanel } from './ShortlistPanel';
import { ScrollPipIndicator } from '@/components/shared/ScrollPipIndicator';
import { TutorialModal } from '@/components/shared/TutorialModal';
import { useFirstVisitTutorial } from '@/hooks/useFirstVisitTutorial';

type TransferTab = 'market' | 'squad' | 'incoming' | 'outgoing' | 'ticker' | 'ledger' | 'shortlist';

interface TransferCenterProps {
  onClose: () => void;
}

export function TransferCenter({ onClose: _onClose }: TransferCenterProps) {
  const [activeTab, setActiveTab] = useState<TransferTab>('market');
  const [initialized, setInitialized] = useState(false);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const budgets = useGameStore((s) => s.budgets);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const gameSeed = useGameStore((s) => s.gameSeed);
  const transferOffers = useGameStore((s) => s.transferOffers);
  const marketListings = useGameStore((s) => s.marketListings);
  const tickerMessages = useGameStore((s) => s.tickerMessages);
  const featuredSlots = useGameStore((s) => s.featuredSlots);
  const featuredRefillIndex = useGameStore((s) => s.featuredRefillIndex);
  const saveSlot = useGameStore((s) => s.saveSlot);
  const tutorial = useFirstVisitTutorial('transfers', saveSlot);

  const shortlist = useGameStore((s) => s.shortlist);
  const addShortlistNotification = useGameStore((s) => s.addShortlistNotification);
  const removeFromShortlist = useGameStore((s) => s.removeFromShortlist);

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
  const setFeaturedSlots = useGameStore((s) => s.setFeaturedSlots);
  const setFeaturedRefillIndex = useGameStore((s) => s.setFeaturedRefillIndex);

  const playerClubId = manager?.clubId || '';
  const playerClub = clubs.find((c) => c.id === playerClubId);
  const playerBudget = budgets[playerClubId] || 0;

  const windowType: 'summer' | 'january' =
    (currentPhase === 'january_window' || currentPhase === 'january_deadline') ? 'january' : 'summer';

  // Derive month number for featured seed
  const monthNumber = useMemo(() => {
    const summerPhases = ['summer_window', 'july_advance', 'august_deadline'];
    const janPhases = ['january_window', 'january_deadline'];
    if (summerPhases.includes(currentPhase)) return 'summer_window';
    if (janPhases.includes(currentPhase)) return 'january_window';
    return 'summer_window';
  }, [currentPhase]);

  // Track previous listing count for refill detection
  const prevListingIdsRef = useRef<Set<string>>(new Set());

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
    const saleFeeMultiplier = getBackgroundEffects(manager?.playingBackground).saleFeeMultiplier;
    const aiResult = simulateAITransferWindow(
      rng,
      clubs,
      budgets,
      playerClubId,
      seasonNumber,
      windowType,
      saleFeeMultiplier,
    );

    // Apply AI-to-AI transfers to the store
    const currentShortlist = useGameStore.getState().shortlist;
    for (const transfer of aiResult.completedTransfers) {
      if (transfer.toClubId === 'continent') {
        removePlayerFromClub(transfer.fromClubId, transfer.playerId);
        adjustBudget(transfer.fromClubId, transfer.fee);
      } else {
        const sellerClub = clubs.find((c) => c.id === transfer.fromClubId);
        const player = sellerClub?.roster.find((p) => p.id === transfer.playerId);
        if (player) {
          removePlayerFromClub(transfer.fromClubId, transfer.playerId);
          addPlayerToClub(transfer.toClubId, resetProgressionForTransfer(player));
          adjustBudget(transfer.fromClubId, transfer.fee);
          adjustBudget(transfer.toClubId, -transfer.fee);
        }
      }
      recordTransfer(transfer);

      // Queue notification for shortlisted players transferred by AI
      if (currentShortlist.includes(transfer.playerId)) {
        const buyerClub = clubs.find((c) => c.id === transfer.toClubId);
        const destName = transfer.toClubId === 'continent' ? 'abroad' : (buyerClub?.name || transfer.toClubId);
        addShortlistNotification(
          `Shortlisted: ${transfer.playerName} → ${destName} (£${transfer.fee}M).`,
        );
      }
    }

    // Add AI incoming offers for the player
    for (const offer of aiResult.offers) {
      addTransferOffer(offer);
    }

    // Set ticker messages
    setTickerMessages(aiResult.tickerMessages);

    // Generate featured slots
    const featuredSeed = `${sSeed}-featured-${monthNumber}`;
    const featuredRng = new SeededRNG(featuredSeed);
    // Need to get current listings after AI transfers removed some
    const currentListings = useGameStore.getState().marketListings;
    const slots = generateFeaturedSlots(featuredRng, currentListings, useGameStore.getState().clubs, playerClubId);
    setFeaturedSlots(slots);
    setFeaturedRefillIndex(0);

    // Track listing IDs
    prevListingIdsRef.current = new Set(currentListings.map((l) => l.playerId));

    setInitialized(true);
  }, [initialized, gameSeed, seasonNumber, windowType, monthNumber, clubs, budgets, playerClubId,
    manager?.playingBackground,
    setMarketListings, removePlayerFromClub, addPlayerToClub, adjustBudget,
    recordTransfer, addTransferOffer, setTickerMessages, setFeaturedSlots, setFeaturedRefillIndex,
    addShortlistNotification]);

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      initializeWindow();
    }
  }, [initialized, initializeWindow]);

  // Featured refill: detect when a featured player leaves the market
  useEffect(() => {
    if (!initialized) return;

    const currentListingIds = new Set(marketListings.map((l) => l.playerId));
    const removedIds = new Set<string>();

    for (const id of prevListingIdsRef.current) {
      if (!currentListingIds.has(id)) {
        removedIds.add(id);
      }
    }
    prevListingIdsRef.current = currentListingIds;

    if (removedIds.size === 0) return;

    // Check if any featured slot lost its player
    let currentSlots = [...featuredSlots];
    let currentRefillIdx = featuredRefillIndex;
    let changed = false;

    for (let i = 0; i < currentSlots.length; i++) {
      if (removedIds.has(currentSlots[i].playerId)) {
        // This slot needs refill
        const sSeed = seasonSeed(gameSeed, seasonNumber);
        const refillSeed = `${sSeed}-featured-${monthNumber}-refill-${currentRefillIdx}`;
        const refillRng = new SeededRNG(refillSeed);

        const replacement = refillFeaturedSlot(
          refillRng,
          i,
          currentSlots,
          marketListings,
          clubs,
          playerClubId,
        );

        if (replacement) {
          currentSlots = [...currentSlots];
          currentSlots[i] = replacement;
        } else {
          // Remove the slot
          currentSlots = currentSlots.filter((_, idx) => idx !== i);
          i--;
        }

        currentRefillIdx++;
        changed = true;
      }
    }

    if (changed) {
      setFeaturedSlots(currentSlots);
      setFeaturedRefillIndex(currentRefillIdx);
    }
  }, [marketListings, initialized, featuredSlots, featuredRefillIndex, gameSeed, seasonNumber, monthNumber, clubs, setFeaturedSlots, setFeaturedRefillIndex]);

  // Handle player making an offer for a market player
  const handleMakeOffer = useCallback(
    (playerId: string, sellerClubId: string, offerFee: number) => {
      const sellerClub = clubs.find((c) => c.id === sellerClubId);
      if (!sellerClub) return;
      const player = sellerClub.roster.find((p) => p.id === playerId);
      if (!player) return;
      if (offerFee > playerBudget) return;

      const rng = new SeededRNG(`offer-${playerId}-${Date.now()}`);
      const isListedPlayer = marketListings.some((l) => l.playerId === playerId);
      const evaluation = evaluateOffer(
        rng,
        offerFee,
        player,
        sellerClub,
        playerClubId,
        playerClub?.tier || 3,
        clubs,
        isListedPlayer,
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
            playerAge: player.age,
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
        addPlayerToClub(playerClubId, resetProgressionForTransfer(player));
        adjustBudget(playerClubId, -offerFee);
        adjustBudget(sellerClubId, offerFee);
        removeMarketListing(playerId);

        // Auto-remove from shortlist when signed
        if (shortlist.includes(playerId)) {
          removeFromShortlist(playerId);
        }

        const record: TransferRecord = {
          playerId,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          playerAge: player.age,
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
          playerAge: player.age,
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
          playerAge: player.age,
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
          playerAge: player.age,
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
      addPlayerToClub(playerClubId, resetProgressionForTransfer(player));
      adjustBudget(playerClubId, -offer.counterFee);
      adjustBudget(offer.fromClubId, offer.counterFee);
      removeMarketListing(offer.playerId);

      // Auto-remove from shortlist when signed
      if (shortlist.includes(offer.playerId)) {
        removeFromShortlist(offer.playerId);
      }

      updateTransferOffer(offer.id, 'accepted');

      const record: TransferRecord = {
        playerId: offer.playerId,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
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
      const saleFeeMultiplier = getBackgroundEffects(manager?.playingBackground).saleFeeMultiplier;
      const sale = executeContinentSale(rng, player, saleFeeMultiplier);

      removePlayerFromClub(playerClubId, player.id);
      adjustBudget(playerClubId, sale.fee);

      const record: TransferRecord = {
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
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
    [playerClubId, seasonNumber, windowType, manager?.playingBackground,
      removePlayerFromClub, adjustBudget, recordTransfer, addTickerMessage],
  );

  // Handle responding to incoming AI offers
  const handleRespondToOffer = useCallback(
    (offer: TransferOffer, accept: boolean) => {
      if (accept) {
        const player = playerClub?.roster.find((p) => p.id === offer.playerId);
        if (!player) return;

        removePlayerFromClub(playerClubId, offer.playerId);
        addPlayerToClub(offer.toClubId, resetProgressionForTransfer(player));
        adjustBudget(playerClubId, offer.fee);
        adjustBudget(offer.toClubId, -offer.fee);
        updateTransferOffer(offer.id, 'accepted');

        // Sale is done — auto-reject any other pending incoming offers for the
        // same player so they don't linger on the Incoming tab.
        for (const other of transferOffers) {
          if (
            other.id !== offer.id &&
            other.direction === 'incoming' &&
            other.status === 'pending' &&
            other.playerId === offer.playerId
          ) {
            updateTransferOffer(other.id, 'rejected');
          }
        }

        const buyerClub = clubs.find((c) => c.id === offer.toClubId);
        const record: TransferRecord = {
          playerId: offer.playerId,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          playerAge: player.age,
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
    [clubs, playerClubId, playerClub, seasonNumber, windowType, transferOffers,
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
    { key: 'shortlist', label: 'Shortlist', badge: shortlist.length || undefined },
    { key: 'ledger', label: 'Ledger' },
    { key: 'ticker', label: 'Ticker' },
  ];

  const clubData = CLUBS.find((c) => c.id === playerClubId);
  const accent = clubData?.colors.primary;

  return (
    <div className="plm-relative plm-space-y-4 plm-w-full">
      {/* Club-color ambient glow — mirrors the game hub masthead */}
      {clubData && (
        <div
          aria-hidden
          className="plm-pointer-events-none plm-absolute plm--left-4 plm--right-4 md:plm--left-6 md:plm--right-6 plm--top-16 plm-h-[320px]"
          style={{
            background: `linear-gradient(to bottom, ${clubData.colors.primary}38 0%, ${clubData.colors.primary}1F 28%, ${clubData.colors.primary}0A 55%, transparent 100%)`,
            zIndex: 0,
          }}
        />
      )}

      {/* Unboxed editorial masthead */}
      <section className="plm-relative" style={{ zIndex: 1 }}>
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
          Transfer Center
        </p>
        <div className="plm-mt-2 plm-flex plm-items-end plm-justify-between plm-gap-4">
          <div className="plm-min-w-0">
            <h1 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight plm-truncate">
              {windowType === 'summer' ? 'Summer Window' : 'January Window'}
            </h1>
            <p className="plm-font-display plm-italic plm-text-sm plm-text-warm-600 plm-truncate">
              Season {seasonNumber} &middot; {playerClub?.name}
            </p>
          </div>
          <div className="plm-text-right plm-flex-shrink-0">
            <div className="plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-[0.15em] plm-font-medium">
              Budget
            </div>
            <div
              className="plm-font-display plm-text-2xl plm-font-bold plm-tabular-nums plm-leading-none plm-mt-1"
              style={{ color: accent || '#047857' }}
            >
              &pound;{playerBudget.toFixed(1)}M
            </div>
          </div>
        </div>
      </section>

      {/* Tab nav — horizontal scroll on mobile with scroll pips */}
      <div className="plm-relative" style={{ zIndex: 1 }}>
        <div className="md:plm-hidden plm-px-1 plm-flex plm-items-center plm-justify-end plm-mb-1.5">
          <ScrollPipIndicator count={tabs.length} scrollRef={tabsScrollRef} accent={accent} />
        </div>
        <div
          ref={tabsScrollRef}
          className="plm-border-b plm-border-warm-200 plm-overflow-x-auto plm-snap-x plm-snap-mandatory plm-no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="plm-flex plm-gap-1 plm-min-w-max" role="tablist" aria-label="Transfer sections">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`plm-snap-start plm-px-3 md:plm-px-4 plm-py-3 plm-text-sm plm-font-medium plm-whitespace-nowrap plm-border-b-2 plm-transition-colors plm-min-h-[44px] ${
                  activeTab === tab.key
                    ? 'plm-border-charcoal plm-text-charcoal'
                    : 'plm-border-transparent plm-text-warm-500 hover:plm-text-warm-700'
                }`}
                style={activeTab === tab.key && accent ? { borderColor: accent, color: '#1A1A1A' } : undefined}
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
      </div>

      {/* Content */}
      <div className="plm-relative plm-pt-2" style={{ zIndex: 1 }}>
        {activeTab === 'market' && (
          <FeaturedRow
            listings={marketPlayersWithListings}
            clubs={clubs}
            playerClubId={playerClubId}
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
            playerClubId={playerClubId}
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
        {activeTab === 'shortlist' && (
          <ShortlistPanel
            clubs={clubs}
            playerClubId={playerClubId}
            isTransferWindow
            onMakeOffer={handleMakeOffer}
            budget={playerBudget}
          />
        )}
        {activeTab === 'ledger' && (
          <TransferLedger clubs={clubs} />
        )}
        {activeTab === 'ticker' && (
          <TransferTicker messages={tickerMessages} />
        )}
      </div>
      {tutorial.show && <TutorialModal tab="transfers" onClose={tutorial.onClose} />}
    </div>
  );
}
