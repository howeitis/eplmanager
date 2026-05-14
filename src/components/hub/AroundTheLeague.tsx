import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import type { Fixture, LeagueTableRow } from '../../types/entities';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

type FormResult = 'W' | 'D' | 'L';

const FORM_PILL_STYLES: Record<FormResult, string> = {
  W: 'plm-bg-emerald-600 plm-text-white',
  D: 'plm-bg-warm-300 plm-text-warm-800',
  L: 'plm-bg-rose-600 plm-text-white',
};

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

function recentForClub(playerClubId: string, fixtures: Fixture[], n: number) {
  return fixtures
    .filter((f) => f.played && f.result && (f.homeClubId === playerClubId || f.awayClubId === playerClubId))
    .sort((a, b) => a.gameweek - b.gameweek)
    .slice(-n);
}

/**
 * The Pulse — a horizontally scrolling deck of four small cards giving
 * a quick read on what's happening around the league: your recent
 * results, your form line, the Golden Boot race, and the derby table.
 *
 * Replaces the old separate RivalsWatch + GoalScorersWidget boxes.
 */
export function AroundTheLeague() {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const leagueTable = useGameStore((s) => s.leagueTable);
  const fixtures = useGameStore((s) => s.fixtures);

  const playerClubId = manager?.clubId;
  const playerClubData = playerClubId ? clubDataMap.get(playerClubId) : null;

  const sortedTable = useMemo(() => {
    return [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [leagueTable]);

  const recentFixtures = useMemo(
    () => (playerClubId ? recentForClub(playerClubId, fixtures, 3) : []),
    [playerClubId, fixtures],
  );

  const formResults = useMemo<FormResult[]>(() => {
    if (!playerClubId) return [];
    return recentForClub(playerClubId, fixtures, 5).map((f) => resultFor(playerClubId, f));
  }, [playerClubId, fixtures]);

  const goldenBoot = useMemo(() => {
    let best: { name: string; clubId: string; goals: number } | null = null;
    for (const club of clubs) {
      for (const p of club.roster) {
        if (p.isTemporary) continue;
        const g = Number.isFinite(p.goals) ? p.goals : 0;
        if (g > (best?.goals ?? 0)) best = { name: p.name, clubId: club.id, goals: g };
      }
    }
    return best && best.goals > 0 ? best : null;
  }, [clubs]);

  const rivals = useMemo(() => {
    if (!playerClubData) return [];
    return playerClubData.rivalries
      .map((rid) => {
        const idx = sortedTable.findIndex((r) => r.clubId === rid);
        if (idx === -1) return null;
        return { clubId: rid, position: idx + 1, row: sortedTable[idx] };
      })
      .filter((x): x is { clubId: string; position: number; row: LeagueTableRow } => x !== null);
  }, [playerClubData, sortedTable]);

  const playerPos = playerClubId
    ? sortedTable.findIndex((r) => r.clubId === playerClubId) + 1
    : 0;
  const playerRow = playerClubId ? sortedTable.find((r) => r.clubId === playerClubId) : undefined;
  const clubLabel = playerClubData?.shortName ?? playerClubData?.name ?? 'Club';

  return (
    <div>
      <header className="plm-mb-4 plm-pb-3 plm-border-b plm-border-warm-200">
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
          The Pulse
        </p>
        <h3 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
          Around the League
        </h3>
      </header>

      <div className="plm--mx-5 plm-px-5 plm-overflow-x-auto plm-snap-x plm-snap-mandatory plm-scroll-px-5">
        <ul role="list" className="plm-flex plm-gap-3 plm-list-none plm-pl-0 plm-m-0 plm-pb-1">
          <RecentResultsCard fixtures={recentFixtures} playerClubId={playerClubId} />
          <ClubFormCard form={formResults} clubName={clubLabel} />
          <GoldenBootCard top={goldenBoot} />
          <RivalsCard rivals={rivals} playerPos={playerPos} playerPoints={playerRow?.points ?? 0} />
        </ul>
      </div>
    </div>
  );
}

const CARD_CLASS = 'plm-snap-start plm-flex-shrink-0 plm-w-[240px] plm-h-[180px]';
const CARD_INNER =
  'plm-h-full plm-bg-warm-50/60 plm-border plm-border-warm-200 plm-rounded-xl plm-p-4 plm-flex plm-flex-col';
const EYEBROW =
  'plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.15em] plm-text-warm-500';
const CARD_TITLE =
  'plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5';
const EMPTY_LINE = 'plm-text-xs plm-text-warm-500 plm-italic';

function RecentResultsCard({
  fixtures,
  playerClubId,
}: {
  fixtures: Fixture[];
  playerClubId?: string;
}) {
  return (
    <li className={CARD_CLASS}>
      <div className={CARD_INNER}>
        <p className={EYEBROW}>Last 3</p>
        <h4 className={CARD_TITLE}>Recent Results</h4>
        <div className="plm-mt-3 plm-flex-1 plm-space-y-1.5 plm-overflow-hidden">
          {fixtures.length === 0 || !playerClubId ? (
            <p className={`${EMPTY_LINE} plm-pt-2`}>No matches played yet.</p>
          ) : (
            fixtures.map((f) => {
              const isHome = f.homeClubId === playerClubId;
              const oppId = isHome ? f.awayClubId : f.homeClubId;
              const opp = clubDataMap.get(oppId);
              const r = resultFor(playerClubId, f);
              const score = isHome
                ? `${f.result!.homeGoals}-${f.result!.awayGoals}`
                : `${f.result!.awayGoals}-${f.result!.homeGoals}`;
              return (
                <div key={f.id} className="plm-flex plm-items-center plm-gap-2 plm-text-xs">
                  <span
                    className={`plm-inline-flex plm-items-center plm-justify-center plm-w-4 plm-h-4 plm-rounded-sm plm-text-[9px] plm-font-bold ${FORM_PILL_STYLES[r]}`}
                    aria-label={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
                  >
                    {r}
                  </span>
                  <span className="plm-text-warm-500 plm-w-3 plm-text-center" aria-hidden>
                    {isHome ? 'v' : '@'}
                  </span>
                  <span className="plm-text-charcoal plm-flex-1 plm-truncate">
                    {opp?.shortName ?? opp?.name}
                  </span>
                  <span className="plm-tabular-nums plm-font-semibold plm-text-charcoal">
                    {score}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </li>
  );
}

function ClubFormCard({ form, clubName }: { form: FormResult[]; clubName: string }) {
  const wins = form.filter((r) => r === 'W').length;
  const losses = form.filter((r) => r === 'L').length;
  const trend =
    form.length === 0
      ? null
      : wins >= 3
        ? 'Climbing'
        : losses >= 3
          ? 'Sliding'
          : 'Steady';
  return (
    <li className={CARD_CLASS}>
      <div className={CARD_INNER}>
        <p className={EYEBROW}>Form Line</p>
        <h4 className={`${CARD_TITLE} plm-truncate`}>{clubName} Form</h4>
        <div className="plm-mt-3 plm-flex-1 plm-flex plm-flex-col plm-justify-between">
          {form.length === 0 ? (
            <p className={`${EMPTY_LINE} plm-pt-2`}>No form yet.</p>
          ) : (
            <>
              <div className="plm-flex plm-gap-1">
                {form.map((r, i) => (
                  <span
                    key={i}
                    className={`plm-inline-flex plm-items-center plm-justify-center plm-w-6 plm-h-6 plm-rounded-md plm-text-[11px] plm-font-bold ${FORM_PILL_STYLES[r]}`}
                    aria-label={r === 'W' ? 'Win' : r === 'D' ? 'Draw' : 'Loss'}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <p className="plm-font-display plm-italic plm-text-sm plm-text-warm-700">{trend}</p>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function GoldenBootCard({
  top,
}: {
  top: { name: string; clubId: string; goals: number } | null;
}) {
  const club = top ? clubDataMap.get(top.clubId) : null;
  return (
    <li className={CARD_CLASS}>
      <div className={CARD_INNER}>
        <p className={EYEBROW}>The Race</p>
        <h4 className={CARD_TITLE}>Golden Boot</h4>
        <div className="plm-mt-3 plm-flex-1 plm-flex plm-flex-col plm-justify-center">
          {!top ? (
            <p className={EMPTY_LINE}>No goals yet.</p>
          ) : (
            <>
              <div className="plm-flex plm-items-baseline plm-gap-1.5">
                <span className="plm-font-display plm-text-3xl plm-font-bold plm-text-charcoal plm-tabular-nums plm-leading-none">
                  {top.goals}
                </span>
                <span className="plm-text-[10px] plm-uppercase plm-tracking-[0.15em] plm-text-warm-500">
                  goals
                </span>
              </div>
              <p className="plm-text-sm plm-font-semibold plm-text-charcoal plm-mt-2 plm-truncate">
                {top.name}
              </p>
              <p className="plm-text-xs plm-text-warm-500 plm-truncate">
                {club?.shortName ?? club?.name ?? 'Premier League'}
              </p>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function RivalsCard({
  rivals,
  playerPos,
  playerPoints,
}: {
  rivals: { clubId: string; position: number; row: LeagueTableRow }[];
  playerPos: number;
  playerPoints: number;
}) {
  return (
    <li className={CARD_CLASS}>
      <div className={CARD_INNER}>
        <p className={EYEBROW}>Derby Watch</p>
        <h4 className={CARD_TITLE}>Rivals</h4>
        <div className="plm-mt-3 plm-flex-1 plm-space-y-1.5 plm-overflow-hidden">
          {rivals.length === 0 || playerPos === 0 ? (
            <p className={`${EMPTY_LINE} plm-pt-2`}>No derbies on record.</p>
          ) : (
            rivals.slice(0, 3).map(({ clubId, position, row }) => {
              const club = clubDataMap.get(clubId);
              const gap = row.points - playerPoints;
              const ahead = position < playerPos;
              const tone = ahead
                ? 'plm-text-rose-600'
                : gap === 0 && position === playerPos
                  ? 'plm-text-warm-600'
                  : 'plm-text-emerald-600';
              const arrow = ahead ? '▲' : '▼';
              const label = gap === 0 ? 'level' : `${gap > 0 ? '+' : ''}${gap}`;
              return (
                <div key={clubId} className="plm-flex plm-items-center plm-gap-2 plm-text-xs">
                  <span className="plm-text-warm-400 plm-tabular-nums plm-w-4 plm-text-right">
                    {position}
                  </span>
                  <span className="plm-text-charcoal plm-flex-1 plm-truncate">
                    {club?.shortName ?? club?.name}
                  </span>
                  <span className={`plm-tabular-nums plm-font-semibold ${tone}`}>
                    {arrow} {label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </li>
  );
}
