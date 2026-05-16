import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useModalParams, useModalBrowseList, navigateModalTo } from '@/hooks/useModalParams';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import {
  refreshPlayerValue,
  evaluateOffer,
  checkPlayerRefusal,
} from '@/engine/transfers';
import { resetProgressionForTransfer } from '@/engine/playerGen';
import { SeededRNG } from '@/utils/rng';
import { SigningCelebrationModal } from './SigningCelebrationModal';
import type { SigningCelebrationData } from './SigningCelebrationModal';
import { RetroPlayerCard } from './RetroPlayerCard';
import { InteractiveCard } from './InteractiveCard';
import type { Club, Player, TransferRecord } from '@/types/entities';
import { getClubLogoUrl } from '@/data/assets';
import { STAT_KEYS, getStatLabel, getStatLongName } from '@/utils/statLabels';

// Slot colors carry across positions — for GK the slot still represents the
// same column of the underlying storage, just labelled differently.
const STAT_COLORS: Record<string, string> = {
  ATK: 'plm-bg-red-500',
  DEF: 'plm-bg-blue-500',
  MOV: 'plm-bg-green-500',
  PWR: 'plm-bg-amber-500',
  MEN: 'plm-bg-purple-500',
  SKL: 'plm-bg-teal-500',
};

function getFormColor(form: number): string {
  if (form >= 3) return 'plm-bg-emerald-100 plm-text-emerald-700';
  if (form >= 1) return 'plm-bg-emerald-50 plm-text-emerald-600';
  if (form <= -3) return 'plm-bg-red-100 plm-text-red-700';
  if (form <= -1) return 'plm-bg-red-50 plm-text-red-600';
  return 'plm-bg-warm-100 plm-text-warm-600';
}

function formatFormValue(form: number): string {
  if (form > 0) return `+${form}`;
  return `${form}`;
}

function findPlayerLocation(playerId: string, clubs: Club[]): { player: Player; clubId: string } | null {
  for (const club of clubs) {
    const player = club.roster.find((p) => p.id === playerId);
    if (player) return { player, clubId: club.id };
  }
  return null;
}

