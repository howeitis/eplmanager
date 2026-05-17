import { useCallback, useRef, useState } from 'react';
import { RetroPlayerCard } from '../RetroPlayerCard';
import { InteractiveCard, type InteractiveCardHandle } from '../InteractiveCard';
import { OwnClubActions } from './OwnClubActions';
import { OtherClubActions } from './OtherClubActions';
import type { Player, Club } from '@/types/entities';
import type { SigningCelebrationData } from '../SigningCelebrationModal';

interface PlayerCardViewProps {
  player: Player;
  targetClub: Club;
  clubId: string;
  marketValue: number;
  enterFrom: 'left' | 'right' | null;
  isOwnClub: boolean;
  isListed: boolean;
  isOnShortlist: boolean;
  isTransferWindow: boolean;
  playerTransferred: boolean;
  onListForSale: () => void;
  onToggleShortlist: () => void;
  onCelebration: (data: SigningCelebrationData) => void;
  onDismiss: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}

/**
 * Card-first detail view: tilt-flip card up top, value + flip control, then
 * the per-relationship action set (sell vs. offer). Default view of the
 * PlayerDetailModal.
 */
export function PlayerCardView({
  player,
  targetClub,
  clubId,
  marketValue,
  enterFrom,
  isOwnClub,
  isListed,
  isOnShortlist,
  isTransferWindow,
  playerTransferred,
  onListForSale,
  onToggleShortlist,
  onCelebration,
  onDismiss,
  onNext,
  onPrev,
}: PlayerCardViewProps) {
  const cardHandleRef = useRef<InteractiveCardHandle>(null);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const handleFlip = useCallback(() => {
    cardHandleRef.current?.flip();
    // Label is driven by onFlipChange below — no optimistic toggle here.
    // Toggling locally would drift out of sync if the card's internal
    // debounce swallowed the flip (e.g. rapid double-click).
  }, []);

  return (
    <div className="plm-px-5 plm-pt-4 plm-pb-2 plm-flex plm-flex-col plm-items-center plm-space-y-4">
      <InteractiveCard
        key={player.id}
        ref={cardHandleRef}
        player={player}
        enterFrom={enterFrom}
        onDismiss={onDismiss}
        onNext={onNext}
        onPrev={onPrev}
        onFlipChange={setIsCardFlipped}
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

      {/* Flip + Value row. The explicit Flip button is the reliable
          path to the back face — tap-to-flip on the card itself works
          too, but the button guarantees access on every browser. */}
      <div className="plm-flex plm-items-center plm-justify-center plm-gap-4">
        <button
          type="button"
          onClick={handleFlip}
          aria-pressed={isCardFlipped}
          className="plm-inline-flex plm-items-center plm-gap-1.5 plm-px-3.5 plm-rounded-full plm-border plm-border-warm-300 plm-bg-white plm-text-[11px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-700 hover:plm-bg-warm-50 hover:plm-text-charcoal plm-transition-colors plm-min-h-[44px]"
        >
          <svg className="plm-w-3.5 plm-h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v6a2 2 0 002 2h12l-3-3m3 3l-3 3M21 17v-6a2 2 0 00-2-2H7l3 3m-3-3l3-3" />
          </svg>
          {isCardFlipped ? 'Show Front' : 'Flip Card'}
        </button>
        <div className="plm-flex plm-items-center plm-gap-2">
          <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
            Value
          </span>
          <span className="plm-text-lg plm-font-bold plm-text-charcoal">
            &pound;{marketValue.toFixed(1)}M
          </span>
        </div>
      </div>

      {/* Action buttons */}
      {!player.isTemporary && (
        <div className="plm-space-y-2 plm-pt-1 plm-w-full">
          {isOwnClub ? (
            <OwnClubActions
              player={player}
              clubId={clubId}
              isListed={isListed}
              isTransferWindow={isTransferWindow}
              onListForSale={onListForSale}
            />
          ) : (
            <OtherClubActions
              player={player}
              clubId={clubId}
              isOnShortlist={isOnShortlist}
              isTransferWindow={isTransferWindow}
              playerTransferred={playerTransferred}
              onToggleShortlist={onToggleShortlist}
              onCelebration={onCelebration}
            />
          )}
        </div>
      )}
    </div>
  );
}
