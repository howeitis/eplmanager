import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Player, Position } from '../../types/entities';
import type { Formation, Mentality } from '../../engine/matchSim';
import { FormationPicker } from './FormationPicker';
import { MentalitySelector } from './MentalitySelector';
import { StartingXIPicker } from './StartingXIPicker';
import { SquadProgression } from './SquadProgression';
import { GoalScorersWidget } from '../hub/GoalScorersWidget';
import { useModalParams } from '../../hooks/useModalParams';
import type { XISwap } from '../../engine/startingXI';
import { refreshPlayerValue } from '../../engine/transfers';

const POSITION_ORDER: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];
type SortKey = 'position' | 'overall' | 'age' | 'form' | 'name';
type SquadView = 'roster' | 'progression';

interface SquadScreenProps {
  formation: Formation;
  mentality: Mentality;
  onFormationChange: (f: Formation) => void;
  onMentalityChange: (m: Mentality) => void;
  xiNotifications?: XISwap[];
  onDismissNotifications?: () => void;
  onAdvance?: () => void;
  advanceLabel?: string;
  onGoToTransfers?: () => void;
}

export function SquadScreen({
  formation,
  mentality,
  onFormationChange,
  onMentalityChange,
  xiNotifications = [],
  onDismissNotifications = () => {},
  onAdvance,
  advanceLabel,
  onGoToTransfers,
}: SquadScreenProps) {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const tempFillIns = useGameStore((s) => s.tempFillIns);
  const startingXI = useGameStore((s) => s.startingXI);
  const captainId = useGameStore((s) => s.captainId);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [filterPos, setFilterPos] = useState<Position | 'ALL'>('ALL');
  const [squadView, setSquadView] = useState<SquadView>('roster');
  const { openModal } = useModalParams();

  const playerClub = clubs.find((c) => c.id === manager?.clubId);

  const allPlayers = useMemo(() => {
    if (!playerClub) return [];
    const roster = [...playerClub.roster];
    const temps = tempFillIns.filter((p) => !roster.some((r) => r.id === p.id));
    return [...roster, ...temps];
  }, [playerClub, tempFillIns]);

  const filteredPlayers = useMemo(() => {
    let result = [...allPlayers];
    if (filterPos !== 'ALL') {
      result = result.filter((p) => p.position === filterPos);
    }
    result.sort((a, b) => {
      // Temporary fill-ins always last
      if (a.isTemporary !== b.isTemporary) return a.isTemporary ? 1 : -1;
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
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
    return result;
  }, [allPlayers, sortKey, filterPos]);

  // Check if any starter in the current XI is injured
  const hasInjuredStarter = useMemo(() => {
    const xiPlayerIds = Object.values(startingXI);
    return allPlayers.some((p) => xiPlayerIds.includes(p.id) && p.injured);
  }, [allPlayers, startingXI]);

  const isJanuaryWindow = currentPhase === 'january_window' || currentPhase === 'january' || currentPhase === 'january_deadline';

  return (
    <div className="plm-space-y-4 plm-w-full">

      {/* Advance to next month banner */}
      {onAdvance && advanceLabel && (
        <div className="plm-bg-charcoal plm-rounded-lg plm-px-4 plm-py-3 plm-flex plm-items-center plm-justify-between plm-gap-3">
          <div className="plm-min-w-0">
            <p className="plm-text-sm plm-font-semibold plm-text-white plm-truncate">
              {advanceLabel}
            </p>
            {isJanuaryWindow && (
              <p className="plm-text-xs plm-text-amber-400 plm-mt-0.5">
                Transfer window is open — sign before the deadline!
              </p>
            )}
          </div>
          <button
            onClick={onAdvance}
            className="plm-flex-shrink-0 plm-px-4 plm-py-2 plm-bg-white plm-text-charcoal plm-rounded-lg plm-text-xs plm-font-bold plm-uppercase plm-tracking-wide hover:plm-bg-warm-200 plm-transition-colors plm-min-h-[44px] plm-min-w-[80px]"
          >
            Advance
          </button>
        </div>
      )}

      {/* August deadline warning */}
      {currentPhase === 'august_deadline' && (
        <div className="plm-bg-amber-50 plm-border-2 plm-border-amber-400 plm-rounded-lg plm-px-4 plm-py-4">
          <div className="plm-flex plm-items-start plm-gap-3">
            <span className="plm-text-2xl plm-flex-shrink-0" aria-hidden="true">⏰</span>
            <div className="plm-flex-1 plm-min-w-0">
              <p className="plm-text-sm plm-font-bold plm-text-amber-900">
                Transfer Deadline Day — Last Chance to Sign!
              </p>
              <p className="plm-text-xs plm-text-amber-700 plm-mt-0.5">
                The window closes when you advance. Any unsigned targets will be gone until January.
              </p>
              <div className="plm-flex plm-gap-2 plm-mt-3">
                {onAdvance && (
                  <button
                    onClick={onAdvance}
                    className="plm-flex-1 plm-px-3 plm-py-2 plm-bg-charcoal plm-text-white plm-rounded-lg plm-text-xs plm-font-bold plm-min-h-[44px] hover:plm-bg-warm-700 plm-transition-colors"
                  >
                    Advance to September
                  </button>
                )}
                {onGoToTransfers && (
                  <button
                    onClick={onGoToTransfers}
                    className="plm-flex-1 plm-px-3 plm-py-2 plm-bg-amber-500 plm-text-white plm-rounded-lg plm-text-xs plm-font-bold plm-min-h-[44px] hover:plm-bg-amber-600 plm-transition-colors"
                  >
                    🛒 Go to Transfer Market
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Injured starter banner */}
      {hasInjuredStarter && (
        <div className="plm-bg-red-50 plm-border plm-border-red-200 plm-rounded-lg plm-px-4 plm-py-3 plm-flex plm-items-center plm-gap-2">
          <span className="plm-text-red-500 plm-text-lg plm-flex-shrink-0" aria-hidden="true">!</span>
          <p className="plm-text-sm plm-text-red-800 plm-font-medium">
            One or more starters are injured. Review your Starting XI before advancing.
          </p>
        </div>
      )}

      {/* Formation & Mentality */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-mb-3">
          Tactics
        </h2>
        <div className="plm-grid plm-grid-cols-1 md:plm-grid-cols-2 plm-gap-4">
          <FormationPicker
            formation={formation}
            onFormationChange={onFormationChange}
            roster={allPlayers}
          />
          <MentalitySelector
            mentality={mentality}
            onMentalityChange={onMentalityChange}
          />
        </div>
        {/* Starting XI Pitch View */}
        <div className="plm-mt-4 plm-pt-4 plm-border-t plm-border-warm-100">
          <StartingXIPicker
            formation={formation}
            xiNotifications={xiNotifications}
            onDismissNotifications={onDismissNotifications}
          />
        </div>
      </div>

      {/* View Toggle: Roster / Progression */}
      <div className="plm-flex plm-gap-1 plm-bg-warm-100 plm-rounded-lg plm-p-0.5">
        {([['roster', 'Roster'], ['progression', 'Progression']] as [SquadView, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSquadView(key)}
            className={`plm-flex-1 plm-py-2 plm-text-xs plm-font-semibold plm-rounded-md plm-transition-colors plm-min-h-[44px] ${
              squadView === key
                ? 'plm-bg-white plm-text-charcoal plm-shadow-sm'
                : 'plm-text-warm-500 hover:plm-text-warm-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Progression View */}
      {squadView === 'progression' && <SquadProgression />}

      {/* Goal Scorers (secondary placement) */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <GoalScorersWidget variant="squad" />
      </div>

      {/* Roster */}
      {squadView === 'roster' && <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <div className="plm-flex plm-items-center plm-justify-between plm-mb-3">
          <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal">
            Squad ({filteredPlayers.filter((p) => !p.isTemporary).length})
          </h2>
        </div>

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

        {/* Desktop: Full table */}
        <div className="plm-hidden md:plm-block">
          <table className="plm-w-full plm-text-sm" role="table">
            <caption className="plm-sr-only">Squad roster</caption>
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
              {filteredPlayers.map((player) => {
                const isInXI = Object.values(startingXI).includes(player.id);
                return (
                  <DesktopPlayerRow key={player.id} player={player} isInXI={isInXI} captainId={captainId} onOpenModal={() => openModal(player.id, playerClub!.id)} />
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: Compact cards */}
        <div className="md:plm-hidden plm-space-y-1">
          {filteredPlayers.map((player) => (
            <MobilePlayerCard
              key={player.id}
              player={player}
              captainId={captainId}
              expanded={expandedPlayerId === player.id}
              onToggle={() =>
                setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)
              }
              onOpenModal={() => openModal(player.id, playerClub!.id)}
            />
          ))}
        </div>
      </div>}
    </div>
  );
}

function DesktopPlayerRow({ player, isInXI, captainId, onOpenModal }: { player: Player; isInXI: boolean; captainId?: string | null; onOpenModal: () => void }) {
  return (
    <tr
      onClick={onOpenModal}
      className={`plm-border-b plm-border-warm-100 plm-transition-colors hover:plm-bg-warm-50 plm-cursor-pointer ${
        player.isTemporary ? 'plm-opacity-40' : ''
      } ${player.injured ? 'plm-bg-red-50/50' : ''}`}
    >
      <td className="plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase">{player.position}</td>
      <td className="plm-py-2">
        <div className="plm-flex plm-items-center plm-gap-1.5">
          {isInXI && (
            <span className="plm-w-1.5 plm-h-1.5 plm-rounded-full plm-bg-emerald-500 plm-flex-shrink-0" title="Starting XI" />
          )}
          <span className="plm-text-sm plm-font-medium plm-text-charcoal">
            {player.name}
            <span className="plm-text-warm-400 plm-font-normal plm-ml-1">· {player.age}</span>
          </span>
          {player.id === captainId && (
            <span className="plm-text-[9px] plm-font-black plm-bg-amber-100 plm-text-amber-700 plm-px-1 plm-rounded plm-border plm-border-amber-200" title="Captain">C</span>
          )}
          {player.isTemporary && (
            <span className="plm-text-[9px] plm-bg-warm-200 plm-text-warm-500 plm-px-1 plm-rounded plm-uppercase">Fill-in</span>
          )}
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
  );
}

function MobilePlayerCard({
  player,
  captainId,
  expanded,
  onToggle,
  onOpenModal,
}: {
  player: Player;
  captainId?: string | null;
  expanded: boolean;
  onToggle: () => void;
  onOpenModal: () => void;
}) {
  return (
    <div
      className={`plm-rounded plm-border plm-border-warm-100 plm-transition-all ${
        player.isTemporary ? 'plm-opacity-40 plm-bg-warm-50' : 'plm-bg-white'
      } ${player.injured ? 'plm-border-red-200 plm-bg-red-50/30' : ''}`}
    >
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${player.name}, ${player.position}, overall ${player.overall}`}
        className="plm-w-full plm-flex plm-items-center plm-gap-2 plm-p-3 plm-min-h-[44px] plm-text-left"
      >
        <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-text-warm-400 plm-w-5 plm-tracking-wider">
          {player.position}
        </span>
        <span className="plm-text-sm plm-font-medium plm-text-charcoal plm-flex-1 plm-truncate">
          {player.name}
          <span className="plm-text-warm-400 plm-font-normal plm-ml-1">· {player.age}</span>
        </span>
        {player.id === captainId && (
          <span className="plm-text-[9px] plm-font-black plm-bg-amber-100 plm-text-amber-700 plm-px-1 plm-py-0.5 plm-rounded" title="Captain">C</span>
        )}
        {player.injured && (
          <span className="plm-text-[9px] plm-bg-red-100 plm-text-red-600 plm-px-1 plm-py-0.5 plm-rounded plm-font-semibold">
            INJ
          </span>
        )}
        {player.isTemporary && (
          <span className="plm-text-[9px] plm-bg-warm-200 plm-text-warm-500 plm-px-1 plm-py-0.5 plm-rounded plm-uppercase">Fill-in</span>
        )}
        <FormBadge form={player.form} />
        <span className="plm-text-sm plm-font-bold plm-text-charcoal plm-tabular-nums plm-w-6 plm-text-right">
          {player.overall}
        </span>
      </button>

      {expanded && (
        <div className="plm-px-3 plm-pb-3 plm-border-t plm-border-warm-100 plm-pt-2">
          <div className="plm-grid plm-grid-cols-3 plm-gap-2 plm-mb-2">
            <StatCell label="Age" value={player.age} />
            <StatCell label="Trait" value={player.trait} />
            <StatCell label="Value" value={`£${refreshPlayerValue(player).toFixed(1)}M`} />
          </div>
          <div className="plm-grid plm-grid-cols-6 plm-gap-1">
            {(['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'] as const).map((stat) => (
              <div key={stat} className="plm-text-center">
                <div className="plm-text-[9px] plm-text-warm-400 plm-uppercase">{stat}</div>
                <div className="plm-text-sm plm-font-bold plm-tabular-nums">{player.stats[stat]}</div>
              </div>
            ))}
          </div>
          {!player.isTemporary && (
            <div className="plm-grid plm-grid-cols-3 plm-gap-2 plm-mt-2 plm-pt-2 plm-border-t plm-border-warm-100">
              <StatCell label="Goals" value={player.goals} />
              <StatCell label="Assists" value={player.assists} />
              <StatCell label="CS" value={player.cleanSheets} />
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onOpenModal(); }}
            className="plm-w-full plm-mt-2 plm-py-2 plm-text-xs plm-font-semibold plm-text-warm-600 plm-bg-warm-50 plm-rounded plm-border plm-border-warm-200 hover:plm-bg-warm-100 plm-transition-colors plm-min-h-[44px]"
          >
            View Full Details
          </button>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="plm-text-center plm-bg-warm-50 plm-rounded plm-py-1 plm-px-1">
      <div className="plm-text-[9px] plm-text-warm-400 plm-uppercase">{label}</div>
      <div className="plm-text-xs plm-font-semibold plm-text-charcoal">{value}</div>
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
