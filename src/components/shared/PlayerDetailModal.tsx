import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useModalParams, useModalBrowseList, navigateModalTo } from '@/hooks/useModalParams';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { refreshPlayerValue } from '@/engine/transfers';
import { SigningCelebrationModal } from './SigningCelebrationModal';
import type { SigningCelebrationData } from './SigningCelebrationModal';
import { PlayerCardView } from './playerDetail/PlayerCardView';
import { PlayerStatsView } from './playerDetail/PlayerStatsView';
import type { Club, Player } from '@/types/entities';

function findPlayerLocation(playerId: string, clubs: Club[]): { player: Player; clubId: string } | null {
  for (const club of clubs) {
    const player = club.roster.find((p) => p.id === playerId);
    if (player) return { player, clubId: club.id };
  }
  return null;
}

/**
 * Top-level player detail dialog. Coordinates browse navigation, view-mode
 * switching, snapshot-on-transfer, and the offer celebration overlay; the
 * heavy lifting (card flip physics, attribute bars, negotiation state) lives
 * in the sub-components under ./playerDetail/.
 */
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
  const isTransferWindow =
    currentPhase === 'summer_window' || currentPhase === 'july_advance'
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

  const [celebrationData, setCelebrationData] = useState<SigningCelebrationData | null>(null);
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
  const actionClubId = clubIdSnapshotRef.current || clubId!;

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

        {/* Sticky header — name, position, age, OVR, trait, injury/fill-in badges */}
        <div className="plm-sticky plm-top-0 plm-bg-white/95 plm-backdrop-blur-sm plm-z-10 plm-px-5 plm-pt-3 md:plm-pt-5 plm-pb-3 plm-border-b plm-border-warm-100">
          <div className="plm-flex plm-items-start plm-justify-between">
            <div className="plm-flex-1 plm-min-w-0">
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
                <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wide plm-bg-warm-100 plm-text-warm-600 plm-px-2 plm-py-0.5 plm-rounded-full">
                  {player.trait}
                </span>
                {player.injured && (
                  <span className="plm-text-[10px] plm-font-bold plm-bg-red-100 plm-text-red-600 plm-px-2 plm-py-0.5 plm-rounded-full">
                    🏥 INJ ({player.injuryWeeks}m)
                  </span>
                )}
                {player.isTemporary && (
                  <span className="plm-text-[10px] plm-font-medium plm-bg-warm-200 plm-text-warm-500 plm-px-2 plm-py-0.5 plm-rounded-full plm-uppercase">
                    Fill-in
                  </span>
                )}
              </div>
            </div>
            <div className="plm-flex plm-items-center plm-gap-1 plm-ml-3 plm-flex-shrink-0">
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
          <PlayerCardView
            player={player}
            targetClub={targetClub}
            clubId={actionClubId}
            marketValue={marketValue}
            enterFrom={enterFrom}
            isOwnClub={isOwnClub}
            isListed={isListed}
            isOnShortlist={isOnShortlist}
            isTransferWindow={isTransferWindow}
            playerTransferred={playerTransferred}
            onListForSale={handleListForSale}
            onToggleShortlist={() => toggleShortlist(player.id)}
            onCelebration={setCelebrationData}
            onDismiss={closeModal}
            onNext={navigation.next ? handleNext : undefined}
            onPrev={navigation.prev ? handlePrev : undefined}
          />
        ) : (
          <PlayerStatsView
            player={player}
            targetClub={targetClub}
            clubId={actionClubId}
            marketValue={marketValue}
            isOwnClub={isOwnClub}
            isListed={isListed}
            isOnShortlist={isOnShortlist}
            isTransferWindow={isTransferWindow}
            playerTransferred={playerTransferred}
            onListForSale={handleListForSale}
            onToggleShortlist={() => toggleShortlist(player.id)}
            onCelebration={setCelebrationData}
          />
        )}
      </div>

      {celebrationData && (
        <SigningCelebrationModal data={celebrationData} onDismiss={handleCelebrationDismiss} />
      )}
    </div>
  );
}
