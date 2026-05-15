import { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';
import type { Player, Position } from '../../types/entities';
import type { Formation, Mentality } from '../../engine/matchSim';
import { FormationPicker } from './FormationPicker';
import { MentalitySelector } from './MentalitySelector';
import { StartingXIPicker } from './StartingXIPicker';
import { SquadProgression } from './SquadProgression';
import { useModalParams } from '../../hooks/useModalParams';
import type { XISwap } from '../../engine/startingXI';
import { TutorialModal, useFirstVisitTutorial } from '../shared/TutorialModal';
import { STAT_KEYS, getStatLongName } from '../../utils/statLabels';

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

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
  const saveSlot = useGameStore((s) => s.saveSlot);
  const tutorial = useFirstVisitTutorial('squad', saveSlot);
  const [sortKey, setSortKey] = useState<SortKey>('position');
  const [filterPos, setFilterPos] = useState<Position | 'ALL'>('ALL');
  const [squadView, setSquadView] = useState<SquadView>('roster');
  const [tacticsOpen, setTacticsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.sessionStorage.getItem('plm-squad-tactics-open');
    return stored === null ? true : stored === '1';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('plm-squad-tactics-open', tacticsOpen ? '1' : '0');
  }, [tacticsOpen]);
  const { openModal } = useModalParams();

  const playerClub = clubs.find((c) => c.id === manager?.clubId);
  const clubData = CLUBS.find((c) => c.id === manager?.clubId);

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

  // Squad summary for the masthead stat strip
  const squadSummary = useMemo(() => {
    const permanent = allPlayers.filter((p) => !p.isTemporary);
    if (permanent.length === 0) return { count: 0, avgOvr: 0, avgAge: 0 };
    const sumOvr = permanent.reduce((s, p) => s + p.overall, 0);
    const sumAge = permanent.reduce((s, p) => s + p.age, 0);
    return {
      count: permanent.length,
      avgOvr: Math.round(sumOvr / permanent.length),
      avgAge: Math.round((sumAge / permanent.length) * 10) / 10,
    };
  }, [allPlayers]);

  return (
    <div className="plm-relative plm-space-y-4 plm-w-full">
      {/* Club-color ambient glow — mirrors the hub masthead */}
      {clubData && (
        <>
          <div
            aria-hidden
            className="plm-pointer-events-none plm-absolute plm--left-4 plm--right-4 md:plm--left-6 md:plm--right-6 plm--top-16 plm-h-[320px]"
            style={{
              background: `linear-gradient(to bottom, ${clubData.colors.primary}38 0%, ${clubData.colors.primary}1F 28%, ${clubData.colors.primary}0A 55%, transparent 100%)`,
              zIndex: 0,
            }}
          />
          <div
            aria-hidden
            className="plm-pointer-events-none plm-absolute plm--left-4 plm--right-4 md:plm--left-6 md:plm--right-6 plm--bottom-20 md:plm-bottom-0 plm-h-[336px] md:plm-h-[256px]"
            style={{
              background: `linear-gradient(to top, ${clubData.colors.primary}38 0%, ${clubData.colors.primary}1F 28%, ${clubData.colors.primary}0A 55%, transparent 100%)`,
              zIndex: 0,
            }}
          />
        </>
      )}

      {/* Advance to next month — editorial stylized button matching the hub */}
      {onAdvance && advanceLabel && (
        <div className="plm-relative plm-space-y-2" style={{ zIndex: 1 }}>
          <button
            onClick={onAdvance}
            className="plm-w-full plm-py-4 plm-rounded-2xl plm-font-body plm-font-semibold plm-text-xs plm-uppercase plm-tracking-[0.18em] plm-transition-all plm-duration-200 plm-min-h-[44px]"
            style={{
              backgroundColor: clubData?.colors.primary || '#1A1A1A',
              color: isLightColor(clubData?.colors.primary || '#1A1A1A') ? '#1A1A1A' : '#FFFFFF',
            }}
          >
            {advanceLabel}
          </button>
          {currentPhase === 'august_deadline' && onGoToTransfers && (
            <button
              onClick={onGoToTransfers}
              className="plm-w-full plm-py-4 plm-rounded-2xl plm-font-body plm-font-semibold plm-text-xs plm-uppercase plm-tracking-[0.18em] plm-bg-amber-50 plm-border plm-border-amber-200 plm-text-amber-800 hover:plm-bg-amber-100 plm-transition-colors plm-min-h-[44px]"
            >
              Transfer Deadline Day — Last Chance to Sign
            </button>
          )}
          {currentPhase === 'january_deadline' && onGoToTransfers && (
            <button
              onClick={onGoToTransfers}
              className="plm-w-full plm-py-4 plm-rounded-2xl plm-font-body plm-font-semibold plm-text-xs plm-uppercase plm-tracking-[0.18em] plm-bg-amber-50 plm-border plm-border-amber-200 plm-text-amber-800 hover:plm-bg-amber-100 plm-transition-colors plm-min-h-[44px]"
            >
              January Deadline Day — Last Chance to Sign
            </button>
          )}
          {(currentPhase === 'january_window' || currentPhase === 'january') && onGoToTransfers && (
            <button
              onClick={onGoToTransfers}
              className="plm-w-full plm-py-4 plm-rounded-2xl plm-font-body plm-font-semibold plm-text-xs plm-uppercase plm-tracking-[0.18em] plm-bg-amber-50 plm-border plm-border-amber-200 plm-text-amber-800 hover:plm-bg-amber-100 plm-transition-colors plm-min-h-[44px]"
            >
              Transfer Window Open — Sign Before the Deadline
            </button>
          )}
          {currentPhase === 'summer_window' && onGoToTransfers && (
            <button
              onClick={onGoToTransfers}
              className="plm-w-full plm-py-4 plm-rounded-2xl plm-font-body plm-font-semibold plm-text-xs plm-uppercase plm-tracking-[0.18em] plm-bg-amber-50 plm-border plm-border-amber-200 plm-text-amber-800 hover:plm-bg-amber-100 plm-transition-colors plm-min-h-[44px]"
            >
              Summer Window Open — Shape Your Squad
            </button>
          )}
        </div>
      )}

      {/* Injured starter banner */}
      {hasInjuredStarter && (
        <div className="plm-relative plm-bg-red-50 plm-border plm-border-red-200 plm-rounded-lg plm-px-4 plm-py-3 plm-flex plm-items-center plm-gap-2" style={{ zIndex: 1 }}>
          <span className="plm-text-red-500 plm-text-lg plm-flex-shrink-0" aria-hidden="true">!</span>
          <p className="plm-text-sm plm-text-red-800 plm-font-medium">
            One or more starters are injured. Review your Starting XI before advancing.
          </p>
        </div>
      )}

      {/* Desktop: two-column split — tactics/XI on left, squad list on right */}
      <div className="plm-relative plm-flex plm-flex-col lg:plm-flex-row plm-gap-8 plm-items-start" style={{ zIndex: 1 }}>

      {/* Left column: Tactics + Starting XI */}
      <div className="plm-w-full lg:plm-w-[520px] lg:plm-flex-shrink-0 plm-space-y-6">
      {/* Tactics — collapsible (formation + mentality only) */}
      <section className="plm-pt-5 plm-border-t plm-border-warm-200">
        <button
          onClick={() => setTacticsOpen((v) => !v)}
          aria-expanded={tacticsOpen}
          className="plm-w-full plm-flex plm-items-center plm-justify-between plm-min-h-[32px] plm-text-left"
        >
          <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
            Tactics
          </p>
          <span className="plm-flex plm-items-center plm-gap-1 plm-text-warm-500">
            <span className="plm-text-[9px] plm-uppercase plm-tracking-[0.15em] plm-font-semibold">
              {tacticsOpen ? 'Hide' : 'Show'}
            </span>
            <svg
              className={`plm-w-3 plm-h-3 plm-transition-transform ${tacticsOpen ? 'plm-rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {tacticsOpen && (
          <div className="plm-mt-3 plm-grid plm-grid-cols-1 md:plm-grid-cols-2 plm-gap-4">
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
        )}
      </section>

      {/* Starting XI — always visible */}
      <section className="plm-pt-5 plm-border-t plm-border-warm-200">
        <StartingXIPicker
          formation={formation}
          xiNotifications={xiNotifications}
          onDismissNotifications={onDismissNotifications}
        />
      </section>
      </div>

      {/* Right column: squad list */}
      <div className="plm-w-full lg:plm-flex-1 plm-min-w-0 plm-space-y-4 plm-pt-5 plm-border-t plm-border-warm-200">
      {/* View Toggle: Roster / Progression — editorial pill row */}
      <div className="plm-flex plm-items-center plm-gap-4 plm-border-b plm-border-warm-200 plm-pb-2" role="tablist" aria-label="Squad view">
        {([['roster', 'Roster'], ['progression', 'Progression']] as [SquadView, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={squadView === key}
            onClick={() => setSquadView(key)}
            className={`plm-relative plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-[0.18em] plm-py-2 plm-min-h-[36px] plm-transition-colors ${
              squadView === key
                ? 'plm-text-charcoal'
                : 'plm-text-warm-400 hover:plm-text-warm-600'
            }`}
          >
            {label}
            {squadView === key && (
              <span
                aria-hidden
                className="plm-absolute plm--bottom-2 plm-left-0 plm-right-0 plm-h-0.5"
                style={{ backgroundColor: clubData?.colors.primary || '#1A1A1A' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Progression View */}
      {squadView === 'progression' && <SquadProgression />}

      {/* Roster */}
      {squadView === 'roster' && <div>
        {/* Filters */}
        <div className="plm-flex plm-flex-nowrap plm-items-center plm-gap-0.5 plm-mb-3" role="group" aria-label="Filter by position">
          <span className="plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-[0.15em] plm-font-semibold plm-mr-1 plm-flex-shrink-0">FILTER:</span>
          {(['ALL', ...POSITION_ORDER] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setFilterPos(pos)}
              aria-pressed={filterPos === pos}
              className={`plm-px-2 plm-py-1.5 plm-text-xs plm-font-medium plm-rounded plm-transition-colors plm-min-h-[44px] plm-flex-shrink-0 ${
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

        {/* Mobile: flat divider-stack. Tap a row to open the full player card. */}
        <div className="md:plm-hidden plm-divide-y plm-divide-warm-100">
          {filteredPlayers.map((player) => {
            const isInXI = Object.values(startingXI).includes(player.id);
            return (
              <MobilePlayerCard
                key={player.id}
                player={player}
                captainId={captainId}
                isInXI={isInXI}
                onOpenModal={() => openModal(player.id, playerClub!.id)}
              />
            );
          })}
        </div>
      </div>}
      </div>
      </div>

      {/* Editorial masthead — moved below the working area so tactics stay
          within reach at the top, and the summary closes the page out. */}
      <section className="plm-relative plm-pt-5 plm-border-t plm-border-warm-200" style={{ zIndex: 1 }}>
        <div className="plm-flex plm-items-start plm-gap-3">
          {clubData && getClubLogoUrl(clubData.id) ? (
            <img
              src={getClubLogoUrl(clubData.id)}
              alt=""
              aria-hidden
              className="plm-w-12 plm-h-12 plm-flex-shrink-0 plm-object-contain"
            />
          ) : clubData ? (
            <div
              className="plm-w-12 plm-h-12 plm-flex-shrink-0"
              style={{ backgroundColor: clubData.colors.primary }}
            />
          ) : null}
          <div className="plm-min-w-0 plm-flex-1">
            <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
              Tactical Centre
            </p>
            <h1 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
              Squad
            </h1>
            <p className="plm-font-display plm-italic plm-text-sm plm-text-warm-600 plm-mt-0.5">
              Shape the team, name your eleven, manage the roster.
            </p>
          </div>
        </div>

        <div className="plm-mt-5 plm-pt-5 plm-border-t plm-border-warm-200 plm-grid plm-grid-cols-3 plm-divide-x plm-divide-warm-200">
          <SquadStat label="Squad" value={squadSummary.count} />
          <SquadStat label="Avg OVR" value={squadSummary.avgOvr} accent={clubData?.colors.primary} />
          <SquadStat label="Avg Age" value={squadSummary.avgAge.toFixed(1)} />
        </div>
      </section>

      {tutorial.show && <TutorialModal tab="squad" onClose={tutorial.onClose} />}
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
      <td className="plm-py-2 plm-whitespace-nowrap">
        <div className="plm-flex plm-items-center plm-gap-1.5">
          {isInXI && (
            <span className="plm-w-1.5 plm-h-1.5 plm-rounded-full plm-bg-emerald-500 plm-flex-shrink-0" title="Starting XI" />
          )}
          <span className="plm-text-sm plm-font-medium plm-text-charcoal plm-whitespace-nowrap">
            {player.name}
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
      {STAT_KEYS.map((key) => (
        <td
          key={key}
          className="plm-py-2 plm-text-center plm-text-warm-600 plm-tabular-nums"
          title={player.position === 'GK' ? getStatLongName(player.position, key) : undefined}
        >
          {player.stats[key]}
        </td>
      ))}
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
  isInXI,
  onOpenModal,
}: {
  player: Player;
  captainId?: string | null;
  isInXI: boolean;
  onOpenModal: () => void;
}) {
  // Tap-to-open. The mini-stats dropdown has been retired in favor of the
  // full player card modal — one canonical surface for player detail.
  return (
    <button
      onClick={onOpenModal}
      aria-label={`${player.name}, ${player.position}, overall ${player.overall}`}
      className={`plm-w-full plm-flex plm-items-center plm-gap-2 plm-py-2.5 plm-min-h-[44px] plm-text-left ${
        player.isTemporary ? 'plm-opacity-40' : ''
      }`}
    >
      {isInXI && (
        <span className="plm-w-1.5 plm-h-1.5 plm-rounded-full plm-bg-emerald-500 plm-flex-shrink-0" title="Starting XI" />
      )}
      <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-text-warm-400 plm-w-5 plm-tracking-wider">
        {player.position}
      </span>
      <span className="plm-text-sm plm-font-medium plm-text-charcoal plm-flex-1 plm-truncate">
        {player.name}
        <span className="plm-text-warm-400 plm-font-normal plm-ml-1">({player.age})</span>
      </span>
      {player.id === captainId && (
        <span className="plm-text-[9px] plm-font-black plm-bg-amber-100 plm-text-amber-700 plm-px-1 plm-py-0.5 plm-rounded" title="Captain">C</span>
      )}
      {player.injured && (
        <span
          className="plm-text-[9px] plm-bg-red-100 plm-text-red-600 plm-px-1 plm-py-0.5 plm-rounded plm-font-semibold plm-tabular-nums"
          title={`Out ${player.injuryWeeks} month${player.injuryWeeks === 1 ? '' : 's'}`}
        >
          INJ {player.injuryWeeks}m
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
  );
}

function SquadStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
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

function FormBadge({ form }: { form: number }) {
  if (form >= 3) return <span className="plm-text-[9px] plm-font-bold plm-px-1 plm-py-0.5 plm-rounded plm-bg-emerald-50 plm-text-emerald-600">+{form}</span>;
  if (form >= 1) return <span className="plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded plm-bg-emerald-50 plm-text-emerald-600">+{form}</span>;
  if (form <= -3) return <span className="plm-text-[9px] plm-font-bold plm-px-1 plm-py-0.5 plm-rounded plm-bg-red-50 plm-text-red-600">{form}</span>;
  if (form <= -1) return <span className="plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded plm-bg-red-50 plm-text-red-600">{form}</span>;
  return <span className="plm-text-[9px] plm-text-warm-400 plm-px-1 plm-py-0.5">0</span>;
}
