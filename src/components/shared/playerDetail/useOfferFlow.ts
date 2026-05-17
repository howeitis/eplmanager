import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  refreshPlayerValue,
  evaluateOffer,
  checkPlayerRefusal,
} from '@/engine/transfers';
import { resetProgressionForTransfer } from '@/engine/playerGen';
import { SeededRNG } from '@/utils/rng';
import { mintPlayerCard } from '@/utils/binder';
import type { Player, TransferRecord } from '@/types/entities';
import type { SigningCelebrationData } from '../SigningCelebrationModal';

export type OfferResult =
  | { type: 'accepted'; counterFee?: undefined; message: string }
  | { type: 'rejected'; counterFee?: undefined; message: string }
  | { type: 'countered'; counterFee: number; message: string }
  | { type: 'player_refused'; counterFee?: undefined; message: string };

export interface UseOfferFlowParams {
  player: Player;
  sellerClubId: string;
  /** Called with a celebration payload when a deal completes. */
  onCelebration: (data: SigningCelebrationData) => void;
}

export interface OfferFlow {
  /** Live remaining budget for the player's club. */
  playerBudget: number;
  marketValue: number;
  offerResult: OfferResult | null;
  isSubmitting: boolean;
  submitOffer: (fee: number) => void;
  acceptCounter: () => void;
  resetResult: () => void;
}

/**
 * Encapsulates the negotiation state machine for an outgoing transfer
 * offer. Separated from the UI so the modal stays focused on layout —
 * the same flow is also reused when the modal is opened mid-window.
 *
 * Side effects on a successful deal:
 *   - moves the player between rosters
 *   - debits/credits both clubs' budgets
 *   - records the transfer in history
 *   - mints a `signing` binder card onto the manager's scrapbook
 *   - fires the signing celebration overlay via `onCelebration`
 */
export function useOfferFlow({ player, sellerClubId, onCelebration }: UseOfferFlowParams): OfferFlow {
  const [offerResult, setOfferResult] = useState<OfferResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const addBinderCards = useGameStore((s) => s.addBinderCards);

  const playerClubId = manager?.clubId || '';
  const playerClub = clubs.find((c) => c.id === playerClubId);
  const playerBudget = budgets[playerClubId] || 0;
  const sellerClub = clubs.find((c) => c.id === sellerClubId);
  const windowType: 'summer' | 'january' =
    currentPhase === 'january_window' || currentPhase === 'january_deadline' ? 'january' : 'summer';
  const marketValue = refreshPlayerValue(player);

  const completeDeal = useCallback(
    (fee: number) => {
      if (!sellerClub || !playerClub) return;
      removePlayerFromClub(sellerClubId, player.id);
      const transferred = resetProgressionForTransfer(player);
      addPlayerToClub(playerClubId, transferred);
      adjustBudget(playerClubId, -fee);
      adjustBudget(sellerClubId, fee);
      removeMarketListing(player.id);
      removeFromShortlist(player.id);

      const record: TransferRecord = {
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: sellerClubId,
        toClubId: playerClubId,
        fee,
        season: seasonNumber,
        window: windowType,
      };
      recordTransfer(record);

      // Mint a signing card onto the binder. Snapshot is the player AS
      // SIGNED (overall, age, trait at the moment of the transfer) — even
      // if they're sold next window, the card preserves the moment.
      addBinderCards([
        mintPlayerCard(transferred, playerClubId, seasonNumber, 'signing', { fee }),
      ]);

      addTickerMessage(
        `${playerClub.name} signed ${player.name} (${player.position}, ${player.overall}) from ${sellerClub.name} for £${fee}M.`,
      );

      onCelebration({
        player: { ...player },
        fee,
        fromClubId: sellerClubId,
        fromClubName: sellerClub.name,
      });
    },
    [
      sellerClub, playerClub, sellerClubId, playerClubId, player, seasonNumber, windowType,
      removePlayerFromClub, addPlayerToClub, adjustBudget, removeMarketListing,
      removeFromShortlist, recordTransfer, addTickerMessage, addBinderCards, onCelebration,
    ],
  );

  const submitOffer = useCallback(
    (fee: number) => {
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
      const baseOffer = {
        id: offerId,
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerOverall: player.overall,
        playerAge: player.age,
        fromClubId: sellerClubId,
        toClubId: playerClubId,
        fee: roundedFee,
        direction: 'outgoing' as const,
      };

      if (evaluation.accepted) {
        const refused = checkPlayerRefusal(rng, player, playerClub?.tier || 3, sellerClub.tier);
        if (refused) {
          addTransferOffer({ ...baseOffer, status: 'player_refused' });
          addTickerMessage(`${player.name} refused to join ${playerClub?.name}.`);
          setOfferResult({
            type: 'player_refused',
            message: `${player.name} has refused to join your club.`,
          });
          setIsSubmitting(false);
          return;
        }
        addTransferOffer({ ...baseOffer, status: 'accepted' });
        completeDeal(roundedFee);
        setOfferResult({
          type: 'accepted',
          message: `${sellerClub.name} accepted! ${player.name} has joined your squad.`,
        });
      } else if (evaluation.counterFee !== null) {
        addTransferOffer({ ...baseOffer, status: 'countered', counterFee: evaluation.counterFee });
        setOfferResult({
          type: 'countered',
          counterFee: evaluation.counterFee,
          message: `${sellerClub.name} want £${evaluation.counterFee.toFixed(1)}M instead.`,
        });
      } else {
        addTransferOffer({ ...baseOffer, status: 'rejected' });
        setOfferResult({
          type: 'rejected',
          message: `${sellerClub.name} rejected your offer outright.`,
        });
      }

      setIsSubmitting(false);
    },
    [
      playerBudget, sellerClub, sellerClubId, player, playerClub, playerClubId, clubs,
      addTransferOffer, addTickerMessage, completeDeal,
    ],
  );

  const acceptCounter = useCallback(() => {
    if (!offerResult || offerResult.type !== 'countered' || !sellerClub) return;
    const counterFee = offerResult.counterFee;
    if (counterFee > playerBudget) return;

    const outgoing = useGameStore
      .getState()
      .transferOffers.find(
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

    if (outgoing) {
      useGameStore.getState().updateTransferOffer(outgoing.id, 'accepted');
    }
    completeDeal(counterFee);
    setOfferResult({
      type: 'accepted',
      message: `Deal done! ${player.name} has joined your squad for £${counterFee}M.`,
    });
  }, [offerResult, sellerClub, playerBudget, player, playerClub, addTickerMessage, completeDeal]);

  const resetResult = useCallback(() => setOfferResult(null), []);

  return {
    playerBudget,
    marketValue,
    offerResult,
    isSubmitting,
    submitOffer,
    acceptCounter,
    resetResult,
  };
}
