import { useState } from 'react';
import type { Player, Club } from '../../types/entities';
import { getContinentSalePrice, canSellToContinent } from '../../engine/transfers';
import { useModalParams } from '../../hooks/useModalParams';
import { ShortlistStar } from '../shared/ShortlistStar';

interface SquadPanelProps {
  club: Club;
  onSellToContinent: (player: Player) => void;
}

export function SquadPanel({ club, onSellToContinent }: SquadPanelProps) {
  const [confirmSell, setConfirmSell] = useState<string | null>(null);
  const { openModal } = useModalParams();

  const roster = [...club.roster]
    .filter((p) => !p.isTemporary)
    .sort((a, b) => b.overall - a.overall);

  const handleConfirmSell = (player: Player) => {
    onSellToContinent(player);
    setConfirmSell(null);
  };

  return (
    <div>
      <h2 className="plm-text-sm plm-font-bold plm-text-gray-900 plm-mb-1">
        Your Squad
      </h2>
      <p className="plm-text-xs plm-text-gray-500 plm-mb-3">
        {roster.length} players
      </p>

      <div className="plm-space-y-2">
        {roster.map((player) => {
          const salePrice = getContinentSalePrice(player);
          const canSell = canSellToContinent(player);
          const isConfirming = confirmSell === player.id;

          return (
            <div
              key={player.id}
              className="plm-bg-white plm-rounded-lg plm-border plm-border-gray-200 plm-p-3"
            >
              <div
                className="plm-flex plm-items-center plm-gap-2 plm-mb-1 plm-cursor-pointer"
                onClick={() => openModal(player.id, club.id)}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${player.name}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(player.id, club.id); } }}
              >
                <ShortlistStar playerId={player.id} />
                <div className="plm-flex-1 plm-min-w-0">
                  <div className="plm-text-sm plm-font-semibold plm-text-gray-900 plm-truncate">
                    {player.name}
                  </div>
                  <div className="plm-text-xs plm-text-gray-500">
                    {player.position} &middot; Age {player.age} &middot; {player.trait}
                  </div>
                </div>
                <div className="plm-text-right plm-flex-shrink-0">
                  <div className="plm-text-sm plm-font-bold plm-text-gray-900">
                    {player.overall}
                  </div>
                  <div className={`plm-text-xs ${
                    player.form > 0 ? 'plm-text-green-600' : player.form < 0 ? 'plm-text-red-600' : 'plm-text-gray-500'
                  }`}>
                    Form {player.form > 0 ? '+' : ''}{player.form}
                  </div>
                </div>
              </div>

              {/* Injury badge */}
              {player.injured && (
                <div className="plm-text-xs plm-bg-red-50 plm-text-red-700 plm-rounded plm-px-2 plm-py-0.5 plm-mb-2 plm-inline-block">
                  Injured ({player.injuryWeeks} month{player.injuryWeeks !== 1 ? 's' : ''})
                </div>
              )}

              {/* Sell to Continent */}
              {isConfirming ? (
                <div role="alertdialog" aria-label={`Confirm sale of ${player.name}`} className="plm-bg-amber-50 plm-border plm-border-amber-200 plm-rounded plm-p-3 plm-mt-2">
                  <p className="plm-text-xs plm-text-amber-800 plm-mb-2">
                    Sell {player.name} abroad for &pound;{salePrice.toFixed(1)}M?
                  </p>
                  <div className="plm-flex plm-gap-2">
                    <button
                      onClick={() => handleConfirmSell(player)}
                      className="plm-bg-amber-600 plm-text-white plm-text-sm plm-font-medium plm-px-4 plm-py-2.5 plm-rounded hover:plm-bg-amber-700 plm-transition-colors plm-min-h-[44px]"
                    >
                      Confirm Sale
                    </button>
                    <button
                      onClick={() => setConfirmSell(null)}
                      className="plm-text-sm plm-text-gray-600 plm-px-4 plm-py-2.5 plm-rounded plm-border plm-border-gray-300 hover:plm-bg-gray-50 plm-transition-colors plm-min-h-[44px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => canSell && setConfirmSell(player.id)}
                  disabled={!canSell}
                  className={`plm-w-full plm-text-xs plm-font-medium plm-px-3 plm-py-2.5 plm-rounded plm-mt-2 plm-transition-colors plm-min-h-[44px] ${
                    canSell
                      ? 'plm-bg-gray-100 plm-text-gray-700 hover:plm-bg-gray-200 plm-border plm-border-gray-300'
                      : 'plm-bg-gray-50 plm-text-gray-400 plm-cursor-not-allowed plm-border plm-border-gray-200'
                  }`}
                  title={
                    !canSell && player.acquiredThisWindow
                      ? 'Recently signed — cannot sell abroad this window'
                      : !canSell && player.isTemporary
                        ? 'Cannot sell temporary fill-in'
                        : `Sell to continent for £${salePrice.toFixed(1)}M`
                  }
                >
                  {canSell
                    ? `Sell to Continent — £${salePrice.toFixed(1)}M`
                    : player.acquiredThisWindow
                      ? 'Recently signed — cannot sell abroad this window'
                      : 'Cannot sell'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
