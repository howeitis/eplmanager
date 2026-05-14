import { useMemo, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';
import { ScrollPipIndicator } from '../shared/ScrollPipIndicator';
import { useNavigation } from '../../hooks/useNavigation';
import { useModalParams } from '../../hooks/useModalParams';
import type { Fixture, GamePhase, LeagueTableRow } from '../../types/entities';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

type FormResult = 'W' | 'D' | 'L';

// Mirrors MONTHLY_GAMEWEEK_RANGES in engine/matchSim.ts. Duplicated locally
// so the hub UI doesn't reach into the engine for this small read.
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
  august: 'August', september: 'September', october: 'October',
  november: 'November', december: 'December', january: 'January',
  february: 'February', march: 'March', april: 'April', may: 'May',
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

const RESULT_PILL: Record<FormResult, { bg: string; fg: string }> = {
  W: { bg: 'plm-bg-emerald-50', fg: 'plm-text-emerald-700' },
  D: { bg: 'plm-bg-warm-100', fg: 'plm-text-warm-600' },
  L: { bg: 'plm-bg-rose-50', fg: 'plm-text-rose-700' },
};

/**
 * Around the League — a snap-scrolling deck of four cards giving a
 * quick pulse on the player's club and the league:
 * Next Month → Recent Results → Rivals → Golden Boot.
 *
 * Design from the Editorial Modern handoff (variation 2): one card per
 * viewport, snap-mandatory, with a pip indicator in the section header.
 */
export function AroundTheLeague() {
  const manager = useGameStore((s) => s.manager);
  const leagueTable = useGameStore((s) => s.leagueTable);
  const fixtures = useGameStore((s) => s.fixtures);
  const clubs = useGameStore((s) => s.clubs);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { navigateToClub } = useNavigation();
  const { openModal } = useModalParams();

  const playerClubId = manager?.clubId;
  const playerClubData = playerClubId ? clubDataMap.get(playerClubId) : null;
  const accent = playerClubData?.colors.primary;

  const sortedTable = useMemo(() => {
    return [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [leagueTable]);

  const recentMonthData = useMemo(() => {
    if (!playerClubId) return { month: null as GamePhase | null, played: [] as Fixture[] };
    const myPlayed = fixtures.filter(
      (f) => f.played && f.result && (f.homeClubId === playerClubId || f.awayClubId === playerClubId),
    );
    if (myPlayed.length === 0) return { month: null, played: [] };
    const mostRecentGw = Math.max(...myPlayed.map((f) => f.gameweek));
    let activeMonth: GamePhase | null = null;
    for (const phase of IN_SEASON_ORDER) {
      const range = MONTHLY_GAMEWEEK_RANGES[phase];
      if (range && mostRecentGw >= range[0] && mostRecentGw <= range[1]) {
        activeMonth = phase;
        break;
      }
    }
    if (!activeMonth) return { month: null, played: [] };
    const range = MONTHLY_GAMEWEEK_RANGES[activeMonth]!;
    const played = myPlayed
      .filter((f) => f.gameweek >= range[0] && f.gameweek <= range[1])
      .sort((a, b) => a.gameweek - b.gameweek);
    return { month: activeMonth, played };
  }, [playerClubId, fixtures]);

  const nextMonthData = useMemo(() => {
    if (!playerClubId) return { month: null as GamePhase | null, upcoming: [] as Fixture[] };
    const myUpcoming = fixtures.filter(
      (f) => !f.played && (f.homeClubId === playerClubId || f.awayClubId === playerClubId),
    );
    if (myUpcoming.length === 0) return { month: null, upcoming: [] };
    const nextGw = Math.min(...myUpcoming.map((f) => f.gameweek));
    let activeMonth: GamePhase | null = null;
    for (const phase of IN_SEASON_ORDER) {
      const range = MONTHLY_GAMEWEEK_RANGES[phase];
      if (range && nextGw >= range[0] && nextGw <= range[1]) {
        activeMonth = phase;
        break;
      }
    }
    if (!activeMonth) return { month: null, upcoming: [] };
    const range = MONTHLY_GAMEWEEK_RANGES[activeMonth]!;
    const upcoming = myUpcoming
      .filter((f) => f.gameweek >= range[0] && f.gameweek <= range[1])
      .sort((a, b) => a.gameweek - b.gameweek);
    return { month: activeMonth, upcoming };
  }, [playerClubId, fixtures]);

  const rivals = useMemo(() => {
    if (!playerClubData) return [];
    return playerClubData.rivalries
      .map((rid) => {
        const idx = sortedTable.findIndex((r) => r.clubId === rid);
        if (idx === -1) return null;
        return { clubId: rid, position: idx + 1, row: sortedTable[idx] };
      })
      .filter((x): x is { clubId: string; position: number; row: LeagueTableRow } => x !== null)
      .sort((a, b) => a.position - b.position);
  }, [playerClubData, sortedTable]);

  const goldenBoot = useMemo(() => {
    const out: { playerId: string; name: string; clubId: string; goals: number }[] = [];
    for (const club of clubs) {
      for (const p of club.roster) {
        if (p.isTemporary) continue;
        const g = Number.isFinite(p.goals) ? p.goals : 0;
        if (g > 0) out.push({ playerId: p.id, name: p.name, clubId: club.id, goals: g });
      }
    }
    out.sort((a, b) => b.goals - a.goals);
    return out.slice(0, 4);
  }, [clubs]);

  const playerPos = playerClubId
    ? sortedTable.findIndex((r) => r.clubId === playerClubId) + 1
    : 0;

  if (!playerClubId) return null;

  return (
    <div>
      <div className="plm-px-1 plm-flex plm-items-center plm-justify-between plm-mb-2.5">
        <p className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-[0.16em] plm-text-warm-500 plm-m-0">
          Around the League
        </p>
        <ScrollPipIndicator count={4} scrollRef={scrollRef} accent={accent} />
      </div>

      <div
        ref={scrollRef}
        className="plm--mx-4 plm-px-4 plm-overflow-x-auto plm-snap-x plm-snap-mandatory plm-pb-2 plm-no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        <ul role="list" className="plm-flex plm-gap-3 plm-list-none plm-pl-0 plm-m-0">
          <Card
            title={nextMonthData.month ? `${PHASE_MONTH_LABEL[nextMonthData.month]!.toUpperCase()}'S MATCHES` : 'UPCOMING MATCHES'}
            subtitle="Looking ahead"
            accent={accent}
          >
            <NextMonthList fixtures={nextMonthData.upcoming} playerClubId={playerClubId} onOpenClub={navigateToClub} />
          </Card>

          <Card
            title={recentMonthData.month ? `${PHASE_MONTH_LABEL[recentMonthData.month]!.toUpperCase()}'S RESULTS` : 'NO MATCHES YET'}
            subtitle="Looking back"
            accent={accent}
          >
            <RecentResultsList fixtures={recentMonthData.played} playerClubId={playerClubId} onOpenClub={navigateToClub} />
          </Card>

          <Card title="Rivals Watch" subtitle="Derby table" accent={accent}>
            <RivalsList rivals={rivals} playerPos={playerPos} onOpenClub={navigateToClub} />
          </Card>

          <Card title="Golden Boot" subtitle="The race" accent={accent}>
            <GoldenBootList rows={goldenBoot} onOpenPlayer={openModal} onOpenClub={navigateToClub} />
          </Card>
        </ul>
      </div>
    </div>
  );
}

// ─── Shared card chrome ───────────────────────────────────────────

const CARD_OUTER =
  'plm-snap-start plm-flex-shrink-0 plm-w-[calc(100%-32px)] plm-bg-white plm-border plm-border-warm-200 plm-rounded-2xl plm-p-4 plm-min-h-[200px]';

function Card({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle?: string | null;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <li className={CARD_OUTER}>
      <header className="plm-flex plm-items-end plm-justify-between plm-mb-3 plm-gap-3">
        <div className="plm-min-w-0">
          {subtitle && (
            <p className="plm-text-[9.5px] plm-font-bold plm-uppercase plm-tracking-[0.16em] plm-text-warm-500 plm-m-0">
              {subtitle}
            </p>
          )}
          <h4 className="plm-font-display plm-text-base plm-font-extrabold plm-text-charcoal plm-leading-tight plm-mt-0.5 plm-truncate">
            {title}
          </h4>
        </div>
        <span
          aria-hidden
          className="plm-flex-shrink-0 plm-rounded-sm"
          style={{ width: 18, height: 3, backgroundColor: accent ?? '#1A1A1A' }}
        />
      </header>
      {children}
    </li>
  );
}

// ─── Fixture row — shared by Next Month and Recent Results ────────

function FixtureRow({
  isHome,
  oppClubId,
  rightSlot,
  resultTone,
  onOpenClub,
}: {
  isHome: boolean;
  oppClubId: string;
  rightSlot: React.ReactNode;
  resultTone?: { letter: FormResult } | null;
  onOpenClub?: (clubId: string) => void;
}) {
  const opp = clubDataMap.get(oppClubId);
  const clickable = !!onOpenClub;
  const Row = clickable ? 'button' : 'div';
  return (
    <Row
      type={clickable ? 'button' : undefined as undefined}
      onClick={clickable ? () => onOpenClub!(oppClubId) : undefined}
      aria-label={clickable ? `View ${opp?.name}` : undefined}
      className={`plm-flex plm-items-center plm-gap-2.5 plm-py-1.5 plm-border-b plm-border-warm-200 last:plm-border-b-0 plm-w-full plm-text-left ${
        clickable ? 'plm-cursor-pointer hover:plm-bg-warm-50 plm-transition-colors plm-rounded-md' : ''
      }`}
    >
      {resultTone ? (
        <span
          className={`plm-inline-flex plm-items-center plm-justify-center plm-w-[18px] plm-h-[18px] plm-rounded-md plm-text-[10px] plm-font-extrabold ${RESULT_PILL[resultTone.letter].bg} ${RESULT_PILL[resultTone.letter].fg}`}
          aria-label={resultTone.letter === 'W' ? 'Win' : resultTone.letter === 'D' ? 'Draw' : 'Loss'}
        >
          {resultTone.letter}
        </span>
      ) : (
        <span className="plm-inline-block plm-w-[18px]" aria-hidden />
      )}
      <span
        className="plm-text-[9.5px] plm-font-bold plm-uppercase plm-tracking-[0.1em] plm-text-warm-400 plm-w-[18px]"
        aria-hidden
      >
        {isHome ? 'vs' : '@'}
      </span>
      {getClubLogoUrl(oppClubId) ? (
        <img
          src={getClubLogoUrl(oppClubId)}
          alt=""
          className="plm-w-[22px] plm-h-[22px] plm-object-contain plm-flex-shrink-0"
          aria-hidden
        />
      ) : (
        <span
          className="plm-w-[22px] plm-h-[22px] plm-flex-shrink-0 plm-rounded-full"
          style={{ backgroundColor: opp?.colors.primary }}
          aria-hidden
        />
      )}
      <span className="plm-font-display plm-font-bold plm-text-[13px] plm-flex-1 plm-min-w-0 plm-truncate plm-text-charcoal">
        {opp?.name}
      </span>
      <span className="plm-font-display plm-font-extrabold plm-text-[14px] plm-text-charcoal plm-tabular-nums">
        {rightSlot}
      </span>
    </Row>
  );
}

function NextMonthList({ fixtures, playerClubId, onOpenClub }: { fixtures: Fixture[]; playerClubId: string; onOpenClub: (clubId: string) => void }) {
  if (fixtures.length === 0) {
    return <p className="plm-text-xs plm-text-warm-500 plm-italic plm-py-2">No upcoming fixtures.</p>;
  }
  return (
    <div className="plm-grid plm-gap-0">
      {fixtures.slice(0, 4).map((f) => {
        const isHome = f.homeClubId === playerClubId;
        const oppId = isHome ? f.awayClubId : f.homeClubId;
        return (
          <FixtureRow
            key={f.id}
            isHome={isHome}
            oppClubId={oppId}
            onOpenClub={onOpenClub}
            rightSlot={
              <span className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-[0.1em] plm-text-warm-500 plm-font-sans">
                MD {f.gameweek}
              </span>
            }
          />
        );
      })}
    </div>
  );
}

function RecentResultsList({ fixtures, playerClubId, onOpenClub }: { fixtures: Fixture[]; playerClubId: string; onOpenClub: (clubId: string) => void }) {
  if (fixtures.length === 0) {
    return <p className="plm-text-xs plm-text-warm-500 plm-italic plm-py-2">No matches played yet.</p>;
  }
  return (
    <div className="plm-grid plm-gap-0">
      {fixtures.slice(0, 4).map((f) => {
        const isHome = f.homeClubId === playerClubId;
        const oppId = isHome ? f.awayClubId : f.homeClubId;
        const myGoals = isHome ? f.result!.homeGoals : f.result!.awayGoals;
        const theirGoals = isHome ? f.result!.awayGoals : f.result!.homeGoals;
        const r = resultFor(playerClubId, f);
        return (
          <FixtureRow
            key={f.id}
            isHome={isHome}
            oppClubId={oppId}
            onOpenClub={onOpenClub}
            resultTone={{ letter: r }}
            rightSlot={`${myGoals}–${theirGoals}`}
          />
        );
      })}
    </div>
  );
}

// ─── Rivals card ───────────────────────────────────────────────────

function RivalsList({
  rivals,
  playerPos,
  onOpenClub,
}: {
  rivals: { clubId: string; position: number; row: LeagueTableRow }[];
  playerPos: number;
  onOpenClub: (clubId: string) => void;
}) {
  if (rivals.length === 0 || playerPos === 0) {
    return <p className="plm-text-xs plm-text-warm-500 plm-italic plm-py-2">No derbies on record.</p>;
  }
  return (
    <div className="plm-grid plm-gap-0">
      {rivals.slice(0, 4).map(({ clubId, position, row }) => {
        const club = clubDataMap.get(clubId);
        const ahead = position < playerPos;
        const gap = position - playerPos;
        const tone = gap === 0 ? 'plm-text-warm-500' : ahead ? 'plm-text-rose-700' : 'plm-text-emerald-700';
        const label = gap === 0 ? '—' : ahead ? `+${Math.abs(gap)}` : `−${Math.abs(gap)}`;
        return (
          <button
            type="button"
            key={clubId}
            onClick={() => onOpenClub(clubId)}
            aria-label={`View ${club?.name}`}
            className="plm-flex plm-items-center plm-gap-2.5 plm-py-2 plm-border-b plm-border-warm-200 last:plm-border-b-0 plm-w-full plm-text-left plm-cursor-pointer hover:plm-bg-warm-50 plm-transition-colors plm-rounded-md"
          >
            {getClubLogoUrl(clubId) ? (
              <img
                src={getClubLogoUrl(clubId)}
                alt=""
                className="plm-w-7 plm-h-7 plm-object-contain plm-flex-shrink-0"
                aria-hidden
              />
            ) : (
              <span
                className="plm-w-7 plm-h-7 plm-rounded-full plm-flex-shrink-0"
                style={{ backgroundColor: club?.colors.primary }}
                aria-hidden
              />
            )}
            <div className="plm-min-w-0 plm-flex-1">
              <p className="plm-font-display plm-font-bold plm-text-[13.5px] plm-text-charcoal plm-leading-tight plm-truncate plm-m-0">
                {club?.name}
              </p>
              <p className="plm-text-[10px] plm-text-warm-500 plm-mt-0.5 plm-tracking-wide plm-m-0">
                {ordinal(position)} · {row.points}pts
              </p>
            </div>
            <span className={`plm-font-display plm-font-extrabold plm-text-[14px] ${tone}`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

// ─── Golden Boot card ─────────────────────────────────────────────

function GoldenBootList({
  rows,
  onOpenPlayer,
  onOpenClub,
}: {
  rows: { playerId: string; name: string; clubId: string; goals: number }[];
  onOpenPlayer: (playerId: string, clubId: string) => void;
  onOpenClub: (clubId: string) => void;
}) {
  if (rows.length === 0) {
    return <p className="plm-text-xs plm-text-warm-500 plm-italic plm-py-2">No goals yet.</p>;
  }
  return (
    <div className="plm-grid plm-gap-0">
      {rows.map((r, i) => {
        const club = clubDataMap.get(r.clubId);
        return (
          <div
            key={r.playerId}
            className="plm-grid plm-grid-cols-[14px_1fr_28px] plm-gap-2 plm-items-center plm-py-2 plm-border-b plm-border-warm-200 last:plm-border-b-0"
          >
            <span className="plm-font-display plm-font-bold plm-text-[11px] plm-text-warm-500 plm-tabular-nums">
              {i + 1}
            </span>
            <div className="plm-min-w-0">
              <button
                type="button"
                onClick={() => onOpenPlayer(r.playerId, r.clubId)}
                aria-label={`View ${r.name}`}
                className="plm-font-display plm-font-bold plm-text-[13.5px] plm-text-charcoal plm-leading-tight plm-truncate plm-m-0 plm-block plm-text-left plm-w-full hover:plm-underline"
              >
                {r.name}
              </button>
              <button
                type="button"
                onClick={() => onOpenClub(r.clubId)}
                aria-label={`View ${club?.name}`}
                className="plm-flex plm-items-center plm-gap-1.5 plm-mt-0.5 plm-text-left hover:plm-opacity-80 plm-transition-opacity"
              >
                {getClubLogoUrl(r.clubId) ? (
                  <img
                    src={getClubLogoUrl(r.clubId)}
                    alt=""
                    className="plm-w-4 plm-h-4 plm-object-contain plm-flex-shrink-0"
                    aria-hidden
                  />
                ) : (
                  <span
                    className="plm-inline-block plm-w-1.5 plm-h-1.5 plm-rounded-full"
                    style={{ backgroundColor: club?.colors.primary }}
                    aria-hidden
                  />
                )}
                <span className="plm-text-[9.5px] plm-uppercase plm-tracking-[0.1em] plm-font-bold plm-text-warm-500 plm-truncate">
                  {club?.name}
                </span>
              </button>
            </div>
            <span className="plm-font-display plm-font-extrabold plm-text-[17px] plm-text-charcoal plm-tabular-nums plm-text-right">
              {r.goals}
            </span>
          </div>
        );
      })}
    </div>
  );
}