export function PlayerDetailModal() {
  const { playerId, clubId, closeModal, isOpen } = useModalParams();
  const browseList = useModalBrowseList();
  const dialogRef = useRef<HTMLDivElement>(null);

  const clubs = useGameStore((s) => s.clubs);
  const manager = useGameStore((s) => s.manager);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const shortlist = useGameStore((s) => s.shortlist);
  const toggleShortlist = useGameStore((s) => s.toggleShortlist);
  const addMarketListing = useGameStore((s) => s.addMarketListing);
  const marketListings = useGameStore((s) => s.marketListings);

  const playerClubId = manager?.clubId || '';
  const isTransferWindow = currentPhase === 'summer_window' || currentPhase === 'july_advance'
    || currentPhase === 'august_deadline' || currentPhase === 'january_window'
    || currentPhase === 'january_deadline';

  // Find the player across all clubs
  const targetClub = clubs.find((c) => c.id === clubId);
  const livePlayer = targetClub?.roster.find((p) => p.id === playerId) || null;

  // Keep a snapshot so the modal stays rendered after a transfer moves the player
  const playerSnapshotRef = useRef<Player | null>(null);
  const clubIdSnapshotRef = useRef<string | null>(null);
  if (livePlayer) {
    playerSnapshotRef.current = livePlayer;
    clubIdSnapshotRef.current = clubId;
  }
  const player = livePlayer || playerSnapshotRef.current;
  const playerTransferred = !livePlayer && !!playerSnapshotRef.current;

  // Celebration modal state
  const [celebrationData, setCelebrationData] = useState<SigningCelebrationData | null>(null);
  // Card view toggle
  const [showCardView, setShowCardView] = useState(true);
  // Direction the next card should slide in from (set when navigating via swipe).
  const [enterFrom, setEnterFrom] = useState<'left' | 'right' | null>(null);

  // Browse-list navigation: find the next/prev player that still exists in
  // some club's roster. Players who have retired (gone from all rosters) are
  // skipped silently so the user can keep swiping through their shortlist.
  const navigation = useMemo(() => {
    if (!browseList || !playerId) return { next: null, prev: null };
    const idx = browseList.indexOf(playerId);
    if (idx === -1) return { next: null, prev: null };

    let next: { playerId: string; clubId: string } | null = null;
    for (let i = idx + 1; i < browseList.length; i++) {
      const found = findPlayerLocation(browseList[i], clubs);
      if (found) {
        next = { playerId: found.player.id, clubId: found.clubId };
        break;
      }
    }

    let prev: { playerId: string; clubId: string } | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      const found = findPlayerLocation(browseList[i], clubs);
      if (found) {
        prev = { playerId: found.player.id, clubId: found.clubId };
        break;
      }
    }

    return { next, prev };
  }, [browseList, playerId, clubs]);

  const handleNext = useCallback(() => {
    if (!navigation.next) return;
    setEnterFrom('right');
    navigateModalTo(navigation.next.playerId, navigation.next.clubId);
  }, [navigation.next]);

  const handlePrev = useCallback(() => {
    if (!navigation.prev) return;
    setEnterFrom('left');
    navigateModalTo(navigation.prev.playerId, navigation.prev.clubId);
  }, [navigation.prev]);

  const isOwnClub = clubId === playerClubId;
  const isOnShortlist = playerId ? shortlist.includes(playerId) : false;
  const isListed = playerId ? marketListings.some((l) => l.playerId === playerId) : false;

  // Clear snapshot when modal closes
  useEffect(() => {
    if (!isOpen) {
      playerSnapshotRef.current = null;
      clubIdSnapshotRef.current = null;
      setCelebrationData(null);
      setShowCardView(true);
      setEnterFrom(null);
    }
  }, [isOpen]);

  // The celebration modal manages its own dismiss plumbing when visible, so we
  // disable the trap here to avoid double-handling Escape / backdrop clicks.
  const { handleBackdropClick } = useModalDismiss(dialogRef, closeModal, {
    enabled: isOpen && !!player && !celebrationData,
  });

  const handleCelebrationDismiss = useCallback(() => {
    setCelebrationData(null);
    closeModal();
  }, [closeModal]);

  const handleListForSale = useCallback(() => {
    if (!player || !clubId) return;
    if (isListed) return;
    const value = refreshPlayerValue(player);
    addMarketListing({
      playerId: player.id,
      clubId,
      askingPrice: Math.round(value * 1.1 * 10) / 10,
      listedByPlayer: false,
    });
  }, [player, clubId, isListed, addMarketListing]);

  if (!isOpen || !player || !targetClub) return null;

  const marketValue = refreshPlayerValue(player);

  return (
    <div
      className="plm-fixed plm-inset-0 plm-z-50 plm-flex plm-items-end md:plm-items-center plm-justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Player details for ${player.name}`}
    >
      {/* Backdrop */}
      <div className="plm-absolute plm-inset-0 plm-bg-black/50 plm-transition-opacity" />

      {/* Modal body */}
      <div
        ref={dialogRef}
        className={[
          'plm-relative plm-bg-white plm-w-full plm-max-h-[85vh] plm-overflow-y-auto plm-overscroll-contain',
          // Mobile: bottom sheet
          'plm-rounded-t-2xl plm-pb-6',
          // Desktop: centered modal
          'md:plm-rounded-xl md:plm-max-w-lg md:plm-mx-auto md:plm-pb-6',
        ].join(' ')}
      >
        {/* Drag handle (mobile) */}
        <div className="md:plm-hidden plm-flex plm-justify-center plm-pt-3 plm-pb-1">
          <div className="plm-w-10 plm-h-1 plm-rounded-full plm-bg-warm-300" />
        </div>

        {/* Close button */}
        <div className="plm-sticky plm-top-0 plm-bg-white/95 plm-backdrop-blur-sm plm-z-10 plm-px-5 plm-pt-3 md:plm-pt-5 plm-pb-3 plm-border-b plm-border-warm-100">
          <div className="plm-flex plm-items-start plm-justify-between">
            <div className="plm-flex-1 plm-min-w-0">
              {/* Name + Position */}
              <h2 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-truncate plm-flex plm-items-center plm-gap-1.5">
                {isOnShortlist && <span className="plm-text-amber-500 plm-flex-shrink-0" aria-label="Shortlisted">★</span>}
                {player.name}
              </h2>
              <div className="plm-flex plm-items-center plm-gap-2 plm-mt-1 plm-flex-wrap">
                <span className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-500">
                  {player.position}
                </span>
                <span className="plm-text-xs plm-text-warm-400">&middot;</span>
                <span className="plm-text-xs plm-text-warm-600">Age {player.age}</span>
                <span className="plm-text-xs plm-text-warm-400">&middot;</span>
                <span className="plm-text-sm plm-font-bold plm-text-charcoal">{player.overall} OVR</span>
              </div>
              <div className="plm-flex plm-items-center plm-gap-1.5 plm-mt-1.5">
                {/* Trait chip */}
                <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wide plm-bg-warm-100 plm-text-warm-600 plm-px-2 plm-py-0.5 plm-rounded-full">
                  {player.trait}
                </span>
                {/* Injury badge */}
                {player.injured && (
                  <span className="plm-text-[10px] plm-font-bold plm-bg-red-100 plm-text-red-600 plm-px-2 plm-py-0.5 plm-rounded-full">
                    🏥 INJ ({player.injuryWeeks}m)
                  </span>
                )}
                {/* Temp fill-in badge */}
                {player.isTemporary && (
                  <span className="plm-text-[10px] plm-font-medium plm-bg-warm-200 plm-text-warm-500 plm-px-2 plm-py-0.5 plm-rounded-full plm-uppercase">
                    Fill-in
                  </span>
                )}
              </div>
            </div>
            <div className="plm-flex plm-items-center plm-gap-1 plm-ml-3 plm-flex-shrink-0">
              {/* Card view toggle */}
              <button
                onClick={() => setShowCardView(!showCardView)}
                aria-label={showCardView ? 'Switch to stats view' : 'Switch to card view'}
                className={`plm-w-9 plm-h-9 plm-flex plm-items-center plm-justify-center plm-rounded-full plm-transition-colors plm-min-h-[44px] plm-min-w-[44px] ${
                  showCardView
                    ? 'plm-bg-charcoal plm-text-white'
                    : 'plm-text-warm-400 hover:plm-bg-warm-100 hover:plm-text-warm-700'
                }`}
              >
                <svg className="plm-w-5 plm-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="10" rx="1" strokeWidth={2} />
                  <rect x="14" y="3" width="7" height="10" rx="1" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M3 16h18M3 19h12" />
                </svg>
              </button>
              <button
                onClick={closeModal}
                aria-label="Close player details"
                className="plm-w-9 plm-h-9 plm-flex plm-items-center plm-justify-center plm-rounded-full plm-text-warm-400 hover:plm-bg-warm-100 hover:plm-text-warm-700 plm-transition-colors plm-min-h-[44px] plm-min-w-[44px]"
              >
                <svg className="plm-w-5 plm-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {showCardView ? (
          /* ──── Card View ──── */
          <div className="plm-px-5 plm-pt-4 plm-pb-2 plm-flex plm-flex-col plm-items-center plm-space-y-4">
            <InteractiveCard
              key={player.id}
              player={player}
              enterFrom={enterFrom}
              onDismiss={closeModal}
              onNext={navigation.next ? handleNext : undefined}
              onPrev={navigation.prev ? handlePrev : undefined}
              cardBack={
                <RetroPlayerCard
                  player={player}
                  clubId={targetClub.id}
                  clubName={targetClub.name}
                  clubColors={targetClub.colors}
                  size="lg"
                  disableFlip
                  forceFlipped
                />
              }
            >
              <RetroPlayerCard
                player={player}
                clubId={targetClub.id}
                clubName={targetClub.name}
                clubColors={targetClub.colors}
                size="lg"
                disableFlip
              />
            </InteractiveCard>
            {/* Market value under card */}
            <div className="plm-flex plm-items-center plm-justify-center plm-gap-2">
              <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
                Value
              </span>
              <span className="plm-text-lg plm-font-bold plm-text-charcoal">
                &pound;{marketValue.toFixed(1)}M
              </span>
            </div>
            {/* Action buttons */}
            {!player.isTemporary && (
              <div className="plm-space-y-2 plm-pt-1 plm-w-full">
                {isOwnClub ? (
                  <OwnClubActions
                    player={player}
                    clubId={clubId!}
                    isListed={isListed}
                    isTransferWindow={isTransferWindow}
                    onListForSale={handleListForSale}
                  />
                ) : (
                  <OtherClubActions
                    player={player}
                    clubId={clubIdSnapshotRef.current || clubId!}
                    isOnShortlist={isOnShortlist}
                    isTransferWindow={isTransferWindow}
                    playerTransferred={playerTransferred}
                    onToggleShortlist={() => toggleShortlist(player.id)}
                    onCelebration={setCelebrationData}
                  />
                )}
              </div>
            )}
          </div>
        ) : (
          /* ──── Stats View (original) ──── */
          <div className="plm-px-5 plm-pt-4 plm-space-y-5">
            {/* Stats bars */}
            <div>
              <h3 className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400 plm-mb-2">
                Attributes
              </h3>
              <div className="plm-space-y-2">
                {STAT_KEYS.map((stat) => {
                  const value = player.stats[stat];
                  const pct = Math.round((value / 99) * 100);
                  const label = getStatLabel(player.position, stat);
                  const longName = getStatLongName(player.position, stat);
                  return (
                    <div key={stat} className="plm-flex plm-items-center plm-gap-2">
                      <span
                        className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-500 plm-w-8 plm-text-right"
                        title={longName}
                      >
                        {label}
                      </span>
                      <div className="plm-flex-1 plm-h-2.5 plm-bg-warm-100 plm-rounded-full plm-overflow-hidden">
                        <div
                          className={`plm-h-full plm-rounded-full plm-transition-all ${STAT_COLORS[stat]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="plm-text-xs plm-font-bold plm-tabular-nums plm-text-charcoal plm-w-7 plm-text-right">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form indicator */}
            <div className="plm-flex plm-items-center plm-gap-3">
              <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
                Form
              </span>
              <span
                className={`plm-text-sm plm-font-bold plm-px-3 plm-py-1 plm-rounded-full ${getFormColor(player.form)}`}
              >
                {formatFormValue(player.form)}
              </span>
            </div>

            {/* Season stats */}
            {!player.isTemporary && (
              <div>
                <h3 className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400 plm-mb-2">
                  Season Stats
                </h3>
                <div className="plm-grid plm-grid-cols-3 plm-gap-2">
                  <StatBox label="Goals" value={player.goals} />
                  <StatBox label="Assists" value={player.assists} />
                  <StatBox label="Clean Sheets" value={player.cleanSheets} />
                </div>
              </div>
            )}

            {/* Market value */}
            <div className="plm-flex plm-items-center plm-justify-between plm-bg-warm-50 plm-rounded-lg plm-px-4 plm-py-3">
              <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
                Market Value
              </span>
              <span className="plm-text-lg plm-font-bold plm-text-charcoal">
                &pound;{marketValue.toFixed(1)}M
              </span>
            </div>

            {/* Club info */}
            <div className="plm-flex plm-items-center plm-gap-2 plm-text-xs plm-text-warm-500">
              <img
                src={getClubLogoUrl(targetClub.id)}
                alt=""
                className="plm-w-5 plm-h-5 plm-flex-shrink-0 plm-object-contain"
              />
              <span>{targetClub.name}</span>
            </div>

            {/* Action buttons */}
            {!player.isTemporary && (
              <div className="plm-space-y-2 plm-pt-1">
                {isOwnClub ? (
                  <OwnClubActions
                    player={player}
                    clubId={clubId!}
                    isListed={isListed}
                    isTransferWindow={isTransferWindow}
                    onListForSale={handleListForSale}
                  />
                ) : (
                  <OtherClubActions
                    player={player}
                    clubId={clubIdSnapshotRef.current || clubId!}
                    isOnShortlist={isOnShortlist}
                    isTransferWindow={isTransferWindow}
                    playerTransferred={playerTransferred}
                    onToggleShortlist={() => toggleShortlist(player.id)}
                    onCelebration={setCelebrationData}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Signing Celebration overlay */}
      {celebrationData && (
        <SigningCelebrationModal data={celebrationData} onDismiss={handleCelebrationDismiss} />
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="plm-text-center plm-bg-warm-50 plm-rounded-lg plm-py-2.5 plm-px-2">
      <div className="plm-text-[10px] plm-text-warm-400 plm-uppercase plm-tracking-wide">{label}</div>
      <div className="plm-text-lg plm-font-bold plm-text-charcoal plm-tabular-nums">{value}</div>
    </div>
  );
}

function OwnClubActions({
  player,
  clubId: _clubId,
  isListed,
  isTransferWindow,
  onListForSale,
}: {
  player: Player;
  clubId: string;
  isListed: boolean;
  isTransferWindow: boolean;
  onListForSale: () => void;
}) {
  const canSellAbroad = !player.acquiredThisWindow;

  return (
    <>
      {isTransferWindow && (
        <>
          <button
            onClick={onListForSale}
            disabled={isListed}
            className="plm-w-full plm-py-3 plm-px-4 plm-rounded-lg plm-text-sm plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-bg-charcoal plm-text-white hover:plm-bg-charcoal-light disabled:plm-opacity-40 disabled:plm-cursor-not-allowed"
          >
            {isListed ? 'Already Listed' : 'List for Sale'}
          </button>
          <div className="plm-relative plm-group">
            <button
              disabled={!canSellAbroad}
              className="plm-w-full plm-py-3 plm-px-4 plm-rounded-lg plm-text-sm plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-border plm-border-warm-300 plm-text-warm-700 hover:plm-bg-warm-50 disabled:plm-opacity-40 disabled:plm-cursor-not-allowed"
            >
              Sell to Continent
            </button>
            <p className="plm-text-[11px] plm-text-warm-500 plm-text-center plm-mt-1 plm-leading-snug">
              Immediate sale at below market value (roughly 70%).
            </p>
            {!canSellAbroad && (
              <div className="plm-absolute plm-bottom-full plm-left-1/2 plm-transform plm--translate-x-1/2 plm-mb-2 plm-px-3 plm-py-2 plm-bg-charcoal plm-text-white plm-text-xs plm-rounded-lg plm-whitespace-nowrap plm-opacity-0 group-hover:plm-opacity-100 plm-transition-opacity plm-pointer-events-none plm-z-20">
                Recently signed — cannot sell abroad this window.
                <div className="plm-absolute plm-top-full plm-left-1/2 plm-transform plm--translate-x-1/2 plm-border-4 plm-border-transparent plm-border-t-charcoal" />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

type OfferResult = {
  type: 'accepted' | 'rejected' | 'countered' | 'player_refused';
  counterFee?: number;
  message: string;
};

function OtherClubActions({
  player,
  clubId,
  isOnShortlist,
  isTransferWindow,
  playerTransferred,
  onToggleShortlist,
  onCelebration,
}: {
  player: Player;
  clubId: string;
  isOnShortlist: boolean;
  isTransferWindow: boolean;
  playerTransferred: boolean;
  onToggleShortlist: () => void;
  onCelebration: (data: SigningCelebrationData) => void;
}) {
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerFee, setOfferFee] = useState('');
  const [offerResult, setOfferResult] = useState<OfferResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store actions
  const clubs = useGameStore((s) => s.clubs);
  const manager = useGameStore((s) => s.manager);
  const budgets = useGameStore((s) => s.budgets);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const addTransferOffer = useGameStore((s) => s.addTransferOffer);
  const removePlayerFromClub = useGameStore((s) => s.removePlayerFromClub);
  const addPlayerToClub = useGameStore((s) => s.addPlayerToClub);
  const adjustBudget = useGameStore((s) => s.adjustBudget);
  const recordTransfer = useGameStore((s) => s.recordTransfer);
  const removeMarketListing = useGameStore((s) => s.removeMarketListing);
  const removeFromShortlist = useGameStore((s) => s.removeFromShortlist);
  const addTickerMessage = useGameStore((s) => s.addTickerMessage);

  const playerClubId = manager?.clubId || '';
  const playerClub = clubs.find((c) => c.id === playerClubId);
  const playerBudget = budgets[playerClubId] || 0;
  const sellerClub = clubs.find((c) => c.id === clubId);
  const windowType: 'summer' | 'january' = (currentPhase === 'january_window' || currentPhase === 'january_deadline') ? 'january' : 'summer';

  const marketValue = refreshPlayerValue(player);

  // Check if player already has a pending/countered outgoing offer
  const transferOffers = useGameStore((s) => s.transferOffers);
  const existingOffer = transferOffers.find(
    (o) => o.playerId === player.id && o.direction === 'outgoing' && (o.status === 'pending' || o.status === 'countered'),
  );

  const handleShowOfferForm = () => {
    // Pre-fill with asking price from market listing, or market value
    const listing = useGameStore.getState().marketListings.find((l) => l.playerId === player.id);
    const suggestedFee = listing ? listing.askingPrice : marketValue;
    setOfferFee(suggestedFee.toFixed(1));
    setOfferResult(null);
    setShowOfferForm(true);
  };

  const handleSubmitOffer = () => {
    const fee = parseFloat(offerFee);
    if (isNaN(fee) || fee <= 0 || fee > playerBudget || !sellerClub) return;

    setIsSubmitting(true);
    const roundedFee = Math.round(fee * 10) / 10;

    const rng = new SeededRNG(`offer-${player.id}-${Date.now()}`);
    const evaluation = evaluateOffer(
      rng,
      roundedFee,
      player,
      sellerClub,
      playerClubId,
      playerClub?.tier || 3,
      clubs,
    );

    const offerId = `offer-${rng.randomInt(10000, 99999)}`;

    if (evaluation.accepted) {
      const refused = checkPlayerRefusal(rng, player, playerClub?.tier || 3, sellerClub.tier);
      if (refused) {
        addTransferOffer({
          id: offerId,
          playerId: player.id,
          playerName: player.name,
          playerPosition: player.position,
          playerOverall: player.overall,
          playerAge: player.age,
          fromClubId: clubId,
          toClubId: playerClubId,
          fee: roundedFee,
          status: 'player_refused',
          direction: 'outgoing',
        });
        addTickerMessage(`${player.name} refused to join ${playerClub?.name}.`);
        setOfferResult({
          type: 'player_refused',
          message: `${player.name} has refused to join your club.`,
        });
        setIsSubmitting(false);
        return;
      }

      // Transfer accepted!
      removePlayerFromClub(clubId, player.id);
      addPlayerToClub(playerClubId, resetProgressionForTransfer(player));
      adjustBudget(playerClubId, -roundedFee);
      adjustBudget(clubId, roundedFee);
      removeMarketListing(player.id);
      removeFromShortlist(player.id);

      const record: TransferRecord = {
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: clubId,
        toClubId: playerClubId,
        fee: roundedFee,
        season: seasonNumber,
        window: windowType,
      };
      recordTransfer(record);

      addTransferOffer({
        id: offerId,
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: clubId,
        toClubId: playerClubId,
        fee: roundedFee,
        status: 'accepted',
        direction: 'outgoing',
      });
      addTickerMessage(
        `${playerClub?.name} signed ${player.name} (${player.position}, ${player.overall}) from ${sellerClub.name} for £${roundedFee}M.`,
      );
      setOfferResult({
        type: 'accepted',
        message: `${sellerClub.name} accepted! ${player.name} has joined your squad.`,
      });
      // Fire celebration modal
      onCelebration({
        player: { ...player },
        fee: roundedFee,
        fromClubId: clubId,
        fromClubName: sellerClub.name,
      });
    } else if (evaluation.counterFee !== null) {
      addTransferOffer({
        id: offerId,
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: clubId,
        toClubId: playerClubId,
        fee: roundedFee,
        status: 'countered',
        counterFee: evaluation.counterFee,
        direction: 'outgoing',
      });
      setOfferResult({
        type: 'countered',
        counterFee: evaluation.counterFee,
        message: `${sellerClub.name} want £${evaluation.counterFee.toFixed(1)}M instead.`,
      });
    } else {
      addTransferOffer({
        id: offerId,
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: clubId,
        toClubId: playerClubId,
        fee: roundedFee,
        status: 'rejected',
        direction: 'outgoing',
      });
      setOfferResult({
        type: 'rejected',
        message: `${sellerClub.name} rejected your offer outright.`,
      });
    }

    setIsSubmitting(false);
  };

  const handleAcceptCounter = () => {
    if (!offerResult?.counterFee || !sellerClub) return;
    const counterFee = offerResult.counterFee;
    if (counterFee > playerBudget) return;

    // Find the countered offer in the store
    const outgoing = useGameStore.getState().transferOffers.find(
      (o) => o.playerId === player.id && o.direction === 'outgoing' && o.status === 'countered',
    );

    const rng = new SeededRNG(`accept-counter-${player.id}-${Date.now()}`);
    const refused = checkPlayerRefusal(rng, player, playerClub?.tier || 3, sellerClub.tier);

    if (refused) {
      if (outgoing) {
        useGameStore.getState().updateTransferOffer(outgoing.id, 'player_refused');
      }
      addTickerMessage(`${player.name} refused to join ${playerClub?.name}.`);
      setOfferResult({
        type: 'player_refused',
        message: `${player.name} has refused to join your club.`,
      });
      return;
    }

    removePlayerFromClub(clubId, player.id);
    addPlayerToClub(playerClubId, resetProgressionForTransfer(player));
    adjustBudget(playerClubId, -counterFee);
    adjustBudget(clubId, counterFee);
    removeMarketListing(player.id);
    removeFromShortlist(player.id);

    if (outgoing) {
      useGameStore.getState().updateTransferOffer(outgoing.id, 'accepted');
    }

    const record: TransferRecord = {
      playerId: player.id,
      playerName: player.name,
      playerPosition: player.position,
      playerOverall: player.overall,
      playerAge: player.age,
      fromClubId: clubId,
      toClubId: playerClubId,
      fee: counterFee,
      season: seasonNumber,
      window: windowType,
    };
    recordTransfer(record);
    addTickerMessage(
      `${playerClub?.name} signed ${player.name} (${player.position}, ${player.overall}) from ${sellerClub.name} for £${counterFee}M.`,
    );
    setOfferResult({
      type: 'accepted',
      message: `Deal done! ${player.name} has joined your squad for £${counterFee}M.`,
    });
    // Fire celebration modal
    onCelebration({
      player: { ...player },
      fee: counterFee,
      fromClubId: clubId,
      fromClubName: sellerClub.name,
    });
  };

  // Result styling
  const resultStyles: Record<string, string> = {
    accepted: 'plm-bg-emerald-50 plm-border-emerald-200 plm-text-emerald-700',
    rejected: 'plm-bg-red-50 plm-border-red-200 plm-text-red-700',
    countered: 'plm-bg-blue-50 plm-border-blue-200 plm-text-blue-700',
    player_refused: 'plm-bg-orange-50 plm-border-orange-200 plm-text-orange-700',
  };

  const resultIcons: Record<string, string> = {
    accepted: '✅',
    rejected: '❌',
    countered: '💬',
    player_refused: '🚫',
  };

  return (
    <>
      {isTransferWindow && (
        <>
          {/* Offer result feedback */}
          {offerResult && (
            <div className={`plm-rounded-lg plm-border plm-p-3 ${resultStyles[offerResult.type]}`}>
              <div className="plm-flex plm-items-start plm-gap-2">
                <span className="plm-text-base plm-flex-shrink-0">{resultIcons[offerResult.type]}</span>
                <div className="plm-flex-1">
                  <p className="plm-text-sm plm-font-medium">{offerResult.message}</p>
                  {offerResult.type === 'countered' && offerResult.counterFee && (
                    <div className="plm-mt-2 plm-flex plm-gap-2">
                      <button
                        onClick={handleAcceptCounter}
                        disabled={offerResult.counterFee > playerBudget}
                        className="plm-bg-blue-600 plm-text-white plm-text-sm plm-font-medium plm-px-4 plm-py-2.5 plm-rounded-lg hover:plm-bg-blue-700 disabled:plm-opacity-40 disabled:plm-cursor-not-allowed plm-transition-colors plm-min-h-[44px]"
                      >
                        Accept £{offerResult.counterFee.toFixed(1)}M
                      </button>
                      {offerResult.counterFee > playerBudget && (
                        <span className="plm-text-xs plm-text-red-600 plm-self-center">
                          Exceeds budget
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Make Offer button / form */}
          {!showOfferForm && !offerResult && !existingOffer && (
            <button
              onClick={handleShowOfferForm}
              className="plm-w-full plm-py-3 plm-px-4 plm-rounded-lg plm-text-sm plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-bg-charcoal plm-text-white hover:plm-bg-charcoal-light"
            >
              Make Offer
            </button>
          )}

          {/* Existing offer indicator */}
          {existingOffer && !offerResult && (
            <div className="plm-rounded-lg plm-border plm-border-yellow-200 plm-bg-yellow-50 plm-p-3">
              <p className="plm-text-sm plm-font-medium plm-text-yellow-700">
                You already have a {existingOffer.status} offer of £{existingOffer.fee.toFixed(1)}M for this player.
              </p>
            </div>
          )}

          {/* Offer form */}
          {showOfferForm && !offerResult && (() => {
            const parsedFee = parseFloat(offerFee);
            const hasValidFee = !isNaN(parsedFee) && parsedFee > 0;
            const remainingAfterBid = hasValidFee ? playerBudget - parsedFee : playerBudget;
            const overBudget = hasValidFee && parsedFee > playerBudget;
            return (
              <div className="plm-rounded-lg plm-border plm-border-warm-200 plm-bg-warm-50 plm-p-3 plm-space-y-3">
                <div className="plm-flex plm-items-center plm-justify-between plm-gap-2">
                  <span className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-500">
                    Your Offer
                  </span>
                  {/* Budget chip — solid pill so it reads as a stat rather
                      than a footnote. Tabular nums keep alignment steady
                      while the user types. */}
                  <span
                    className="plm-inline-flex plm-items-center plm-gap-1 plm-rounded-full plm-bg-charcoal plm-text-white plm-px-2.5 plm-py-1 plm-text-[11px] plm-font-semibold plm-tabular-nums"
                    title="Your remaining transfer budget for this window"
                  >
                    <span className="plm-text-amber-300" aria-hidden>£</span>
                    {playerBudget.toFixed(1)}M
                    <span className="plm-text-warm-300 plm-uppercase plm-tracking-wider plm-text-[9px] plm-font-bold plm-ml-0.5">
                      Budget
                    </span>
                  </span>
                </div>
                <div className="plm-flex plm-gap-2">
                  <div className="plm-relative plm-flex-1">
                    <span className="plm-absolute plm-left-3 plm-top-1/2 plm--translate-y-1/2 plm-text-sm plm-text-warm-400">£</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max={playerBudget}
                      value={offerFee}
                      onChange={(e) => setOfferFee(e.target.value)}
                      className="plm-w-full plm-border plm-border-warm-300 plm-rounded-lg plm-pl-7 plm-pr-8 plm-py-2.5 plm-text-sm plm-min-h-[44px] plm-bg-white"
                      placeholder="0.0"
                      aria-label="Offer amount in millions"
                    />
                    <span className="plm-absolute plm-right-3 plm-top-1/2 plm--translate-y-1/2 plm-text-sm plm-text-warm-400">M</span>
                  </div>
                  <button
                    onClick={handleSubmitOffer}
                    disabled={
                      isSubmitting ||
                      !offerFee ||
                      parsedFee <= 0 ||
                      overBudget ||
                      isNaN(parsedFee)
                    }
                    className="plm-bg-charcoal plm-text-white plm-text-sm plm-font-semibold plm-px-5 plm-py-2.5 plm-rounded-lg hover:plm-bg-charcoal-light disabled:plm-opacity-40 disabled:plm-cursor-not-allowed plm-transition-colors plm-whitespace-nowrap plm-min-h-[44px]"
                  >
                    {isSubmitting ? 'Sending…' : 'Submit'}
                  </button>
                </div>

                {/* Remaining-after-bid — live math so the user can size
                    their offer without leaving the modal. Goes red on
                    overspend and surfaces the deficit. */}
                <div className="plm-flex plm-items-center plm-justify-between plm-text-xs plm-tabular-nums">
                  <span className="plm-text-warm-500">
                    Market value: £{marketValue.toFixed(1)}M
                  </span>
                  <span
                    className={
                      overBudget
                        ? 'plm-font-semibold plm-text-red-600'
                        : hasValidFee
                          ? 'plm-font-semibold plm-text-warm-700'
                          : 'plm-text-warm-500'
                    }
                  >
                    {overBudget
                      ? `Over by £${(parsedFee - playerBudget).toFixed(1)}M`
                      : `Remaining after bid: £${remainingAfterBid.toFixed(1)}M`}
                  </span>
                </div>

                <button
                  onClick={() => setShowOfferForm(false)}
                  className="plm-text-xs plm-text-warm-500 hover:plm-text-warm-700 plm-underline"
                >
                  Cancel
                </button>
              </div>
            );
          })()}
        </>
      )}
      {!playerTransferred && (
        <button
          onClick={onToggleShortlist}
          aria-pressed={isOnShortlist}
          className={`plm-w-full plm-py-3 plm-px-4 plm-rounded-lg plm-text-sm plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-border ${
            isOnShortlist
              ? 'plm-border-amber-400 plm-bg-amber-50 plm-text-amber-700 hover:plm-bg-amber-100'
              : 'plm-border-warm-300 plm-text-warm-700 hover:plm-bg-warm-50'
          }`}
        >
          {isOnShortlist ? '★ Remove from Shortlist' : '☆ Add to Shortlist'}
        </button>
      )}
    </>
  );
}
