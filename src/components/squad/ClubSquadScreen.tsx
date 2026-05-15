import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useModalParams } from '../../hooks/useModalParams';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';
import type { Player, Position } from '../../types/entities';
import { ShortlistStar } from '../shared/ShortlistStar';

const POSITION_ORDER: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];
type SortKey = 'position' | 'overall' | 'age' | 'form';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

const TIER_LABELS: Record<number, string> = {
  1: 'Elite',
  2: 'Contender',
  3: 'Established',
  4: 'Mid-Table',
  5: 'Survival',
};

interface ClubSquadScreenProps {
  clubId: string;
}

export function ClubSquadScreen({ clubId }: ClubSquadScreenProps) {
  const clubs = useGameStore((s) => s.clubs);
  const leagueTable = useGameStore((s) => s.leagueTable);
  const budgets = useGameStore((s) => s.budgets);
  const { openModal } = useModalParams();
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [filterPos, setFilterPos] = useState<Position | 'ALL'>('ALL');

  const club = clubs.find((c) => c.id === clubId);
  const clubData = clubDataMap.get(clubId);
  const budget = budgets[clubId] || 0;

  // League position
  const position = useMemo(() => {
    const sorted = [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    return sorted.findIndex((r) => r.clubId === clubId) + 1;
  }, [leagueTable, clubId]);

  const filteredPlayers = useMemo(() => {
    if (!club) return [];
    let result = club.roster.filter((p) => !p.isTemporary);
    if (filterPos !== 'ALL') {
      result = result.filter((p) => p.position === filterPos);
    }
    result.sort((a, b) => {
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
  }, [club, sortKey, filterPos]);

  // Ordered ids passed to the detail modal so the user can swipe between
  // players in the same filtered/sorted view they're looking at.
  const browseList = useMemo(() => filteredPlayers.map((p) => p.id), [filteredPlayers]);
  const openWithBrowse = (playerId: string) => openModal(playerId, clubId, browseList);

  if (!club || !clubData) {
    return (
      <div className="plm-text-center plm-py-12 plm-text-warm-500">
        Club not found.
      </div>
    );
  }

  return (
    <div className="plm-relative plm-space-y-4 plm-w-full">
      {/* Club-color ambient glow — mirrors the hub masthead */}
      <div
        aria-hidden
        className="plm-pointer-events-none plm-absolute plm--left-4 plm--right-4 md:plm--left-6 md:plm--right-6 plm--top-16 plm-h-[320px]"
        style={{
          background: `linear-gradient(to bottom, ${clubData.colors.primary}38 0%, ${clubData.colors.primary}1F 28%, ${clubData.colors.primary}0A 55%, transparent 100%)`,
          zIndex: 0,
        }}
      />

      {/* Unboxed editorial masthead */}
      <section className="plm-relative" style={{ zIndex: 1 }}>
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
          Club Profile
        </p>
        <div className="plm-mt-3 plm-flex plm-items-center plm-gap-3">
          {getClubLogoUrl(clubData.id) ? (
            <img
              src={getClubLogoUrl(clubData.id)}
              alt={clubData.name}
              className="plm-w-14 plm-h-14 plm-flex-shrink-0 plm-object-contain"
            />
          ) : (
            <div
              className="plm-w-14 plm-h-14 plm-flex-shrink-0"
              style={{ backgroundColor: clubData.colors.primary }}
            />
          )}
          <div className="plm-min-w-0 plm-flex-1">
            <h1 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight plm-truncate">
              {clubData.name}
            </h1>
            <p className="plm-font-display plm-italic plm-text-sm plm-text-warm-600 plm-truncate">
              Tier {clubData.tier} &middot; {TIER_LABELS[clubData.tier]}
            </p>
          </div>
        </div>

        <div className="md:plm-hidden plm-mt-5 plm-pt-5 plm-border-t plm-border-warm-200 plm-grid plm-grid-cols-3 plm-divide-x plm-divide-warm-200">
          <MastheadStat label="Position" value={position ? ordinal(position) : '-'} />
          <MastheadStat label="Squad" value={filteredPlayers.length} />
          <MastheadStat label="Budget" value={`£${budget.toFixed(0)}M`} accent={clubData.colors.primary} />
        </div>
      </section>

      {/* Roster */}
      <div className="plm-relative plm-pt-5 plm-border-t plm-border-warm-200" style={{ zIndex: 1 }}>
        {/* Filters */}
        <div className="plm-flex plm-flex-wrap plm-items-center plm-gap-1.5 plm-mb-3" role="group" aria-label="Filter by position">
          <span className="plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-[0.15em] plm-font-semibold plm-mr-1">FILTER:</span>
          {(['ALL', ...POSITION_ORDER] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setFilterPos(pos)}
              aria-pressed={filterPos === pos}
              className={`plm-px-3 plm-py-1.5 plm-text-xs plm-font-medium plm-rounded plm-transition-colors plm-min-h-[44px] plm-min-w-[44px] ${
                filterPos === pos
                  ? 'plm-bg-charcoal plm-text-white'
                  : 'plm-bg-transparent plm-text-warm-500 hover:plm-text-charcoal'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="plm-flex plm-items-center plm-gap-1 plm-mb-3" role="group" aria-label="Sort players">
          <span className="plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-wider plm-mr-1">Sort:</span>
          {(['position', 'overall', 'age', 'form'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              aria-pressed={sortKey === key}
              className={`plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-wider plm-px-2 plm-py-1.5 plm-rounded plm-min-h-[36px] ${
                sortKey === key
                  ? 'plm-bg-warm-200 plm-text-charcoal'
                  : 'plm-text-warm-400 hover:plm-text-warm-600'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div className="plm-hidden md:plm-block">
          <table className="plm-w-full plm-text-sm" role="table">
            <caption className="plm-sr-only">{clubData.name} squad roster</caption>
            <thead>
              <tr className="plm-border-b plm-border-warm-200">
                <th scope="col" className="plm-text-left plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">Pos</th>
                <th scope="col" className="plm-text-left plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">Name</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">Age</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">OVR</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">ATK</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">DEF</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">MOV</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">PWR</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">MEN</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">SKL</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-10">Form</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-10">Trait</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <tr
                  key={player.id}
                  onClick={() => openWithBrowse(player.id)}
                  className={`plm-border-b plm-border-warm-100 plm-transition-colors hover:plm-bg-warm-50 plm-cursor-pointer ${
                    player.injured ? 'plm-bg-red-50/50' : ''
                  }`}
                >
                  <td className="plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase">{player.position}</td>
                  <td className="plm-py-2">
                    <div className="plm-flex plm-items-center plm-gap-1.5">
                      <ShortlistStar playerId={player.id} />
                      <span className="plm-text-sm plm-font-medium plm-text-charcoal">{player.name}</span>
                      {player.injured && (
                        <span className="plm-text-[9px] plm-bg-red-100 plm-text-red-600 plm-px-1 plm-rounded plm-font-semibold">
                          INJ ({player.injuryWeeks}m)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.age}</td>
                  <td className="plm-py-2 plm-text-center plm-font-bold plm-tabular-nums">{player.overall}</td>
                  <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.stats.ATK}</td>
                  <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.stats.DEF}</td>
                  <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.stats.MOV}</td>
                  <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.stats.PWR}</td>
                  <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.stats.MEN}</td>
                  <td className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums">{player.stats.SKL}</td>
                  <td className="plm-py-2 plm-text-center">
                    <FormBadge form={player.form} />
                  </td>
                  <td className="plm-py-2 plm-text-center plm-text-[10px] plm-text-warm-500">{player.trait}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile list — flat, no boxes */}
        <ul className="md:plm-hidden plm-divide-y plm-divide-warm-100">
          {filteredPlayers.map((player) => (
            <li key={player.id}>
              <MobilePlayerRow
                player={player}
                onOpenModal={() => openWithBrowse(player.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobilePlayerRow({
  player,
  onOpenModal,
}: {
  player: Player;
  onOpenModal: () => void;
}) {
  return (
    <button
      onClick={onOpenModal}
      className="plm-w-full plm-text-left plm-flex plm-items-center plm-gap-2 plm-py-2.5 plm-min-h-[44px]"
      aria-label={`${player.name}, age ${player.age}, ${player.position}, overall ${player.overall}`}
    >
      <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-text-warm-400 plm-w-5 plm-tracking-wider">
        {player.position}
      </span>
      <ShortlistStar playerId={player.id} />
      <span className="plm-text-sm plm-font-medium plm-text-charcoal plm-flex-1 plm-truncate">
        {player.name}
        <span className="plm-text-warm-400 plm-font-normal plm-ml-1">({player.age})</span>
      </span>
      {player.injured && (
        <span className="plm-text-[9px] plm-bg-red-100 plm-text-red-600 plm-px-1 plm-py-0.5 plm-rounded plm-font-semibold">
          INJ
        </span>
      )}
      <FormBadge form={player.form} />
      <span className="plm-text-sm plm-font-bold plm-text-charcoal plm-tabular-nums plm-w-6 plm-text-right">
        {player.overall}
      </span>
    </button>
  );
}

function MastheadStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="plm-px-2 plm-text-center first:plm-pl-0 last:plm-pr-0">
      <div
        className="plm-font-display plm-text-2xl plm-font-bold plm-tabular-nums plm-leading-none"
        style={{ color: accent || '#1A1A1A' }}
      >
        {value}
      </div>
      <div className="plm-text-[10px] plm-text-warm-500 plm-font-medium plm-uppercase plm-tracking-[0.15em] plm-mt-1.5">
        {label}
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

function FormBadge({ form }: { form: number }) {
  if (form >= 3) return <span className="plm-text-[9px] plm-font-bold plm-px-1 plm-py-0.5 plm-rounded plm-bg-emerald-50 plm-text-emerald-600">+{form}</span>;
  if (form >= 1) return <span className="plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded plm-bg-emerald-50 plm-text-emerald-600">+{form}</span>;
  if (form <= -3) return <span className="plm-text-[9px] plm-font-bold plm-px-1 plm-py-0.5 plm-rounded plm-bg-red-50 plm-text-red-600">{form}</span>;
  if (form <= -1) return <span className="plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded plm-bg-red-50 plm-text-red-600">{form}</span>;
  return <span className="plm-text-[9px] plm-text-warm-400 plm-px-1 plm-py-0.5">0</span>;
}
