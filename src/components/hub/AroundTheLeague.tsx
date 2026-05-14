import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

/**
 * Compressed standings snapshot — top 4 in the table plus the player's club
 * if they're outside the top 4. A quick read on where you sit vs. the
 * leaders without scanning the full league table.
 */
export function AroundTheLeague() {
  const manager = useGameStore((s) => s.manager);
  const leagueTable = useGameStore((s) => s.leagueTable);

  const playerClubId = manager?.clubId;

  const sortedTable = useMemo(() => {
    return [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [leagueTable]);

  const rows = useMemo(() => {
    const top4 = sortedTable.slice(0, 4).map((r, i) => ({ row: r, position: i + 1 }));
    if (!playerClubId) return top4;
    const playerIdx = sortedTable.findIndex((r) => r.clubId === playerClubId);
    if (playerIdx === -1 || playerIdx < 4) return top4;
    return [...top4, { row: sortedTable[playerIdx], position: playerIdx + 1 }];
  }, [sortedTable, playerClubId]);

  const totalPlayed = leagueTable.reduce((sum, r) => sum + r.played, 0);

  return (
    <div>
      <header className="plm-mb-4 plm-pb-3 plm-border-b plm-border-warm-200">
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
          Standings Snapshot
        </p>
        <h3 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
          Around the League
        </h3>
      </header>

      {totalPlayed === 0 ? (
        <p className="plm-text-sm plm-text-warm-500 plm-italic plm-py-2">
          Season not started.
        </p>
      ) : (
        <ul className="plm-space-y-0.5 plm-list-none plm-pl-0 plm-m-0" role="list">
          {rows.map(({ row, position }) => {
            const club = clubDataMap.get(row.clubId);
            const isPlayer = row.clubId === playerClubId;
            return (
              <li
                key={row.clubId}
                className={`plm-flex plm-items-center plm-gap-3 plm-py-2 plm-px-2 plm-rounded-lg ${
                  isPlayer ? 'plm-bg-warm-50' : ''
                }`}
              >
                <span
                  className={`plm-tabular-nums plm-w-5 plm-text-right plm-font-display plm-text-base ${
                    isPlayer ? 'plm-text-charcoal plm-font-bold' : 'plm-text-warm-400 plm-font-medium'
                  }`}
                >
                  {position}
                </span>
                {getClubLogoUrl(row.clubId) ? (
                  <img
                    src={getClubLogoUrl(row.clubId)}
                    alt=""
                    className="plm-w-6 plm-h-6 plm-object-contain plm-flex-shrink-0"
                    aria-hidden
                  />
                ) : (
                  <div
                    className="plm-w-6 plm-h-6 plm-flex-shrink-0"
                    style={{ backgroundColor: club?.colors.primary }}
                  />
                )}
                <span
                  className={`plm-text-sm plm-flex-1 plm-truncate plm-uppercase plm-tracking-wide ${
                    isPlayer ? 'plm-font-bold plm-text-charcoal' : 'plm-font-semibold plm-text-charcoal'
                  }`}
                >
                  {club?.shortName ?? club?.name}
                </span>
                <span className="plm-font-display plm-text-xl plm-font-bold plm-tabular-nums plm-text-charcoal plm-leading-none">
                  {row.points}
                </span>
                <span className="plm-text-[10px] plm-uppercase plm-tracking-[0.15em] plm-text-warm-500 plm--ml-1">
                  pts
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
