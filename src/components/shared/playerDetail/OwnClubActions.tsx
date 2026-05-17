import type { Player } from '@/types/entities';

interface OwnClubActionsProps {
  player: Player;
  clubId: string;
  isListed: boolean;
  isTransferWindow: boolean;
  onListForSale: () => void;
}

/**
 * Action row shown when the open player is on the user's own roster. In the
 * transfer window this is "List for Sale" + "Sell to Continent"; outside the
 * window nothing renders (the player isn't movable).
 *
 * `clubId` is intentionally unused for now — kept on the API for parity with
 * `OtherClubActions` and because future per-club logic (DOF deals, manager
 * approval) will need it.
 */
export function OwnClubActions({
  player,
  clubId: _clubId,
  isListed,
  isTransferWindow,
  onListForSale,
}: OwnClubActionsProps) {
  const canSellAbroad = !player.acquiredThisWindow;

  if (!isTransferWindow) return null;

  return (
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
  );
}
