import { useMemo } from 'react';
import type { Player, Club, MarketListing } from '../../types/entities';
import { refreshPlayerValue } from '../../engine/transfers';
import { useGameStore } from '../../store/gameStore';
import { useModalParams } from '../../hooks/useModalParams';
import { ShortlistStar } from '../shared/ShortlistStar';

const ARCHETYPE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  star: { label: 'Star', bg: 'plm-bg-amber-100', text: 'plm-text-amber-700' },
  prospect: { label: 'Rising', bg: 'plm-bg-blue-100', text: 'plm-text-blue-700' },
  bargain: { label: 'Bargain', bg: 'plm-bg-green-100', text: 'plm-text-green-700' },
  trending: { label: 'Trending', bg: 'plm-bg-purple-100', text: 'plm-text-purple-700' },
};

interface FeaturedRowProps {
  listings: { player: Player; club: Club; listing: MarketListing }[];
  clubs: Club[];
  playerClubId: string;
}

export function FeaturedRow({ listings }: FeaturedRowProps) {
  const featuredSlots = useGameStore((s) => s.featuredSlots);
  const marketListings = useGameStore((s) => s.marketListings);
  const { openModal } = useModalParams();

  const featuredPlayers = useMemo(() => {
    return featuredSlots.map((slot) => {
      const match = listings.find((l) => l.player.id === slot.playerId);
      return match ? { ...match, archetype: slot.archetype } : null;
    }).filter(Boolean) as { player: Player; club: Club; listing: MarketListing; archetype: string }[];
  }, [featuredSlots, listings]);

  // Placeholder if fewer than 6 on the market
  const activeListingCount = marketListings.length;

  if (featuredSlots.length === 0 && activeListingCount >= 6) return null;

  return (
    <div className="plm-mb-4">
      <h3 className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-gray-400 plm-mb-2">
        Featured Players
      </h3>

      {activeListingCount < 6 && featuredPlayers.length === 0 ? (
        <div className="plm-bg-gray-50 plm-rounded-lg plm-border plm-border-gray-200 plm-p-4 plm-text-center">
          <p className="plm-text-sm plm-text-gray-400">
            Market quiet — check back next month.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: horizontally scrollable */}
          <div className="lg:plm-hidden plm-flex plm-gap-3 plm-overflow-x-auto plm-pb-2 plm-snap-x plm-snap-mandatory">
            {featuredPlayers.map(({ player, club, listing, archetype }) => (
              <FeaturedCard
                key={player.id}
                player={player}
                club={club}
                listing={listing}
                archetype={archetype}
                onOpen={() => openModal(player.id, club.id)}
              />
            ))}
            {activeListingCount < 6 && featuredPlayers.length < 6 && (
              Array.from({ length: 6 - featuredPlayers.length }).map((_, i) => (
                <div key={`placeholder-${i}`} className="plm-flex-shrink-0 plm-w-40 plm-snap-start plm-bg-gray-50 plm-rounded-lg plm-border plm-border-dashed plm-border-gray-300 plm-p-3 plm-flex plm-items-center plm-justify-center">
                  <span className="plm-text-xs plm-text-gray-400 plm-text-center">Market quiet</span>
                </div>
              ))
            )}
          </div>

          {/* Desktop: 3x2 grid */}
          <div className="plm-hidden lg:plm-grid lg:plm-grid-cols-3 lg:plm-gap-3">
            {featuredPlayers.map(({ player, club, listing, archetype }) => (
              <FeaturedCard
                key={player.id}
                player={player}
                club={club}
                listing={listing}
                archetype={archetype}
                onOpen={() => openModal(player.id, club.id)}
              />
            ))}
            {activeListingCount < 6 && featuredPlayers.length < 6 && (
              Array.from({ length: 6 - featuredPlayers.length }).map((_, i) => (
                <div key={`placeholder-${i}`} className="plm-bg-gray-50 plm-rounded-lg plm-border plm-border-dashed plm-border-gray-300 plm-p-3 plm-flex plm-items-center plm-justify-center plm-min-h-[80px]">
                  <span className="plm-text-xs plm-text-gray-400 plm-text-center">Market quiet</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FeaturedCard({
  player,
  club,
  listing: _listing,
  archetype,
  onOpen,
}: {
  player: Player;
  club: Club;
  listing: MarketListing;
  archetype: string;
  onOpen: () => void;
}) {
  const style = ARCHETYPE_STYLES[archetype] || ARCHETYPE_STYLES.trending;
  const marketVal = refreshPlayerValue(player);

  return (
    <div
      className="plm-flex-shrink-0 plm-w-40 lg:plm-w-auto plm-snap-start plm-bg-white plm-rounded-lg plm-border plm-border-gray-200 plm-p-3 plm-cursor-pointer hover:plm-shadow-sm plm-transition-shadow"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={`View featured player ${player.name}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    >
      <div className="plm-flex plm-items-center plm-justify-between plm-mb-1">
        <span className={`plm-text-[10px] plm-font-bold plm-uppercase plm-px-1.5 plm-py-0.5 plm-rounded ${style.bg} ${style.text}`}>
          {style.label}
        </span>
        <span className="plm-text-sm plm-font-bold plm-text-gray-900">{player.overall}</span>
      </div>
      <div className="plm-flex plm-items-center plm-gap-1">
        <ShortlistStar playerId={player.id} />
        <span className="plm-text-sm plm-font-semibold plm-text-gray-900 plm-truncate">{player.name}</span>
      </div>
      <div className="plm-text-xs plm-text-gray-500 plm-truncate">
        {club.shortName} &middot; {player.position} &middot; Age {player.age}
      </div>
      <div className="plm-text-xs plm-text-gray-400 plm-mt-1">
        &pound;{marketVal.toFixed(1)}M
      </div>
    </div>
  );
}
