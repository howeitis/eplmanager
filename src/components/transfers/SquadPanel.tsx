import { useMemo, useState } from 'react';
import type { Player, Club, Position } from '../../types/entities';
import { getContinentSalePrice, canSellToContinent, refreshPlayerValue } from '../../engine/transfers';
import { useModalParams } from '../../hooks/useModalParams';
import { useGameStore } from '../../store/gameStore';
import { getClubLogoUrl } from '../../data/assets';
import { ShortlistStar } from '../shared/ShortlistStar';

const POSITION_ORDER: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];
type SortKey = 'position' | 'overall' | 'age' | 'form';

interface SquadPanelProps {
  club: Club;
  onSellToContinent: (player: Player) => void;
}

export function SquadPanel({ club, onSellToContinent }: SquadPanelProps) {
  const [confirmSell, setConfirmSell] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [filterPos, setFilterPos] = useState<Position | 'ALL'>('ALL');
  const { openModal } = useModalParams();
  const marketListings = useGameStore((s) => s.marketListings);
  const addMarketListing = useGameStore((s) => s.addMarketListing);
  const listedIds = useMemo(() => new Set(marketListings.map((l) => l.playerId)), [marketListings]);

  const handleListForSale = (player: Player) => {
    if (listedIds.has(player.id)) return;
    const value = refreshPlayerValue(player);
    addMarketListing({
      playerId: player.id,
      clubId: club.id,
      askingPrice: Math.round(value * 1.1 * 10) / 10,
      listedByPlayer: false,
    });
  };

  const roster = useMemo(() => {
    let result = club.roster.filter((p) => !p.isTemporary);
    if (filterPos !== 'ALL') {
      result = result.filter((p) => p.position === filterPos);
    }
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case 'position': {
          const posA = POSITION_ORDER.indexOf(a.position);
          const posB = POSITION_ORDER.indexOf(b.position);
          if (posA !== posB) return posA - posB;
          return b.overall - a.overall;
        }
        case 'overall': return b.overall - a.overall;
        case 'age': return a.age - b.age;
        case 'form': return b.form - a.form;
        default: return 0;
      }
    });
    return result;
  }, [club.roster, sortKey, filterPos]);

  const handleConfirmSell = (player: Player) => {
    onSellToContinent(player);
    setConfirmSell(null);
  };

  return (
    <div>
      {/* Crest + player count inline */}
      <div className="plm-flex plm-items-center plm-gap-2 plm-mb-3">
        {getClubLogoUrl(club.id) && (
          <img
            src={getClubLogoUrl(club.id)}
            alt=""
            aria-hidden
            className="plm-w-7 plm-h-7 plm-object-contain plm-flex-shrink-0"
          />
        )}
        <span className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-tabular-nums">
          {roster.length} player{roster.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Position filter */}
      <div className="plm-flex plm-flex-wrap plm-items-center plm-gap-1.5 plm-mb-2" role="group" aria-label="Filter by position">
        <span className="plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-[0.15em] plm-font-semibold plm-mr-1">FILTER:</span>
        {(['ALL', ...POSITION_ORDER] as const).map((pos) => (
          <button
            key={pos}
            onClick={() => setFilterPos(pos)}
            aria-pressed={filterPos === pos}
            className={`plm-px-3 plm-py-1.5 plm-text-xs plm-font-medium plm-rounded plm-transition-colors plm-min-h-[44px] plm-min-w-[44px] ${
              filterPos === pos
                ? 'plm-bg-gray-900 plm-text-white'
                : 'plm-bg-gray-100 plm-text-gray-600 hover:plm-bg-gray-200'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="plm-flex plm-flex-wrap plm-items-center plm-gap-1 plm-mb-3" role="group" aria-label="Sort players">
        <span className="plm-text-[10px] plm-text-gray-500 plm-uppercase plm-tracking-wider plm-mr-1">Sort:</span>
        {(['position', 'overall', 'age', 'form'] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            aria-pressed={sortKey === key}
            className={`plm-px-2.5 plm-py-1.5 plm-text-xs plm-font-medium plm-rounded plm-transition-colors plm-min-h-[44px] ${
              sortKey === key
                ? 'plm-bg-gray-900 plm-text-white'
                : 'plm-bg-gray-100 plm-text-gray-600 hover:plm-bg-gray-200'
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      <div className="plm-grid plm-grid-cols-1 lg:plm-grid-cols-2 plm-gap-2">
        {roster.map((player) => {
          const salePrice = getContinentSalePrice(player);
          const canSell = canSellToContinent(player);
          const isConfirming = confirmSell === player.id;
          const isListed = listedIds.has(player.id);

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
                    {player.position} &middot; Age {player.age}
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

              {/* Side-by-side actions: Add to Transfer List + Sell to Continent */}
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
                <div className="plm-grid plm-grid-cols-2 plm-gap-2 plm-mt-2">
                  <button
                    onClick={() => handleListForSale(player)}
                    disabled={isListed || player.isTemporary}
                    className={`plm-text-xs plm-font-medium plm-px-3 plm-py-2.5 plm-rounded plm-transition-colors plm-min-h-[44px] plm-border ${
                      isListed
                        ? 'plm-bg-emerald-50 plm-text-emerald-700 plm-border-emerald-200 plm-cursor-default'
                        : player.isTemporary
                          ? 'plm-bg-gray-50 plm-text-gray-400 plm-cursor-not-allowed plm-border-gray-200'
                          : 'plm-bg-gray-100 plm-text-gray-700 hover:plm-bg-gray-200 plm-border-gray-300'
                    }`}
                    title={isListed ? 'Already on the transfer list' : 'Add to transfer list — clubs may bid.'}
                  >
                    {isListed ? '✓ On Transfer List' : 'Add to Transfer List'}
                  </button>
                  <button
                    onClick={() => canSell && setConfirmSell(player.id)}
                    disabled={!canSell}
                    className={`plm-text-xs plm-font-medium plm-px-3 plm-py-2.5 plm-rounded plm-transition-colors plm-min-h-[44px] plm-border ${
                      canSell
                        ? 'plm-bg-gray-100 plm-text-gray-700 hover:plm-bg-gray-200 plm-border-gray-300'
                        : 'plm-bg-gray-50 plm-text-gray-400 plm-cursor-not-allowed plm-border-gray-200'
                    }`}
                    title={
                      !canSell && player.acquiredThisWindow
                        ? 'Recently signed — cannot sell abroad until next season'
                        : !canSell && player.isTemporary
                          ? 'Cannot sell temporary fill-in'
                          : `Sell to continent for £${salePrice.toFixed(1)}M`
                    }
                  >
                    {canSell
                      ? `Sell Abroad £${salePrice.toFixed(1)}M`
                      : player.acquiredThisWindow
                        ? 'Recently Signed'
                        : 'Cannot Sell'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
