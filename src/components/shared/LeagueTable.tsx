import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { ClubLink } from './ClubLink';
import type { LeagueTableRow } from '../../types/entities';

interface LeagueTableProps {
  compact?: boolean;
}

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

function getClubInfo(clubId: string) {
  return clubDataMap.get(clubId);
}

export function LeagueTable({ compact = false }: LeagueTableProps) {
  const leagueTable = useGameStore((s) => s.leagueTable);
  const manager = useGameStore((s) => s.manager);
  const playerClubId = manager?.clubId;

  const sortedTable = useMemo(() => {
    return [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [leagueTable]);

  if (sortedTable.length === 0) {
    return (
      <div className="plm-text-center plm-py-8 plm-text-warm-500 plm-text-sm">
        Season not started yet
      </div>
    );
  }

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
          </tr>
        </thead>
        <tbody>
          {sortedTable.map((row, idx) => (
            <LeagueTableRowComponent
              key={row.clubId}
              row={row}
              position={idx + 1}
              isPlayerClub={row.clubId === playerClubId}
              compact={compact}
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
  isPlayerClub,
  compact,
}: {
  row: LeagueTableRow;
  position: number;
  isPlayerClub: boolean;
  compact: boolean;
}) {
  const club = getClubInfo(row.clubId);

  return (
    <tr
      className={`plm-border-b plm-border-warm-100 plm-transition-all plm-duration-300 ${
        isPlayerClub
          ? 'plm-bg-warm-100'
          : 'hover:plm-bg-warm-50'
      } ${position === 1 ? 'plm-font-semibold' : ''}`}
      style={isPlayerClub ? {
        borderLeft: `3px solid ${club?.colors.primary || '#1A1A1A'}`,
      } : undefined}
    >
      <td className="plm-py-2 plm-px-1 plm-text-warm-500 plm-tabular-nums">
        {position}
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
    </tr>
  );
}
