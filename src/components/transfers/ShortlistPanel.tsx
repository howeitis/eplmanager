import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useModalParams } from '../../hooks/useModalParams';
import { refreshPlayerValue } from '../../engine/transfers';
import { getClubLogoUrl } from '../../data/assets';
import type { Club, Player, Position } from '../../types/entities';

type ShortlistStatus = 'at_club' | 'transferred' | 'signed' | 'retired';

const POSITION_ORDER: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];
type ShortlistSortKey = 'position' | 'overall' | 'age' | 'value';

interface ShortlistEntry {
  playerId: string;
  player: Player | null;
  club: Club | null;
  status: ShortlistStatus;
  newClubName?: string;
}

interface ShortlistPanelProps {
  clubs: Club[];
  playerClubId: string;
  isTransferWindow: boolean;
  onMakeOffer: (playerId: string, sellerClubId: string, offerFee: number) => void;
  budget: number;
}

export function ShortlistPanel({ clubs, playerClubId, isTransferWindow, onMakeOffer, budget }: ShortlistPanelProps) {
  const shortlist = useGameStore((s) => s.shortlist);
  const removeFromShortlist = useGameStore((s) => s.removeFromShortlist);
  const transferHistory = useGameStore((s) => s.transferHistory);
  const marketListings = useGameStore((s) => s.marketListings);
  const { openModal } = useModalParams();
  const [sortKey, setSortKey] = useState<ShortlistSortKey>('position');
  const [filterPos, setFilterPos] = useState<Position | 'ALL'>('ALL');

  const entries = useMemo<ShortlistEntry[]>(() => {
    return shortlist.map((playerId) => {
      // Check if the player is on your club
      const playerClub = clubs.find((c) => c.id === playerClubId);
      const onYourClub = playerClub?.roster.find((p) => p.id === playerId);
      if (onYourClub) {
        return { playerId, player: onYourClub, club: playerClub!, status: 'signed' as const };
      }

      // Check all clubs for the player
      for (const club of clubs) {
        const player = club.roster.find((p) => p.id === playerId);
        if (player) {
          // Check if player was transferred (not at original club)
          const wasTransferred = transferHistory.some(
            (t) => t.playerId === playerId && t.toClubId === club.id,
          );
          return {
            playerId,
            player,
            club,
            status: wasTransferred ? 'transferred' as const : 'at_club' as const,
            newClubName: wasTransferred ? club.name : undefined,
          };
        }
      }

      // Player not found — retired
      return { playerId, player: null, club: null, status: 'retired' as const };
    });
  }, [shortlist, clubs, playerClubId, transferHistory]);

  const visibleEntries = useMemo<ShortlistEntry[]>(() => {
    let result = entries;
    if (filterPos !== 'ALL') {
      result = result.filter((e) => e.player?.position === filterPos);
    }
    const sorted = [...result].sort((a, b) => {
      // Retired/unknown players always last
      if (!a.player && !b.player) return 0;
      if (!a.player) return 1;
      if (!b.player) return -1;
      switch (sortKey) {
        case 'position': {
          const posA = POSITION_ORDER.indexOf(a.player.position);
          const posB = POSITION_ORDER.indexOf(b.player.position);
          if (posA !== posB) return posA - posB;
          return b.player.overall - a.player.overall;
        }
        case 'overall': return b.player.overall - a.player.overall;
        case 'age': return a.player.age - b.player.age;
        case 'value': return refreshPlayerValue(b.player) - refreshPlayerValue(a.player);
        default: return 0;
      }
    });
    return sorted;
  }, [entries, filterPos, sortKey]);

  // Ordered ids for swipe-navigation in the detail modal — exclude retired
  // entries since their player record is gone and the modal can't render them.
  const browseList = useMemo(
    () => visibleEntries.filter((e) => e.player !== null).map((e) => e.playerId),
    [visibleEntries],
  );

  const openWithBrowse = (playerId: string, sellerClubId: string) =>
    openModal(playerId, sellerClubId, browseList);

  if (shortlist.length === 0) {
    return (
      <div className="plm-text-center plm-py-12">
        <div className="plm-text-3xl plm-mb-2">☆</div>
        <p className="plm-text-sm plm-text-gray-500">Your shortlist is empty.</p>
        <p className="plm-text-xs plm-text-gray-400 plm-mt-1">
          Star players from the Market Board or Club Squad Viewer to track them here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="plm-flex plm-items-center plm-justify-between plm-mb-3">
        <h2 className="plm-text-sm plm-font-bold plm-text-gray-900">Shortlist</h2>
        <span className="plm-text-xs plm-text-gray-500 plm-bg-gray-100 plm-rounded-full plm-px-2.5 plm-py-1">
          {shortlist.length} player{shortlist.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Position filter */}
      <div className="plm-flex plm-flex-wrap plm-gap-1.5 plm-mb-2" role="group" aria-label="Filter by position">
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
      <div className="plm-flex plm-flex-wrap plm-items-center plm-gap-1 plm-mb-3" role="group" aria-label="Sort shortlist">
        <span className="plm-text-[10px] plm-text-gray-500 plm-uppercase plm-tracking-wider plm-mr-1">Sort:</span>
        {(['position', 'overall', 'age', 'value'] as ShortlistSortKey[]).map((key) => (
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
        {visibleEntries.map((entry) => (
          <ShortlistRow
            key={entry.playerId}
            entry={entry}
            isTransferWindow={isTransferWindow}
            marketListings={marketListings}
            budget={budget}
            onOpenModal={openWithBrowse}
            onRemove={removeFromShortlist}
            onMakeOffer={onMakeOffer}
          />
        ))}
      </div>
    </div>
  );
}

function ShortlistRow({
  entry,
  isTransferWindow,
  marketListings,
  budget,
  onOpenModal,
  onRemove,
  onMakeOffer,
}: {
  entry: ShortlistEntry;
  isTransferWindow: boolean;
  marketListings: { playerId: string; clubId: string; askingPrice: number }[];
  budget: number;
  onOpenModal: (playerId: string, clubId: string) => void;
  onRemove: (playerId: string) => void;
  onMakeOffer: (playerId: string, clubId: string, fee: number) => void;
}) {
  const { playerId, player, club, status, newClubName } = entry;
  const listing = marketListings.find((l) => l.playerId === playerId);

  const statusLabel = (() => {
    switch (status) {
      case 'signed': return 'On your club';
      case 'transferred': return `Transferred to ${newClubName}`;
      case 'retired': return 'Retired';
      case 'at_club': return club ? `At ${club.name}` : '';
    }
  })();

  const statusColor = (() => {
    switch (status) {
      case 'signed': return 'plm-text-emerald-600';
      case 'transferred': return 'plm-text-blue-600';
      case 'retired': return 'plm-text-gray-400';
      case 'at_club': return 'plm-text-gray-500';
    }
  })();

  if (status === 'retired') {
    return (
      <div className="plm-bg-white plm-rounded-lg plm-border plm-border-gray-200 plm-p-3 plm-opacity-50">
        <div className="plm-flex plm-items-center plm-justify-between">
          <div>
            <div className="plm-text-sm plm-text-gray-400 plm-line-through">
              Player #{playerId.slice(0, 8)}
            </div>
            <div className={`plm-text-xs ${statusColor}`}>{statusLabel}</div>
          </div>
          <button
            onClick={() => onRemove(playerId)}
            aria-label="Remove from shortlist"
            className="plm-text-xs plm-text-gray-400 hover:plm-text-red-500 plm-transition-colors plm-min-h-[44px] plm-min-w-[44px] plm-flex plm-items-center plm-justify-center"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (!player || !club) return null;

  const marketVal = refreshPlayerValue(player);

  return (
    <div className="plm-bg-white plm-rounded-lg plm-border plm-border-gray-200 plm-p-3">
      <div
        className="plm-flex plm-items-center plm-gap-2 plm-mb-1 plm-cursor-pointer"
        onClick={() => onOpenModal(player.id, club.id)}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${player.name}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenModal(player.id, club.id); } }}
      >
        <span className="plm-text-amber-500 plm-text-sm plm-flex-shrink-0" aria-hidden="true">★</span>
        {getClubLogoUrl(club.id) ? (
          <img
            src={getClubLogoUrl(club.id)}
            alt=""
            aria-hidden
            className="plm-w-6 plm-h-6 plm-object-contain plm-flex-shrink-0"
          />
        ) : (
          <div
            className="plm-w-3 plm-h-3 plm-rounded-full plm-flex-shrink-0"
            style={{ backgroundColor: club.colors.primary }}
          />
        )}
        <div className="plm-flex-1 plm-min-w-0">
          <div className="plm-text-sm plm-font-semibold plm-text-gray-900 plm-truncate">
            {player.name}
          </div>
          <div className="plm-text-xs plm-text-gray-500">
            {club.shortName} &middot; {player.position} &middot; Age {player.age}
          </div>
        </div>
        <div className="plm-text-right plm-flex-shrink-0">
          <div className="plm-text-sm plm-font-bold plm-text-gray-900">{player.overall}</div>
          <div className="plm-text-xs plm-text-gray-500">&pound;{marketVal.toFixed(1)}M</div>
        </div>
      </div>

      {/* Status badge */}
      <div className="plm-flex plm-items-center plm-justify-between plm-mt-2">
        <span className={`plm-text-xs plm-font-medium ${statusColor}`}>{statusLabel}</span>
        <div className="plm-flex plm-items-center plm-gap-2">
          {isTransferWindow && listing && status === 'at_club' && (
            <button
              onClick={() => {
                const fee = Math.round(listing.askingPrice * 10) / 10;
                if (fee <= budget) {
                  onMakeOffer(playerId, club.id, fee);
                }
              }}
              disabled={listing.askingPrice > budget}
              className="plm-text-xs plm-font-medium plm-px-3 plm-py-1.5 plm-rounded plm-bg-gray-900 plm-text-white hover:plm-bg-gray-800 disabled:plm-opacity-40 disabled:plm-cursor-not-allowed plm-transition-colors plm-min-h-[44px] plm-flex plm-items-center"
            >
              Make Offer (&pound;{listing.askingPrice.toFixed(1)}M)
            </button>
          )}
          <button
            onClick={() => onRemove(playerId)}
            aria-label={`Remove ${player.name} from shortlist`}
            className="plm-text-xs plm-text-gray-400 hover:plm-text-red-500 plm-transition-colors plm-min-h-[44px] plm-min-w-[44px] plm-flex plm-items-center plm-justify-center"
          >
            ★ Remove
          </button>
        </div>
      </div>
    </div>
  );
}
