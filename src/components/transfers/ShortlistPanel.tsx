import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useModalParams } from '../../hooks/useModalParams';
import { refreshPlayerValue } from '../../engine/transfers';
import { RetroPlayerCard } from '../shared/RetroPlayerCard';
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

export function ShortlistPanel({ clubs, playerClubId, isTransferWindow: _isTransferWindow, onMakeOffer: _onMakeOffer, budget: _budget }: ShortlistPanelProps) {
  const shortlist = useGameStore((s) => s.shortlist);
  const removeFromShortlist = useGameStore((s) => s.removeFromShortlist);
  const transferHistory = useGameStore((s) => s.transferHistory);
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
          Star players from the Market or Club Squad Viewer to track them here.
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
      <div className="plm-flex plm-flex-wrap plm-items-center plm-gap-1 plm-mb-4" role="group" aria-label="Sort shortlist">
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

      {/* Card grid */}
      <ul
        role="list"
        className="plm-grid plm-grid-cols-2 sm:plm-grid-cols-3 md:plm-grid-cols-4 lg:plm-grid-cols-5 xl:plm-grid-cols-6 plm-gap-3 plm-list-none plm-pl-0 plm-m-0"
      >
        {visibleEntries.map((entry) => (
          <ShortlistCard
            key={entry.playerId}
            entry={entry}
            onOpenModal={openWithBrowse}
            onRemove={removeFromShortlist}
          />
        ))}
      </ul>
    </div>
  );
}

function ShortlistCard({
  entry,
  onOpenModal,
  onRemove,
}: {
  entry: ShortlistEntry;
  onOpenModal: (playerId: string, clubId: string) => void;
  onRemove: (playerId: string) => void;
}) {
  const { playerId, player, club, status, newClubName } = entry;

  if (status === 'retired') {
    return (
      <li className="plm-flex plm-flex-col plm-items-center plm-gap-1.5">
        <div className="plm-w-40 plm-h-56 plm-rounded-xl plm-bg-warm-50 plm-border plm-border-dashed plm-border-warm-300 plm-flex plm-items-center plm-justify-center plm-text-center plm-p-3 plm-opacity-60">
          <span className="plm-text-xs plm-text-warm-500 plm-italic">Player retired</span>
        </div>
        <p className="plm-text-[10px] plm-text-warm-400 plm-text-center plm-italic plm-leading-snug plm-min-h-[2em]">
          Retired
        </p>
        <button
          onClick={() => onRemove(playerId)}
          aria-label="Remove from shortlist"
          className="plm-text-[10px] plm-font-semibold plm-text-warm-500 hover:plm-text-red-600 plm-transition-colors plm-min-h-[36px] plm-px-2"
        >
          ★ Remove
        </button>
      </li>
    );
  }

  if (!player || !club) return null;

  const note = (() => {
    switch (status) {
      case 'signed': return 'Signed to your club';
      case 'transferred': return `Transferred to ${newClubName}`;
      case 'at_club': return `At ${club.shortName}`;
      default: return '';
    }
  })();

  const noteTone = (() => {
    switch (status) {
      case 'signed': return 'plm-text-emerald-700';
      case 'transferred': return 'plm-text-blue-700';
      default: return 'plm-text-warm-500';
    }
  })();

  return (
    <li className="plm-flex plm-flex-col plm-items-center plm-gap-1.5">
      <button
        type="button"
        onClick={() => onOpenModal(player.id, club.id)}
        aria-label={`Open ${player.name}`}
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
      <p className={`plm-text-[10px] plm-text-center plm-italic plm-leading-snug plm-min-h-[2em] plm-px-1 ${noteTone}`}>
        {note}
      </p>
      <button
        onClick={() => onRemove(playerId)}
        aria-label={`Remove ${player.name} from shortlist`}
        className="plm-text-[10px] plm-font-semibold plm-text-warm-500 hover:plm-text-red-600 plm-transition-colors plm-min-h-[36px] plm-px-2"
      >
        ★ Remove
      </button>
    </li>
  );
}
