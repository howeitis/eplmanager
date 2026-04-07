import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { AgingResult } from '../../engine/aging';
import type { Player, PlayerStats } from '../../types/entities';

const STAT_KEYS: (keyof PlayerStats)[] = ['ATK', 'DEF', 'MOV', 'PWR', 'MEN', 'SKL'];

type AgingSort = 'risers' | 'decliners' | 'age';

interface AgingReportProps {
  agingResults: AgingResult[];
}

export function AgingReport({ agingResults }: AgingReportProps) {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const [sortKey, setSortKey] = useState<AgingSort>('risers');

  const playerClubId = manager?.clubId;
  const playerClub = clubs.find((c) => c.id === playerClubId);
  const clubAgingResult = agingResults.find((r) => r.clubId === playerClubId);

  // Build player data with pre/post aging stats
  const playerEntries = useMemo(() => {
    if (!playerClub || !clubAgingResult) return [];

    const entries: {
      player: Player;
      preStats: PlayerStats;
      overallDelta: number;
      statDeltas: Record<keyof PlayerStats, number>;
    }[] = [];

    for (const player of playerClub.roster) {
      if (player.isTemporary) continue;

      // statsSnapshotSeasonStart has pre-aging stats for surviving players
      const preStats = player.statsSnapshotSeasonStart;
      const statDeltas = {} as Record<keyof PlayerStats, number>;
      let totalDelta = 0;

      for (const key of STAT_KEYS) {
        const delta = player.stats[key] - preStats[key];
        statDeltas[key] = delta;
        totalDelta += Math.abs(delta);
      }

      // Find the overall delta from developed array
      const devEntry = clubAgingResult.developed.find((d) => d.playerId === player.id);
      const overallDelta = devEntry ? devEntry.newOverall - devEntry.oldOverall : 0;

      entries.push({ player, preStats, overallDelta, statDeltas });
    }

    // Sort
    entries.sort((a, b) => {
      switch (sortKey) {
        case 'risers':
          return b.overallDelta - a.overallDelta;
        case 'decliners':
          return a.overallDelta - b.overallDelta;
        case 'age':
          return a.player.age - b.player.age;
        default:
          return 0;
      }
    });

    return entries;
  }, [playerClub, clubAgingResult, sortKey]);

  // Retirements for player's club
  const retirements = useMemo(() => {
    if (!clubAgingResult) return [];
    return clubAgingResult.retired;
  }, [clubAgingResult]);

  if (!playerClub || !clubAgingResult) return null;

  return (
    <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4 md:plm-p-6">
      <div className="plm-max-w-3xl plm-mx-auto">
        <div className="plm-flex plm-items-center plm-gap-2 plm-mb-4">
          <div className="plm-h-px plm-flex-1 plm-bg-warm-200" />
          <span className="plm-text-[10px] plm-font-bold plm-text-warm-400 plm-uppercase plm-tracking-[0.2em]">
            Squad Development
          </span>
          <div className="plm-h-px plm-flex-1 plm-bg-warm-200" />
        </div>

        <h3 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-text-center plm-mb-1">
          Aging Report
        </h3>
        <p className="plm-text-xs plm-text-warm-500 plm-text-center plm-mb-4">
          How your squad has developed over the season
        </p>

        {/* Sort toggle */}
        <div className="plm-flex plm-items-center plm-justify-center plm-gap-1 plm-mb-4" role="group" aria-label="Sort aging report">
          {([
            ['risers', 'Biggest Risers'],
            ['decliners', 'Biggest Decliners'],
            ['age', 'By Age'],
          ] as [AgingSort, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              aria-pressed={sortKey === key}
              className={`plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-wider plm-px-3 plm-py-1.5 plm-rounded plm-min-h-[36px] ${
                sortKey === key
                  ? 'plm-bg-charcoal plm-text-white'
                  : 'plm-bg-warm-100 plm-text-warm-500 hover:plm-bg-warm-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Player Development Cards */}
        <div className="plm-grid plm-grid-cols-1 md:plm-grid-cols-2 plm-gap-2 plm-mb-6">
          {playerEntries.map(({ player, overallDelta, statDeltas }) => (
            <div
              key={player.id}
              className="plm-rounded-lg plm-border plm-border-warm-200 plm-p-3 plm-bg-warm-50"
            >
              <div className="plm-flex plm-items-center plm-justify-between plm-mb-2">
                <div>
                  <span className="plm-text-[10px] plm-font-semibold plm-text-warm-400 plm-uppercase plm-mr-1.5">
                    {player.position}
                  </span>
                  <span className="plm-text-sm plm-font-medium plm-text-charcoal">
                    {player.name}
                  </span>
                  <span className="plm-text-[10px] plm-text-warm-400 plm-ml-1.5">
                    Age {player.age}
                  </span>
                </div>
                <OverallDelta delta={overallDelta} overall={player.overall} />
              </div>

              <div className="plm-grid plm-grid-cols-6 plm-gap-1">
                {STAT_KEYS.map((key) => (
                  <div key={key} className="plm-text-center">
                    <div className="plm-text-[9px] plm-text-warm-400 plm-uppercase">{key}</div>
                    <div className="plm-text-xs plm-font-bold plm-tabular-nums">{player.stats[key]}</div>
                    <StatDelta delta={statDeltas[key]} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Retirements */}
        {retirements.length > 0 && (
          <div className="plm-mb-6">
            <h4 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
              Retirements
            </h4>
            <div className="plm-space-y-2">
              {retirements.map(({ player, replacement }) => (
                <div key={player.id} className="plm-rounded-lg plm-border plm-border-warm-200 plm-p-3">
                  <p className="plm-text-sm plm-text-warm-600 plm-leading-relaxed">
                    <span className="plm-font-semibold plm-text-charcoal">{player.name}</span>, age {player.age}, {player.seasonsAtClub} season{player.seasonsAtClub !== 1 ? 's' : ''} at the club. {player.goals > 0 ? `${player.goals} goals` : ''}{player.goals > 0 && player.assists > 0 ? ', ' : ''}{player.assists > 0 ? `${player.assists} assists` : ''}{(player.goals > 0 || player.assists > 0) ? ' in their time here.' : ''}
                  </p>
                  <p className="plm-text-xs plm-text-warm-500 plm-mt-1">
                    Their departure opens a spot for <span className="plm-font-semibold plm-text-charcoal">{replacement.name}</span>, {replacement.age}, joining from the academy.
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OverallDelta({ delta, overall }: { delta: number; overall: number }) {
  if (delta > 0) {
    return (
      <div className="plm-text-right">
        <span className="plm-text-sm plm-font-bold plm-text-charcoal plm-tabular-nums">{overall}</span>
        <span className="plm-text-xs plm-font-bold plm-text-emerald-600 plm-ml-1">+{delta}</span>
      </div>
    );
  }
  if (delta < 0) {
    return (
      <div className="plm-text-right">
        <span className="plm-text-sm plm-font-bold plm-text-charcoal plm-tabular-nums">{overall}</span>
        <span className="plm-text-xs plm-font-bold plm-text-red-600 plm-ml-1">{delta}</span>
      </div>
    );
  }
  return (
    <div className="plm-text-right">
      <span className="plm-text-sm plm-font-bold plm-text-charcoal plm-tabular-nums">{overall}</span>
      <span className="plm-text-xs plm-text-warm-400 plm-ml-1">=</span>
    </div>
  );
}

function StatDelta({ delta }: { delta: number }) {
  if (delta > 0) return <div className="plm-text-[9px] plm-font-bold plm-text-emerald-600">+{delta}</div>;
  if (delta < 0) return <div className="plm-text-[9px] plm-font-bold plm-text-red-600">{delta}</div>;
  return <div className="plm-text-[9px] plm-text-warm-300">=</div>;
}
