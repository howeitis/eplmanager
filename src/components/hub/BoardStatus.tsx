import { useGameStore } from '../../store/gameStore';

export function BoardStatus() {
  const boardExpectation = useGameStore((s) => s.boardExpectation);
  const manager = useGameStore((s) => s.manager);
  const leagueTable = useGameStore((s) => s.leagueTable);

  if (!boardExpectation || !manager) return null;

  const sortedTable = [...leagueTable].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  const currentPosition = sortedTable.findIndex((r) => r.clubId === manager.clubId) + 1;
  const gamesPlayed = sortedTable.find((r) => r.clubId === manager.clubId)?.played || 0;

  // Determine status
  let statusLabel: string;
  let statusColor: string;

  if (gamesPlayed === 0) {
    statusLabel = 'Season not started';
    statusColor = 'plm-text-warm-500 plm-bg-warm-100';
  } else if (currentPosition <= boardExpectation.minPosition) {
    statusLabel = 'On track';
    statusColor = 'plm-text-emerald-700 plm-bg-emerald-50';
  } else if (currentPosition <= boardExpectation.minPosition + 3) {
    statusLabel = 'At risk';
    statusColor = 'plm-text-amber-700 plm-bg-amber-50';
  } else {
    statusLabel = 'Failing';
    statusColor = 'plm-text-red-700 plm-bg-red-50';
  }

  return (
    <div role="status" aria-label={`Board expectation: ${boardExpectation.description}. Status: ${statusLabel}`} className="plm-flex plm-items-start plm-justify-between plm-gap-3">
      <div className="plm-min-w-0 plm-flex-1">
        <p className="plm-text-xs plm-text-warm-500 plm-font-medium plm-uppercase plm-tracking-wider">
          Board Expectation
        </p>
        <p className="plm-text-sm plm-text-charcoal plm-mt-0.5 plm-break-words">
          {boardExpectation.description}
        </p>
      </div>
      <span className={`plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-px-2 plm-py-1 plm-rounded plm-whitespace-nowrap plm-flex-shrink-0 ${statusColor}`}>
        {statusLabel}
      </span>
    </div>
  );
}
