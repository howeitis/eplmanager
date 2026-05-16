import { useMemo } from 'react';
import type { Player, Club, MarketListing } from '@/types/entities';
import { useGameStore } from '@/store/gameStore';
import { useModalParams } from '@/hooks/useModalParams';
import { RetroPlayerCard } from '@/components/shared/RetroPlayerCard';

const ARCHETYPE_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  star: { label: 'Star', bg: 'plm-bg-amber-50', text: 'plm-text-amber-700', border: 'plm-border-amber-200' },
  prospect: { label: 'Rising', bg: 'plm-bg-blue-50', text: 'plm-text-blue-700', border: 'plm-border-blue-200' },
  bargain: { label: 'Bargain', bg: 'plm-bg-emerald-50', text: 'plm-text-emerald-700', border: 'plm-border-emerald-200' },
  trending: { label: 'Trending', bg: 'plm-bg-purple-50', text: 'plm-text-purple-700', border: 'plm-border-purple-200' },
};

interface FeaturedRowProps {
  listings: { player: Player; club: Club; listing: MarketListing }[];
  clubs: Club[];
  playerClubId: string;
}

/**
 * Featured Players grid — now the full Market home page. Shows up to 12
 * players as small RetroPlayerCards arranged in a responsive grid. Tap a
 * card to open the player detail modal where offers are made.
 */
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

  const browseList = useMemo(() => featuredPlayers.map((f) => f.player.id), [featuredPlayers]);

  const activeListingCount = marketListings.length;

  if (featuredPlayers.length === 0) {
    return (
      <div className="plm-bg-warm-50 plm-rounded-2xl plm-border plm-border-warm-200 plm-p-8 plm-text-center">
        <p className="plm-text-sm plm-text-warm-500">
          {activeListingCount === 0
            ? 'Market is closed.'
            : 'Market quiet — check back next month.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul
        role="list"
        className="plm-grid plm-grid-cols-2 sm:plm-grid-cols-3 md:plm-grid-cols-4 lg:plm-grid-cols-5 xl:plm-grid-cols-6 plm-gap-3 plm-list-none plm-pl-0 plm-m-0"
      >
        {featuredPlayers.map(({ player, club, archetype }) => {
          const style = ARCHETYPE_STYLES[archetype] || ARCHETYPE_STYLES.trending;
          return (
            <li key={player.id} className="plm-flex plm-flex-col plm-items-center plm-gap-1.5">
              <button
                type="button"
                onClick={() => openModal(player.id, club.id, browseList)}
                aria-label={`Open ${player.name} — ${archetype} pick`}
                className="plm-block plm-rounded-xl focus-visible:plm-outline-none focus-visible:plm-ring-2 focus-visible:plm-ring-charcoal focus-visible:plm-ring-offset-2"
              >
                <RetroPlayerCard
                  player={player}
                  clubId={club.id}
                  clubName={club.name}
                  clubColors={club.colors}
                  size="sm"
                  disableFlip
                />
              </button>
              <span
                className={`plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-[0.12em] plm-px-1.5 plm-py-0.5 plm-rounded-full plm-border ${style.bg} ${style.text} ${style.border}`}
              >
                {style.label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Hidden-gems reminder */}
      <p className="plm-mt-6 plm-text-center plm-text-xs plm-text-warm-500 plm-italic plm-font-display plm-leading-relaxed">
        Looking for more? Click into any club from the league table to uncover hidden gems.
      </p>
    </div>
  );
}
