import { useEffect, useMemo, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { ClubLink } from './ClubLink';
import type { Fixture, LeagueTableRow } from '../../types/entities';

interface LeagueTableProps {
  compact?: boolean;
  /** Hide the form column (default shows on non-compact desktop). */
  hideForm?: boolean;
}

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

function getClubInfo(clubId: string) {
  return clubDataMap.get(clubId);
}

type FormResult = 'W' | 'D' | 'L';

/** Last N results for each club, oldest → newest. Derived from played fixtures. */
function buildRecentForm(fixtures: Fixture[], windowSize = 5): Map<string, FormResult[]> {
  const byClub = new Map<string, { gw: number; result: FormResult }[]>();

  for (const f of fixtures) {
    if (!f.played || !f.result) continue;
    const { homeGoals, awayGoals } = f.result;
    const homeRes: FormResult = homeGoals > awayGoals ? 'W' : homeGoals < awayGoals ? 'L' : 'D';
    const awayRes: FormResult = homeGoals < awayGoals ? 'W' : homeGoals > awayGoals ? 'L' : 'D';

    if (!byClub.has(f.homeClubId)) byClub.set(f.homeClubId, []);
    if (!byClub.has(f.awayClubId)) byClub.set(f.awayClubId, []);
    byClub.get(f.homeClubId)!.push({ gw: f.gameweek, result: homeRes });
    byClub.get(f.awayClubId)!.push({ gw: f.gameweek, result: awayRes });
  }

  const out = new Map<string, FormResult[]>();
  for (const [clubId, list] of byClub) {
    list.sort((a, b) => a.gw - b.gw);
    out.set(clubId, list.slice(-windowSize).map((r) => r.result));
  }
  return out;
}

const FORM_PILL_STYLES: Record<FormResult, string> = {
  W: 'plm-bg-emerald-600 plm-text-white',
  D: 'plm-bg-warm-300 plm-text-warm-800',
  L: 'plm-bg-rose-600 plm-text-white',
};

function FormPills({ results }: { results: FormResult[] }) {
  if (results.length === 0) {
    return <span className="plm-text-warm-400 plm-text-[10px]">—</span>;
  }
  return (
    <div className="plm-flex plm-gap-0.5 plm-justify-center">
      {results.map((r, i) => (
        <span
          key={i}
          className={`plm-inline-flex plm-items-center plm-justify-center plm-w-4 plm-h-4 plm-rounded-sm plm-text-[9px] plm-font-bold plm-tabular-nums ${FORM_PILL_STYLES[r]}`}
          title={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function PositionDelta({ delta }: { delta: number }) {
  if (delta === 0) {
    return <span className="plm-text-warm-300 plm-text-[10px]" aria-hidden>–</span>;
  }
  if (delta < 0) {
    return (
      <span className="plm-text-emerald-600 plm-text-[10px] plm-font-bold" title={`Up ${-delta}`}>
        ▲{-delta}
      </span>
    );
  }
  return (
    <span className="plm-text-rose-600 plm-text-[10px] plm-font-bold" title={`Down ${delta}`}>
      ▼{delta}
    </span>
  );
}

export function LeagueTable({ compact = false, hideForm = false }: LeagueTableProps) {
  const leagueTable = useGameStore((s) => s.leagueTable);
  const fixtures = useGameStore((s) => s.fixtures);
  const manager = useGameStore((s) => s.manager);
  const playerClubId = manager?.clubId;

  const sortedTable = useMemo(() => {
    return [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [leagueTable]);

  const formByClub = useMemo(() => buildRecentForm(fixtures), [fixtures]);

  // Track previous positions so we can show ▲/▼ deltas after each round.
  // Keyed by clubId → previous index. Updates after the table changes.
  const prevPositionsRef = useRef<Map<string, number>>(new Map());
  const positionDeltas = useMemo(() => {
    const deltas = new Map<string, number>();
    for (let i = 0; i < sortedTable.length; i++) {
      const id = sortedTable[i].clubId;
      const prev = prevPositionsRef.current.get(id);
      deltas.set(id, prev === undefined ? 0 : i - prev);
    }
    return deltas;
  }, [sortedTable]);

  useEffect(() => {
    const next = new Map<string, number>();
    sortedTable.forEach((row, i) => next.set(row.clubId, i));
    prevPositionsRef.current = next;
  }, [sortedTable]);

  if (sortedTable.length === 0) {
    return (
      <div className="plm-text-center plm-py-8 plm-text-warm-500 plm-text-sm">
        Season not started yet
      </div>
    );
  }

  const showForm = !compact && !hideForm;

  return (
    <div className="plm-overflow-x-auto plm--mx-1">
      <table className="plm-w-full plm-text-sm plm-font-body" role="table">
        <caption className="plm-sr-only">Premier League standings</caption>
        <thead>
          <tr className="plm-border-b plm-border-warm-200">
            <th scope="col" className="plm-text-left plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-6">
              <span className="plm-sr-only">Position</span>#
            </th>
            <th scope="col" className="plm-text-left plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">
              Club
            </th>
            <th scope="col" className="plm-text-center plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-7" title="Played">
              P
            </th>
            {!compact && (
              <>
                <th scope="col" className="plm-text-center plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-7 plm-hidden sm:plm-table-cell" title="Won">
                  W
                </th>
                <th scope="col" className="plm-text-center plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-7 plm-hidden sm:plm-table-cell" title="Drawn">
                  D
                </th>
                <th scope="col" className="plm-text-center plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-7 plm-hidden sm:plm-table-cell" title="Lost">
                  L
                </th>
              </>
            )}
            <th scope="col" className="plm-text-center plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-9" title="Goal Difference">
              GD
            </th>
            <th scope="col" className="plm-text-center plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-9" title="Points">
              Pts
            </th>
            {showForm && (
              <th scope="col" className="plm-text-center plm-py-2 plm-px-1 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-w-24 plm-hidden md:plm-table-cell" title="Last 5 results">
                Form
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedTable.map((row, idx) => (
            <LeagueTableRowComponent
              key={row.clubId}
              row={row}
              position={idx + 1}
              positionDelta={positionDeltas.get(row.clubId) ?? 0}
              recentForm={formByClub.get(row.clubId) ?? []}
              isPlayerClub={row.clubId === playerClubId}
              compact={compact}
              showForm={showForm}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeagueTableRowComponent({
  row,
  position,
  positionDelta,
  recentForm,
  isPlayerClub,
  compact,
  showForm,
}: {
  row: LeagueTableRow;
  position: number;
  positionDelta: number;
  recentForm: FormResult[];
  isPlayerClub: boolean;
  compact: boolean;
  showForm: boolean;
}) {
  const club = getClubInfo(row.clubId);

  // Pulse the row briefly when the position changes — gives the table a heartbeat.
  const pulseClass = positionDelta < 0
    ? 'plm-animate-fade-in plm-bg-emerald-50/50'
    : positionDelta > 0
    ? 'plm-animate-fade-in plm-bg-rose-50/40'
    : '';

  return (
    <tr
      className={`plm-border-b plm-border-warm-100 plm-transition-all plm-duration-500 ${
        isPlayerClub
          ? 'plm-bg-warm-100'
          : `hover:plm-bg-warm-50 ${pulseClass}`
      } ${position === 1 ? 'plm-font-semibold' : ''}`}
      style={isPlayerClub ? {
        borderLeft: `3px solid ${club?.colors.primary || '#1A1A1A'}`,
      } : undefined}
    >
      <td className="plm-py-2 plm-px-1 plm-text-warm-500 plm-tabular-nums">
        <span className="plm-inline-flex plm-items-center plm-gap-1">
          {position}
          <PositionDelta delta={positionDelta} />
        </span>
      </td>
      <td className="plm-py-2 plm-px-1">
        <ClubLink
          clubId={row.clubId}
          short={compact}
          className={`${compact ? 'plm-text-xs' : 'plm-text-sm'} ${isPlayerClub ? 'plm-font-bold' : ''}`}
        />
      </td>
      <td className="plm-py-2 plm-px-1 plm-text-center plm-tabular-nums plm-text-warm-600">
        {row.played}
      </td>
      {!compact && (
        <>
          <td className="plm-py-2 plm-px-1 plm-text-center plm-tabular-nums plm-text-warm-600 plm-hidden sm:plm-table-cell">
            {row.won}
          </td>
          <td className="plm-py-2 plm-px-1 plm-text-center plm-tabular-nums plm-text-warm-600 plm-hidden sm:plm-table-cell">
            {row.drawn}
          </td>
          <td className="plm-py-2 plm-px-1 plm-text-center plm-tabular-nums plm-text-warm-600 plm-hidden sm:plm-table-cell">
            {row.lost}
          </td>
        </>
      )}
      <td className="plm-py-2 plm-px-1 plm-text-center plm-tabular-nums plm-text-warm-600">
        {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
      </td>
      <td className="plm-py-2 plm-px-1 plm-text-center plm-font-bold plm-tabular-nums">
        {row.points}
      </td>
      {showForm && (
        <td className="plm-py-2 plm-px-1 plm-hidden md:plm-table-cell">
          <FormPills results={recentForm} />
        </td>
      )}
    </tr>
  );
}
