import { useState, useMemo } from 'react';
import type { Player, Club, MarketListing, PlayerStats } from '../../types/entities';
import { refreshPlayerValue } from '../../engine/transfers';
import { useModalParams } from '../../hooks/useModalParams';
import { useGameStore } from '../../store/gameStore';
import { type MarketFilters } from '../../store/marketSlice';
import { MarketFilterPanel } from './MarketFilterPanel';
import { FeaturedRow } from './FeaturedRow';

interface MarketBoardProps {
  listings: { player: Player; club: Club; listing: MarketListing }[];
  budget: number;
  onMakeOffer: (playerId: string, sellerClubId: string, offerFee: number) => void;
  playerClubId: string;
  clubs: Club[];
}

export function countActiveFilters(filters: MarketFilters): number {
  let count = 0;
  if (filters.positions.length > 0) count++;
  if (filters.ageMin > 17 || filters.ageMax < 35) count++;
  if (filters.overallMin > 0 || filters.overallMax < 99) count++;
  if (filters.maxPrice !== null) count++;
  if (filters.nameSearch.trim() !== '') count++;
  const stats = filters.statThresholds;
  if (stats.ATK > 0 || stats.DEF > 0 || stats.MOV > 0 || stats.PWR > 0 || stats.MEN > 0 || stats.SKL > 0) count++;
  return count;
}

export function applyMarketFilters(
  listings: { player: Player; club: Club; listing: MarketListing }[],
  filters: MarketFilters,
  budget: number,
): { player: Player; club: Club; listing: MarketListing }[] {
  return listings.filter(({ player, listing }) => {
    // Position filter
    if (filters.positions.length > 0 && !filters.positions.includes(player.position)) return false;

    // Age range
    if (player.age < filters.ageMin || player.age > filters.ageMax) return false;

    // Overall range
    if (player.overall < filters.overallMin || player.overall > filters.overallMax) return false;

    // Max price
    const maxPrice = filters.maxPrice !== null ? filters.maxPrice : budget;
    if (listing.askingPrice > maxPrice) return false;

    // Stat thresholds
    const stats = filters.statThresholds;
    const keys: (keyof PlayerStats)[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];
    for (const key of keys) {
      if (stats[key] > 0 && player.stats[key] < stats[key]) return false;
    }

    // Name search (fuzzy, case-insensitive)
    if (filters.nameSearch.trim()) {
      const search = filters.nameSearch.toLowerCase().trim();
      if (!player.name.toLowerCase().includes(search)) return false;
    }

    return true;
  });
}


export function MarketBoard({ listings, budget, onMakeOffer, playerClubId, clubs }: MarketBoardProps) {
  const [sortBy, setSortBy] = useState<'overall' | 'value' | 'age'>('overall');
  const [offerInputs, setOfferInputs] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const { openModal } = useModalParams();

  const filters = useGameStore((s) => s.marketFilters);
  const setMarketFilters = useGameStore((s) => s.setMarketFilters);
  const resetMarketFilters = useGameStore((s) => s.resetMarketFilters);

  const activeFilterCount = countActiveFilters(filters);

  const filtered = useMemo(() => {
    let list = applyMarketFilters(listings, filters, budget);
    list.sort((a, b) => {
      if (sortBy === 'overall') return b.player.overall - a.player.overall;
      if (sortBy === 'value') return refreshPlayerValue(b.player) - refreshPlayerValue(a.player);
      return a.player.age - b.player.age;
    });
    return list;
  }, [listings, filters, budget, sortBy]);

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
      {/* Featured Row */}
      <FeaturedRow listings={listings} clubs={clubs} playerClubId={playerClubId} />

      <div className="plm-flex plm-items-center plm-justify-between plm-mb-3">
        <h2 className="plm-text-sm plm-font-bold plm-text-gray-900">Market Board</h2>
        <div className="plm-flex plm-items-center plm-gap-2">
          {/* Result count chip */}
          <span className="plm-text-xs plm-text-gray-500 plm-bg-gray-100 plm-rounded-full plm-px-2.5 plm-py-1">
            {filtered.length} player{filtered.length !== 1 ? 's' : ''} match
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={resetMarketFilters}
              className="plm-text-xs plm-text-red-600 hover:plm-text-red-800 plm-underline plm-min-h-[44px] plm-flex plm-items-center"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Desktop: inline filters. Mobile: toggle button + bottom sheet */}
      <div className="lg:plm-hidden plm-mb-3">
        <button
          onClick={() => setShowFilters(true)}
          className="plm-w-full plm-py-2.5 plm-text-sm plm-font-medium plm-rounded plm-border plm-border-gray-300 plm-bg-white plm-text-gray-700 hover:plm-bg-gray-50 plm-min-h-[44px] plm-flex plm-items-center plm-justify-center plm-gap-2"
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="plm-bg-gray-900 plm-text-white plm-text-xs plm-rounded-full plm-px-1.5 plm-py-0.5">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="lg:plm-flex lg:plm-gap-4">
        {/* Desktop: sidebar filters */}
        <div className="plm-hidden lg:plm-block lg:plm-w-64 lg:plm-flex-shrink-0">
          <MarketFilterPanel
            filters={filters}
            budget={budget}
            onChangeFilters={setMarketFilters}
            onReset={resetMarketFilters}
          />
        </div>

        {/* Mobile: bottom sheet filters */}
        {showFilters && (
          <div className="lg:plm-hidden plm-fixed plm-inset-0 plm-z-50 plm-flex plm-items-end plm-justify-center">
            <div
              className="plm-absolute plm-inset-0 plm-bg-black/50"
              onClick={() => setShowFilters(false)}
            />
            <div className="plm-relative plm-bg-white plm-w-full plm-max-h-[80vh] plm-rounded-t-2xl plm-overflow-y-auto plm-overscroll-contain plm-pb-6">
              <div className="plm-flex plm-justify-center plm-pt-3 plm-pb-1">
                <div className="plm-w-10 plm-h-1 plm-rounded-full plm-bg-gray-300" />
              </div>
              <div className="plm-px-4 plm-pt-2">
                <MarketFilterPanel
                  filters={filters}
                  budget={budget}
                  onChangeFilters={setMarketFilters}
                  onReset={resetMarketFilters}
                />
              </div>
              <div className="plm-sticky plm-bottom-0 plm-bg-white plm-border-t plm-border-gray-200 plm-p-4">
                <button
                  onClick={() => setShowFilters(false)}
                  className="plm-w-full plm-py-3 plm-bg-gray-900 plm-text-white plm-text-sm plm-font-semibold plm-rounded-lg plm-min-h-[44px]"
                >
                  Apply ({filtered.length} result{filtered.length !== 1 ? 's' : ''})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listings column */}
        <div className="plm-flex-1 plm-min-w-0">
          {/* Sort */}
          <div className="plm-flex plm-justify-end plm-mb-2">
            <label className="plm-sr-only" htmlFor="market-sort">Sort players by</label>
            <select
              id="market-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="plm-text-xs plm-border plm-border-gray-300 plm-rounded plm-px-2 plm-py-2 plm-bg-white plm-text-gray-700 plm-min-h-[44px]"
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
                No players match your filters.
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
      </div>
    </div>
  );
}
