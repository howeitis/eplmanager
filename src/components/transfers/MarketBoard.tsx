import { useState, useMemo } from 'react';
import type { Player, Club, MarketListing, Position } from '../../types/entities';
import { refreshPlayerValue } from '../../engine/transfers';
import { useModalParams } from '../../hooks/useModalParams';

interface MarketBoardProps {
  listings: { player: Player; club: Club; listing: MarketListing }[];
  budget: number;
  onMakeOffer: (playerId: string, sellerClubId: string, offerFee: number) => void;
  playerClubId: string;
  clubs: Club[];
}

const POSITIONS: (Position | 'ALL')[] = ['ALL', 'GK', 'CB', 'FB', 'MF', 'WG', 'ST'];

export function MarketBoard({ listings, budget, onMakeOffer }: MarketBoardProps) {
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'overall' | 'value' | 'age'>('overall');
  const [offerInputs, setOfferInputs] = useState<Record<string, string>>({});
  const { openModal } = useModalParams();

  const filtered = useMemo(() => {
    let list = [...listings];
    if (posFilter !== 'ALL') {
      list = list.filter((item) => item.player.position === posFilter);
    }
    list.sort((a, b) => {
      if (sortBy === 'overall') return b.player.overall - a.player.overall;
      if (sortBy === 'value') return refreshPlayerValue(b.player) - refreshPlayerValue(a.player);
      return a.player.age - b.player.age;
    });
    return list;
  }, [listings, posFilter, sortBy]);

  const handleOffer = (playerId: string, clubId: string) => {
    const feeStr = offerInputs[playerId];
    const fee = parseFloat(feeStr);
    if (isNaN(fee) || fee <= 0 || fee > budget) return;
    const rounded = Math.round(fee * 10) / 10;
    onMakeOffer(playerId, clubId, rounded);
    setOfferInputs((prev) => ({ ...prev, [playerId]: '' }));
  };

  return (
    <div>
      <h2 className="plm-text-sm plm-font-bold plm-text-gray-900 plm-mb-3">Market Board</h2>

      {/* Filters */}
      <div className="plm-flex plm-flex-wrap plm-gap-1.5 plm-mb-3" role="group" aria-label="Filter by position">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            aria-pressed={posFilter === pos}
            className={`plm-px-3 plm-py-2 plm-text-xs plm-font-medium plm-rounded plm-border plm-transition-colors plm-min-h-[44px] plm-min-w-[44px] ${
              posFilter === pos
                ? 'plm-bg-gray-900 plm-text-white plm-border-gray-900'
                : 'plm-bg-white plm-text-gray-600 plm-border-gray-300 hover:plm-border-gray-400'
            }`}
          >
            {pos}
          </button>
        ))}
        <label className="plm-sr-only" htmlFor="market-sort">Sort players by</label>
        <select
          id="market-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="plm-ml-auto plm-text-xs plm-border plm-border-gray-300 plm-rounded plm-px-2 plm-py-2 plm-bg-white plm-text-gray-700 plm-min-h-[44px]"
        >
          <option value="overall">Sort: Rating</option>
          <option value="value">Sort: Value</option>
          <option value="age">Sort: Age</option>
        </select>
      </div>

      {/* Listings */}
      <div className="plm-space-y-2">
        {filtered.length === 0 && (
          <p className="plm-text-sm plm-text-gray-400 plm-text-center plm-py-8">
            No players available{posFilter !== 'ALL' ? ` at ${posFilter}` : ''}.
          </p>
        )}
        {filtered.map(({ player, club, listing }) => {
          const marketVal = refreshPlayerValue(player);
          return (
            <div
              key={player.id}
              className="plm-bg-white plm-rounded-lg plm-border plm-border-gray-200 plm-p-3"
            >
              <div
                className="plm-flex plm-items-center plm-gap-2 plm-mb-2 plm-cursor-pointer"
                onClick={() => openModal(player.id, club.id)}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${player.name}`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(player.id, club.id); } }}
              >
                <div
                  className="plm-w-3 plm-h-3 plm-rounded-full plm-flex-shrink-0"
                  style={{ backgroundColor: club.colors.primary }}
                />
                <div className="plm-flex-1 plm-min-w-0">
                  <div className="plm-text-sm plm-font-semibold plm-text-gray-900 plm-truncate">
                    {player.name}
                  </div>
                  <div className="plm-text-xs plm-text-gray-500">
                    {club.shortName} &middot; {player.position} &middot; Age {player.age}
                  </div>
                </div>
                <div className="plm-text-right plm-flex-shrink-0">
                  <div className="plm-text-sm plm-font-bold plm-text-gray-900">
                    {player.overall}
                  </div>
                  <div className="plm-text-xs plm-text-gray-500">
                    &pound;{marketVal.toFixed(1)}M
                  </div>
                </div>
              </div>

              {/* Stats bar */}
              <div className="plm-grid plm-grid-cols-6 plm-gap-1 plm-mb-2">
                {(['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'] as const).map((stat) => (
                  <div key={stat} className="plm-text-center">
                    <div className="plm-text-[10px] plm-text-gray-400 plm-uppercase">{stat}</div>
                    <div className="plm-text-xs plm-font-medium plm-text-gray-700">
                      {player.stats[stat]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Trait + Form */}
              <div className="plm-flex plm-items-center plm-gap-2 plm-mb-2">
                <span className="plm-text-xs plm-bg-gray-100 plm-text-gray-600 plm-rounded plm-px-1.5 plm-py-0.5">
                  {player.trait}
                </span>
                <span className={`plm-text-xs plm-rounded plm-px-1.5 plm-py-0.5 ${
                  player.form > 0
                    ? 'plm-bg-green-50 plm-text-green-700'
                    : player.form < 0
                      ? 'plm-bg-red-50 plm-text-red-700'
                      : 'plm-bg-gray-50 plm-text-gray-600'
                }`}>
                  Form {player.form > 0 ? '+' : ''}{player.form}
                </span>
                <span className="plm-text-xs plm-text-gray-400">
                  Ask: &pound;{listing.askingPrice.toFixed(1)}M
                </span>
              </div>

              {/* Offer input */}
              <div className="plm-flex plm-gap-2">
                <label className="plm-sr-only" htmlFor={`offer-${player.id}`}>Offer amount for {player.name}</label>
                <input
                  id={`offer-${player.id}`}
                  type="number"
                  step="0.1"
                  min="0.5"
                  max={budget}
                  placeholder={`Offer (£M)`}
                  value={offerInputs[player.id] || ''}
                  onChange={(e) =>
                    setOfferInputs((prev) => ({ ...prev, [player.id]: e.target.value }))
                  }
                  className="plm-flex-1 plm-border plm-border-gray-300 plm-rounded plm-px-3 plm-py-2.5 plm-text-sm plm-min-w-0 plm-min-h-[44px]"
                />
                <button
                  onClick={() => handleOffer(player.id, club.id)}
                  disabled={
                    !offerInputs[player.id] ||
                    parseFloat(offerInputs[player.id]) > budget ||
                    parseFloat(offerInputs[player.id]) <= 0
                  }
                  className="plm-bg-gray-900 plm-text-white plm-text-sm plm-font-medium plm-px-4 plm-py-2.5 plm-rounded hover:plm-bg-gray-800 disabled:plm-opacity-40 disabled:plm-cursor-not-allowed plm-transition-colors plm-whitespace-nowrap plm-min-h-[44px]"
                >
                  Make Offer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
