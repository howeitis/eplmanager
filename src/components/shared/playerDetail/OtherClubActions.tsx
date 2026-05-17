import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useOfferFlow } from './useOfferFlow';
import type { Player } from '@/types/entities';
import type { SigningCelebrationData } from '../SigningCelebrationModal';

interface OtherClubActionsProps {
  player: Player;
  clubId: string;
  isOnShortlist: boolean;
  isTransferWindow: boolean;
  playerTransferred: boolean;
  onToggleShortlist: () => void;
  onCelebration: (data: SigningCelebrationData) => void;
}

/**
 * Action row when the open player is on another club's roster. Drives the
 * "Make Offer" → "Negotiating" → result loop via the useOfferFlow hook;
 * keeps the JSX focused on form layout and result presentation.
 */
export function OtherClubActions({
  player,
  clubId,
  isOnShortlist,
  isTransferWindow,
  playerTransferred,
  onToggleShortlist,
  onCelebration,
}: OtherClubActionsProps) {
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerFee, setOfferFee] = useState('');
  const transferOffers = useGameStore((s) => s.transferOffers);
  const marketListings = useGameStore((s) => s.marketListings);

  const { playerBudget, marketValue, offerResult, isSubmitting, submitOffer, acceptCounter } =
    useOfferFlow({ player, sellerClubId: clubId, onCelebration });

  const existingOffer = transferOffers.find(
    (o) =>
      o.playerId === player.id &&
      o.direction === 'outgoing' &&
      (o.status === 'pending' || o.status === 'countered'),
  );

  const handleShowOfferForm = () => {
    const listing = marketListings.find((l) => l.playerId === player.id);
    const suggestedFee = listing ? listing.askingPrice : marketValue;
    setOfferFee(suggestedFee.toFixed(1));
    setShowOfferForm(true);
  };

  const handleSubmit = () => {
    const fee = parseFloat(offerFee);
    submitOffer(fee);
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
          {/* Result feedback */}
          {offerResult && (
            <div className={`plm-rounded-lg plm-border plm-p-3 ${resultStyles[offerResult.type]}`}>
              <div className="plm-flex plm-items-start plm-gap-2">
                <span className="plm-text-base plm-flex-shrink-0">{resultIcons[offerResult.type]}</span>
                <div className="plm-flex-1">
                  <p className="plm-text-sm plm-font-medium">{offerResult.message}</p>
                  {offerResult.type === 'countered' && (
                    <div className="plm-mt-2 plm-flex plm-gap-2">
                      <button
                        onClick={acceptCounter}
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

          {/* Make Offer button */}
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
                    onClick={handleSubmit}
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
