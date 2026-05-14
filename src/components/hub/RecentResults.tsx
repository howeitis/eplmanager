import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import type { Fixture, GamePhase } from '../../types/entities';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

type FormResult = 'W' | 'D' | 'L';

const FORM_PILL_STYLES: Record<FormResult, string> = {
  W: 'plm-bg-emerald-600 plm-text-white',
  D: 'plm-bg-warm-300 plm-text-warm-800',
  L: 'plm-bg-rose-600 plm-text-white',
};

// Mirrors MONTHLY_GAMEWEEK_RANGES in engine/matchSim.ts. Duplicated here
// rather than imported so the hub UI stays a thin reader of fixture data.
const MONTHLY_GAMEWEEK_RANGES: Partial<Record<GamePhase, [number, number]>> = {
  august: [1, 4],
  september: [5, 8],
  october: [9, 12],
  november: [13, 15],
  december: [16, 19],
  january: [20, 23],
  february: [24, 27],
  march: [28, 30],
  april: [31, 34],
  may: [35, 38],
};

const PHASE_MONTH_LABEL: Partial<Record<GamePhase, string>> = {
  august: 'August',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December',
  january: 'January',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
};

const IN_SEASON_ORDER: GamePhase[] = [
  'august', 'september', 'october', 'november', 'december',
  'january', 'february', 'march', 'april', 'may',
];

function resultFor(playerClubId: string, fixture: Fixture): FormResult {
  if (!fixture.result) return 'D';
  const { homeGoals, awayGoals } = fixture.result;
  const isHome = fixture.homeClubId === playerClubId;
  const myGoals = isHome ? homeGoals : awayGoals;
  const theirGoals = isHome ? awayGoals : homeGoals;
  if (myGoals > theirGoals) return 'W';
  if (myGoals < theirGoals) return 'L';
  return 'D';
}

/**
 * Recent Results — shows the player's club fixtures from the most recently
 * played month. If the current phase has played fixtures, those are shown;
 * otherwise the previous month's fixtures.
 */
export function RecentResults() {
  const manager = useGameStore((s) => s.manager);
  const fixtures = useGameStore((s) => s.fixtures);

  const playerClubId = manager?.clubId;

  const { month, played, formLine } = useMemo(() => {
    if (!playerClubId) return { month: null, played: [], formLine: [] as FormResult[] };

    const myPlayed = fixtures.filter(
      (f) => f.played && f.result && (f.homeClubId === playerClubId || f.awayClubId === playerClubId),
    );

    if (myPlayed.length === 0) return { month: null, played: [], formLine: [] as FormResult[] };

    // Find the most recent played gameweek and walk back through the month
    // ranges to figure out which phase it belongs to.
    const mostRecentGw = Math.max(...myPlayed.map((f) => f.gameweek));
    let activeMonth: GamePhase | null = null;
    for (const phase of IN_SEASON_ORDER) {
      const range = MONTHLY_GAMEWEEK_RANGES[phase];
      if (range && mostRecentGw >= range[0] && mostRecentGw <= range[1]) {
        activeMonth = phase;
        break;
      }
    }
    if (!activeMonth) return { month: null, played: [], formLine: [] as FormResult[] };

    const range = MONTHLY_GAMEWEEK_RANGES[activeMonth]!;
    const monthFixtures = myPlayed
      .filter((f) => f.gameweek >= range[0] && f.gameweek <= range[1])
      .sort((a, b) => a.gameweek - b.gameweek);

    // Form line — last 5 across the whole season for trend context.
    const lastFive = [...myPlayed]
      .sort((a, b) => a.gameweek - b.gameweek)
      .slice(-5)
      .map((f) => resultFor(playerClubId, f));

    return { month: activeMonth, played: monthFixtures, formLine: lastFive };
  }, [playerClubId, fixtures]);

  if (!playerClubId) return null;

  const monthLabel = month ? PHASE_MONTH_LABEL[month] : null;
  const wins = played.filter((f) => resultFor(playerClubId, f) === 'W').length;
  const draws = played.filter((f) => resultFor(playerClubId, f) === 'D').length;
  const losses = played.filter((f) => resultFor(playerClubId, f) === 'L').length;

  return (
    <div>
      <header className="plm-mb-4 plm-pb-3 plm-border-b plm-border-warm-200 plm-flex plm-items-end plm-justify-between plm-gap-3">
        <div className="plm-min-w-0">
          <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
            {monthLabel ? `${monthLabel} Recap` : 'Last Month'}
          </p>
          <h3 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
            Recent Results
          </h3>
        </div>
        {played.length > 0 && (
          <span className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.15em] plm-text-warm-500 plm-tabular-nums plm-flex-shrink-0 plm-mb-1">
            {wins}W {draws}D {losses}L
          </span>
        )}
      </header>

      {played.length === 0 ? (
        <p className="plm-text-sm plm-text-warm-500 plm-italic plm-py-2">No matches played yet.</p>
      ) : (
        <>
          <ul className="plm-space-y-1.5 plm-list-none plm-pl-0 plm-m-0" role="list">
            {played.map((f) => {
              const isHome = f.homeClubId === playerClubId;
              const oppId = isHome ? f.awayClubId : f.homeClubId;
              const opp = clubDataMap.get(oppId);
              const r = resultFor(playerClubId, f);
              const myGoals = isHome ? f.result!.homeGoals : f.result!.awayGoals;
              const theirGoals = isHome ? f.result!.awayGoals : f.result!.homeGoals;
              return (
                <li key={f.id} className="plm-flex plm-items-center plm-gap-3 plm-py-1">
                  <span
                    className={`plm-inline-flex plm-items-center plm-justify-center plm-w-6 plm-h-6 plm-rounded-md plm-text-[11px] plm-font-bold plm-tabular-nums plm-flex-shrink-0 ${FORM_PILL_STYLES[r]}`}
                    aria-label={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
                  >
                    {r}
                  </span>
                  <span className="plm-text-warm-500 plm-text-xs plm-w-5 plm-text-center" aria-hidden>
                    {isHome ? 'vs' : '@'}
                  </span>
                  <span className="plm-text-sm plm-text-charcoal plm-flex-1 plm-truncate plm-font-medium">
                    {opp?.name ?? opp?.shortName}
                  </span>
                  <span className="plm-font-display plm-text-base plm-font-bold plm-tabular-nums plm-text-charcoal">
                    {myGoals}–{theirGoals}
                  </span>
                </li>
              );
            })}
          </ul>

          {formLine.length > 0 && (
            <div className="plm-mt-4 plm-pt-4 plm-border-t plm-border-warm-200 plm-flex plm-items-center plm-gap-3">
              <span className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.15em] plm-text-warm-500">
                Last 5
              </span>
              <div className="plm-flex plm-gap-1">
                {formLine.map((r, i) => (
                  <span
                    key={i}
                    className={`plm-inline-flex plm-items-center plm-justify-center plm-w-5 plm-h-5 plm-rounded-sm plm-text-[10px] plm-font-bold ${FORM_PILL_STYLES[r]}`}
                    aria-label={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
