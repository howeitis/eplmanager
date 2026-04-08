import { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useModalParams } from '../../hooks/useModalParams';
import type { Player } from '../../types/entities';

interface ScorerRow {
  player: Player;
  goals: number;
  assists: number;
  gPlusA: number;
  avgForm: number;
}

const MATCH_PHASES = [
  'august', 'september', 'october', 'november', 'december',
  'january', 'february', 'march', 'april', 'may',
] as const;

function isPreMatch(phase: string): boolean {
  return phase === 'summer_window' || phase === 'july_advance';
}

function hasMatchesPlayed(phase: string): boolean {
  return MATCH_PHASES.indexOf(phase as typeof MATCH_PHASES[number]) >= 0 || phase === 'season_end';
}

function sortScorers(a: ScorerRow, b: ScorerRow): number {
  // 1. Goals desc
  if (b.goals !== a.goals) return b.goals - a.goals;
  // 2. Assists desc
  if (b.assists !== a.assists) return b.assists - a.assists;
  // 3. Overall desc
  if (b.player.overall !== a.player.overall) return b.player.overall - a.player.overall;
  // 4. Age asc (youngest wins)
  return a.player.age - b.player.age;
}

export function GoalScorersWidget({ variant = 'hub' }: { variant?: 'hub' | 'squad' }) {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const { openModal } = useModalParams();
  const [expanded, setExpanded] = useState(false);

  const playerClub = clubs.find((c) => c.id === manager?.clubId);

  // Top 5 scorers for the player's club
  const topScorers = useMemo(() => {
    if (!playerClub || !hasMatchesPlayed(currentPhase)) return [];

    const rows: ScorerRow[] = playerClub.roster
      .filter((p) => !p.isTemporary && (p.goals > 0 || p.assists > 0))
      .map((p) => {
        const formEntries = p.formHistory.length;
        const avgForm = formEntries > 0
          ? Math.round((p.formHistory.reduce((sum, f) => sum + f, 0) / formEntries) * 10) / 10
          : 0;
        return {
          player: p,
          goals: p.goals,
          assists: p.assists,
          gPlusA: p.goals + p.assists,
          avgForm,
        };
      });

    rows.sort(sortScorers);
    return rows.slice(0, 5);
  }, [playerClub, currentPhase]);

  // Golden Boot: league-wide top scorer (memoized per phase)
  const goldenBoot = useMemo(() => {
    if (!hasMatchesPlayed(currentPhase)) return null;

    let bestName = '';
    let bestGoals = 0;

    for (const club of clubs) {
      for (const player of club.roster) {
        if (player.isTemporary) continue;
        if (player.goals > bestGoals) {
          bestGoals = player.goals;
          bestName = player.name;
        }
      }
    }

    if (bestGoals === 0) return null;

    // Player's top scorer
    const myTop = topScorers[0];
    const trail = myTop ? bestGoals - myTop.goals : bestGoals;

    return { name: bestName, goals: bestGoals, trail };
  }, [clubs, currentPhase, topScorers]);

  // Empty state
  if (isPreMatch(currentPhase) || !hasMatchesPlayed(currentPhase)) {
    return (
      <div className={variant === 'hub' ? '' : 'plm-mt-4'}>
        <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-2">
          Goal Scorers
        </h3>
        <p className="plm-text-sm plm-text-warm-500">No matches played yet.</p>
      </div>
    );
  }

  if (topScorers.length === 0) {
    return (
      <div className={variant === 'hub' ? '' : 'plm-mt-4'}>
        <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-2">
          Goal Scorers
        </h3>
        <p className="plm-text-sm plm-text-warm-500">No goals scored yet.</p>
      </div>
    );
  }

  // Mobile: show only top 1 unless expanded
  const mobileRows = expanded ? topScorers : topScorers.slice(0, 1);

  return (
    <div className={variant === 'hub' ? '' : 'plm-mt-4'}>
      <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-2">
        Goal Scorers
      </h3>

      {/* Desktop: full table */}
      <div className="plm-hidden md:plm-block">
        <table className="plm-w-full plm-text-sm" role="table">
          <caption className="plm-sr-only">Top 5 goal scorers</caption>
          <thead>
            <tr className="plm-border-b plm-border-warm-200">
              <th scope="col" className="plm-text-left plm-py-1.5 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">Name</th>
              <th scope="col" className="plm-text-center plm-py-1.5 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">Pos</th>
              <th scope="col" className="plm-text-center plm-py-1.5 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">G</th>
              <th scope="col" className="plm-text-center plm-py-1.5 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-8">A</th>
              <th scope="col" className="plm-text-center plm-py-1.5 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-10">G+A</th>
              <th scope="col" className="plm-text-center plm-py-1.5 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-10">Form</th>
            </tr>
          </thead>
          <tbody>
            {topScorers.map((row, i) => (
              <tr
                key={row.player.id}
                onClick={() => openModal(row.player.id, playerClub!.id)}
                className="plm-border-b plm-border-warm-100 hover:plm-bg-warm-50 plm-cursor-pointer plm-transition-colors"
              >
                <td className="plm-py-1.5">
                  <span className="plm-text-warm-400 plm-text-xs plm-mr-1.5 plm-tabular-nums">{i + 1}.</span>
                  <span className="plm-font-medium plm-text-charcoal">{row.player.name}</span>
                </td>
                <td className="plm-py-1.5 plm-text-center plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase">{row.player.position}</td>
                <td className="plm-py-1.5 plm-text-center plm-font-bold plm-tabular-nums">{row.goals}</td>
                <td className="plm-py-1.5 plm-text-center plm-text-warm-600 plm-tabular-nums">{row.assists}</td>
                <td className="plm-py-1.5 plm-text-center plm-font-semibold plm-tabular-nums">{row.gPlusA}</td>
                <td className="plm-py-1.5 plm-text-center">
                  <FormBadgeMini value={row.avgForm} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: compact card */}
      <div className="md:plm-hidden plm-space-y-1">
        {mobileRows.map((row, i) => (
          <button
            key={row.player.id}
            onClick={() => openModal(row.player.id, playerClub!.id)}
            className="plm-w-full plm-flex plm-items-center plm-gap-2 plm-py-2 plm-px-1 plm-rounded plm-transition-colors hover:plm-bg-warm-50 plm-text-left plm-min-h-[44px]"
          >
            <span className="plm-text-warm-400 plm-text-xs plm-tabular-nums plm-w-4">{i + 1}.</span>
            <span className="plm-text-[10px] plm-font-semibold plm-text-warm-400 plm-uppercase plm-w-5">{row.player.position}</span>
            <span className="plm-text-sm plm-font-medium plm-text-charcoal plm-flex-1 plm-truncate">{row.player.name}</span>
            <span className="plm-text-xs plm-text-warm-500 plm-tabular-nums">{row.goals}G {row.assists}A</span>
            <span className="plm-text-xs plm-font-bold plm-tabular-nums plm-w-7 plm-text-right">{row.gPlusA}</span>
          </button>
        ))}
        {!expanded && topScorers.length > 1 && (
          <button
            onClick={() => setExpanded(true)}
            className="plm-w-full plm-text-center plm-text-xs plm-text-warm-500 hover:plm-text-charcoal plm-transition-colors plm-py-2 plm-min-h-[44px]"
          >
            Show top {topScorers.length} scorers &darr;
          </button>
        )}
        {expanded && topScorers.length > 1 && (
          <button
            onClick={() => setExpanded(false)}
            className="plm-w-full plm-text-center plm-text-xs plm-text-warm-500 hover:plm-text-charcoal plm-transition-colors plm-py-2 plm-min-h-[44px]"
          >
            Collapse &uarr;
          </button>
        )}
      </div>

      {/* Golden Boot context line */}
      {goldenBoot && (
        <p className="plm-text-xs plm-text-warm-500 plm-mt-2 plm-italic">
          League Golden Boot: {goldenBoot.name} ({goldenBoot.goals})
          {goldenBoot.trail > 0
            ? ` — you trail by ${goldenBoot.trail}.`
            : goldenBoot.trail === 0 && topScorers[0]
              ? ' — your player leads!'
              : '.'}
        </p>
      )}
    </div>
  );
}

function FormBadgeMini({ value }: { value: number }) {
  if (value >= 1) return <span className="plm-text-[10px] plm-font-semibold plm-text-emerald-600">+{value}</span>;
  if (value <= -1) return <span className="plm-text-[10px] plm-font-semibold plm-text-red-600">{value}</span>;
  return <span className="plm-text-[10px] plm-text-warm-400">{value}</span>;
}
