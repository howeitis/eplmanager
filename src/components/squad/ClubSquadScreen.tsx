import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useNavigation } from '../../hooks/useNavigation';
import { useModalParams } from '../../hooks/useModalParams';
import { CLUBS } from '../../data/clubs';
import type { Player, Position } from '../../types/entities';

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
  const { navigateBack } = useNavigation();
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

  if (!club || !clubData) {
    return (
      <div className="plm-text-center plm-py-12 plm-text-warm-500">
        Club not found.
      </div>
    );
  }

  return (
    <div className="plm-space-y-4 plm-w-full">
      {/* Back button */}
      <button
        onClick={navigateBack}
        className="plm-text-sm plm-text-warm-500 hover:plm-text-charcoal plm-transition-colors plm-min-h-[44px] plm-inline-flex plm-items-center plm-gap-1"
      >
        &larr; Back
      </button>

      {/* Club header */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <div className="plm-flex plm-items-center plm-gap-3 plm-mb-3">
          <div
            className="plm-w-12 plm-h-12 plm-rounded-full plm-flex-shrink-0 plm-border-2"
            style={{
              backgroundColor: clubData.colors.primary,
              borderColor: clubData.colors.secondary,
            }}
          />
          <div className="plm-min-w-0 plm-flex-1">
            <h1 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-truncate">
              {clubData.name}
            </h1>
            <div className="plm-flex plm-items-center plm-gap-2 plm-mt-0.5">
              <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-bg-warm-100 plm-text-warm-600 plm-px-2 plm-py-0.5 plm-rounded-full">
                Tier {clubData.tier} — {TIER_LABELS[clubData.tier]}
              </span>
            </div>
          </div>
        </div>

        <div className="plm-grid plm-grid-cols-3 plm-gap-2">
          <StatBox label="Position" value={position || '-'} />
          <StatBox label="Squad" value={filteredPlayers.length} />
          <StatBox label="Budget" value={`£${budget.toFixed(0)}M`} accent />
        </div>
      </div>

      {/* Roster */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-mb-3">
          Squad ({filteredPlayers.length})
        </h2>

        {/* Filters */}
        <div className="plm-flex plm-flex-wrap plm-gap-1.5 plm-mb-3" role="group" aria-label="Filter by position">
          {(['ALL', ...POSITION_ORDER] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setFilterPos(pos)}
              aria-pressed={filterPos === pos}
              className={`plm-px-3 plm-py-1.5 plm-text-xs plm-font-medium plm-rounded plm-transition-colors plm-min-h-[44px] plm-min-w-[44px] ${
                filterPos === pos
                  ? 'plm-bg-charcoal plm-text-white'
                  : 'plm-bg-warm-100 plm-text-warm-600 hover:plm-bg-warm-200'
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
                  onClick={() => openModal(player.id, clubId)}
                  className={`plm-border-b plm-border-warm-100 plm-transition-colors hover:plm-bg-warm-50 plm-cursor-pointer ${
                    player.injured ? 'plm-bg-red-50/50' : ''
                  }`}
                >
                  <td className="plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase">{player.position}</td>
                  <td className="plm-py-2">
                    <div className="plm-flex plm-items-center plm-gap-1.5">
                      <span className="plm-text-sm plm-font-medium plm-text-charcoal">{player.name}</span>
                      {player.injured && (
                        <span className="plm-text-[9px] plm-bg-red-100 plm-text-red-600 plm-px-1 plm-rounded plm-font-semibold">
                          INJ ({player.injuryWeeks}w)
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

        {/* Mobile cards */}
        <div className="md:plm-hidden plm-space-y-1">
          {filteredPlayers.map((player) => (
            <MobilePlayerCard
              key={player.id}
              player={player}
              onOpenModal={() => openModal(player.id, clubId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MobilePlayerCard({
  player,
  onOpenModal,
}: {
  player: Player;
  onOpenModal: () => void;
}) {
  return (
    <button
      onClick={onOpenModal}
      className={`plm-w-full plm-rounded plm-border plm-border-warm-100 plm-transition-all plm-bg-white plm-text-left plm-flex plm-items-center plm-gap-2 plm-p-3 plm-min-h-[44px] ${
        player.injured ? 'plm-border-red-200 plm-bg-red-50/30' : ''
      }`}
      aria-label={`${player.name}, ${player.position}, overall ${player.overall}`}
    >
      <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-text-warm-400 plm-w-5 plm-tracking-wider">
        {player.position}
      </span>
      <span className="plm-text-sm plm-font-medium plm-text-charcoal plm-flex-1 plm-truncate">
        {player.name}
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

function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="plm-bg-warm-50 plm-rounded plm-p-2 plm-text-center">
      <div className="plm-text-[10px] plm-text-warm-400 plm-font-medium plm-uppercase plm-tracking-wider">
        {label}
      </div>
      <div className={`plm-text-lg plm-font-bold plm-tabular-nums ${accent ? 'plm-text-emerald-700' : 'plm-text-charcoal'}`}>
        {value}
      </div>
    </div>
  );
}

function FormBadge({ form }: { form: number }) {
  if (form >= 3) return <span className="plm-text-[9px] plm-font-bold plm-px-1 plm-py-0.5 plm-rounded plm-bg-emerald-50 plm-text-emerald-600">+{form}</span>;
  if (form >= 1) return <span className="plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded plm-bg-emerald-50 plm-text-emerald-600">+{form}</span>;
  if (form <= -3) return <span className="plm-text-[9px] plm-font-bold plm-px-1 plm-py-0.5 plm-rounded plm-bg-red-50 plm-text-red-600">{form}</span>;
  if (form <= -1) return <span className="plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded plm-bg-red-50 plm-text-red-600">{form}</span>;
  return <span className="plm-text-[9px] plm-text-warm-400 plm-px-1 plm-py-0.5">0</span>;
}
