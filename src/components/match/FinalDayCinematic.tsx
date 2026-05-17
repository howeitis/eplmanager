import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CLUBS } from '@/data/clubs';
import { Confetti } from '@/components/shared/Confetti';
import { getClubLogoUrl } from '@/data/assets';
import { SeededRNG } from '@/utils/rng';
import {
  simulateMatch,
  selectAIFormation,
  selectAIMentality,
  getMonthFixtures,
  getLeaguePosition,
  type Formation,
  type Mentality,
  type ClubFortune,
} from '@/engine/matchSim';
import type { Fixture, LeagueTableRow, MatchResult } from '@/types/entities';
import type { FinalDayStakes } from './finalDayStakes';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

interface FinalDayCinematicProps {
  /** Season seed for the active season — same shape as simulateMonth uses. */
  seasonSeed: string;
  /** Player's selected formation for the round. */
  formation: Formation;
  /** Player's selected mentality. */
  mentality: Mentality;
  /** Per-club fortune for the active season. */
  fortunes: ClubFortune[];
  /** Stakes detected at trigger time — drives the banner copy. */
  stakes: FinalDayStakes;
  /**
   * Called after the user clicks Continue. Receives whether the player won
   * the title on this final day in a way that would otherwise have slipped
   * — i.e. they were not guaranteed champions going in, but are now.
   * Lets the parent mint a `final-day-clincher` moment card.
   */
  onFinish: (info: { playerWasClincher: boolean }) => void;
}

type Stage = 'pre' | 'live' | 'post';

/**
 * Final-round dramatic reveal. Runs a side-channel preview simulation of
 * May's fixtures using the same seeded RNG the canonical simulateMonth
 * will use, then surfaces the scores progressively with a table reshuffle.
 *
 * The preview never writes to the store — once the user clicks Continue,
 * the parent runs the normal month advance and the canonical results
 * commit. Because both rng paths share the same seed (`${seasonSeed}-month-may`),
 * the previewed scores match what gets persisted.
 */
export function FinalDayCinematic({
  seasonSeed,
  formation,
  mentality,
  fortunes,
  stakes,
  onFinish,
}: FinalDayCinematicProps) {
  const clubs = useGameStore((s) => s.clubs);
  const fixtures = useGameStore((s) => s.fixtures);
  const liveTable = useGameStore((s) => s.leagueTable);
  const manager = useGameStore((s) => s.manager);
  const startingXI = useGameStore((s) => s.startingXI);
  const captainId = useGameStore((s) => s.captainId);
  const activeModifiers = useGameStore((s) => s.activeModifiers);

  const playerClubId = manager?.clubId ?? '';
  const playerClubData = clubDataMap.get(playerClubId);

  const [stage, setStage] = useState<Stage>('pre');
  const [revealedCount, setRevealedCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Pre-compute the May fixtures + their would-be results. Deterministic —
  // same monthRng as simulateMonth so the canonical commit later matches.
  const previewed = useMemo(
    () => previewMayResults({
      seasonSeed,
      formation,
      mentality,
      fortunes,
      clubs,
      fixtures,
      liveTable,
      playerClubId,
      managerReputation: manager?.reputation,
      managerPreferredFormation: manager?.preferredFormation,
      managerBackground: manager?.playingBackground,
      startingXI,
      captainId,
      activeModifiers,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Compose what the table WILL look like once these results are applied.
  // Used for the post-match reveal — pre-match table comes from the live store.
  const projectedTable = useMemo(
    () => applyResultsToTable(liveTable, previewed.results),
    [liveTable, previewed.results],
  );

  const sortedPre = useMemo(() => sortTableRows(liveTable), [liveTable]);
  const sortedPost = useMemo(() => sortTableRows(projectedTable), [projectedTable]);

  // ─── Stage transitions ──────────────────────────────────────────

  // While in 'live' stage, drip-reveal one result every 900ms.
  useEffect(() => {
    if (stage !== 'live') return;
    if (revealedCount >= previewed.results.length) {
      const t = setTimeout(() => setStage('post'), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealedCount((n) => n + 1), 900);
    return () => clearTimeout(t);
  }, [stage, revealedCount, previewed.results.length]);

  // Title-win confetti on entering the 'post' stage.
  useEffect(() => {
    if (stage !== 'post') return;
    const champion = sortedPost[0];
    if (champion?.clubId === playerClubId) {
      const t = setTimeout(() => setShowConfetti(true), 250);
      return () => clearTimeout(t);
    }
  }, [stage, sortedPost, playerClubId]);

  // The clincher check: was the player not yet guaranteed champion at the
  // start of this round, but ends it as champion? That's the "won it on
  // the final day" moment worth minting.
  const playerWasClincher = useMemo(() => {
    const preChampGuaranteed = wouldGuaranteeChampion(sortedPre, playerClubId);
    const postChamp = sortedPost[0]?.clubId === playerClubId;
    return postChamp && !preChampGuaranteed;
  }, [sortedPre, sortedPost, playerClubId]);

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="plm-space-y-4 plm-w-full plm-py-4">
      {showConfetti && <Confetti count={90} duration={4200} />}

      {/* Hero banner */}
      <div className="plm-bg-charcoal plm-rounded-lg plm-px-5 plm-py-6 plm-text-center">
        <div className="plm-flex plm-items-center plm-justify-center plm-gap-2 plm-mb-1">
          <div className="plm-h-px plm-w-12 plm-bg-amber-300" />
          <span className="plm-text-[10px] plm-font-bold plm-text-amber-300 plm-uppercase plm-tracking-[0.28em]">
            Final Day
          </span>
          <div className="plm-h-px plm-w-12 plm-bg-amber-300" />
        </div>
        <h2 className="plm-font-display plm-text-3xl plm-font-bold plm-text-white plm-leading-tight">
          {stakes.kind === 'title' && 'Champions Decided Today'}
          {stakes.kind === 'relegation' && 'Survival Day'}
          {stakes.kind === 'topfour' && 'Top-Four Push'}
        </h2>
        <p className="plm-text-xs plm-text-warm-300 plm-mt-2 plm-italic">
          {stakes.kind === 'title' && `${stakes.contenders.length} clubs can lift the trophy. Forty-five minutes each way.`}
          {stakes.kind === 'relegation' && 'No-one safe yet in the relegation places.'}
          {stakes.kind === 'topfour' && 'A Champions League place is still on the line.'}
        </p>
      </div>

      {/* Pre-match: contenders + button */}
      {stage === 'pre' && (
        <>
          <ContenderPanel
            title="As it stands"
            rows={pickContenderRows(sortedPre, stakes)}
            playerClubId={playerClubId}
          />
          <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
            <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
              Today's Fixtures
            </h3>
            <div className="plm-space-y-2">
              {previewed.results.map((r) => (
                <FixtureRow key={r.fixtureId} result={r} reveal={false} playerClubId={playerClubId} />
              ))}
            </div>
          </div>
          <button
            onClick={() => { setStage('live'); setRevealedCount(0); }}
            className="plm-w-full plm-py-4 plm-rounded-lg plm-font-display plm-font-bold plm-text-base plm-tracking-wider plm-uppercase plm-text-white plm-min-h-[44px] plm-transition-transform hover:plm-scale-[1.01]"
            style={{ backgroundColor: playerClubData?.colors.primary || '#1A1A1A' }}
          >
            Kick Off
          </button>
        </>
      )}

      {/* Live: scores tick in */}
      {stage === 'live' && (
        <>
          <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
            <div className="plm-flex plm-items-center plm-gap-2 plm-mb-3">
              <span className="plm-w-2 plm-h-2 plm-rounded-full plm-bg-red-500 plm-animate-pulse" aria-hidden />
              <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal">
                Live
              </h3>
              <span className="plm-text-[10px] plm-font-semibold plm-text-warm-400 plm-tabular-nums plm-ml-auto">
                {revealedCount} / {previewed.results.length}
              </span>
            </div>
            <div className="plm-space-y-2">
              {previewed.results.map((r, idx) => (
                <FixtureRow
                  key={r.fixtureId}
                  result={r}
                  reveal={idx < revealedCount}
                  playerClubId={playerClubId}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Post: result reveal + new standings */}
      {stage === 'post' && (
        <>
          <ChampionBanner
            champion={sortedPost[0]?.clubId ?? ''}
            playerClubId={playerClubId}
            playerWasClincher={playerWasClincher}
            stakes={stakes}
            sortedPost={sortedPost}
          />
          <ContenderPanel
            title="Final standings"
            rows={pickContenderRows(sortedPost, stakes)}
            playerClubId={playerClubId}
          />
          <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
            <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
              Final Scores
            </h3>
            <div className="plm-space-y-2">
              {previewed.results.map((r) => (
                <FixtureRow key={r.fixtureId} result={r} reveal playerClubId={playerClubId} />
              ))}
            </div>
          </div>
          <button
            onClick={() => onFinish({ playerWasClincher })}
            className="plm-w-full plm-py-3.5 plm-rounded-lg plm-font-body plm-font-semibold plm-text-sm plm-bg-charcoal plm-text-white hover:plm-bg-charcoal-light plm-transition-colors plm-min-h-[44px]"
          >
            Continue to Match Report
          </button>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function ContenderPanel({
  title,
  rows,
  playerClubId,
}: {
  title: string;
  rows: LeagueTableRow[];
  playerClubId: string;
}) {
  return (
    <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
      <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
        {title}
      </h3>
      <div className="plm-space-y-1">
        {rows.map((row, idx) => {
          const club = clubDataMap.get(row.clubId);
          const isPlayer = row.clubId === playerClubId;
          return (
            <div
              key={row.clubId}
              className={`plm-flex plm-items-center plm-gap-3 plm-rounded plm-px-3 plm-py-2 ${
                isPlayer ? 'plm-bg-warm-100' : 'plm-bg-warm-50'
              }`}
            >
              <span className="plm-text-xs plm-font-bold plm-tabular-nums plm-text-warm-500 plm-w-5 plm-text-right">
                {idx + 1}
              </span>
              {club && getClubLogoUrl(club.id) ? (
                <img src={getClubLogoUrl(club.id)} alt="" className="plm-w-5 plm-h-5 plm-object-contain plm-flex-shrink-0" />
              ) : (
                <div
                  className="plm-w-3 plm-h-3 plm-rounded-full plm-flex-shrink-0"
                  style={{ backgroundColor: club?.colors.primary || '#999' }}
                />
              )}
              <span className={`plm-text-sm plm-flex-1 plm-truncate ${isPlayer ? 'plm-font-bold' : 'plm-font-medium'}`}>
                {club?.shortName || row.clubId}
              </span>
              <span className="plm-text-xs plm-text-warm-500 plm-tabular-nums">
                {row.played}P
              </span>
              <span className="plm-text-sm plm-font-bold plm-tabular-nums plm-text-charcoal plm-w-8 plm-text-right">
                {row.points}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FixtureRow({
  result,
  reveal,
  playerClubId,
}: {
  result: MatchResult;
  reveal: boolean;
  playerClubId: string;
}) {
  const home = clubDataMap.get(result.homeClubId);
  const away = clubDataMap.get(result.awayClubId);
  const isPlayerMatch = result.homeClubId === playerClubId || result.awayClubId === playerClubId;
  return (
    <div
      className={`plm-flex plm-items-center plm-gap-2 plm-rounded plm-border plm-px-3 plm-py-2 plm-transition-all ${
        isPlayerMatch
          ? 'plm-bg-warm-100 plm-border-warm-300'
          : 'plm-bg-white plm-border-warm-100'
      }`}
    >
      <div className="plm-flex-1 plm-flex plm-items-center plm-gap-1.5 plm-justify-end plm-min-w-0">
        <span className={`plm-text-sm plm-truncate plm-text-right ${result.homeClubId === playerClubId ? 'plm-font-bold' : ''}`}>
          {home?.shortName || result.homeClubId}
        </span>
        {home && getClubLogoUrl(home.id) && (
          <img src={getClubLogoUrl(home.id)} alt="" className="plm-w-4 plm-h-4 plm-flex-shrink-0 plm-object-contain" />
        )}
      </div>
      <div className="plm-flex plm-items-center plm-gap-1.5 plm-mx-2 plm-min-w-[60px] plm-justify-center">
        {reveal ? (
          <>
            <span className={`plm-text-base plm-font-bold plm-tabular-nums plm-w-5 plm-text-right plm-animate-fade-in ${result.homeGoals > result.awayGoals ? 'plm-text-charcoal' : 'plm-text-warm-400'}`}>
              {result.homeGoals}
            </span>
            <span className="plm-text-warm-300">-</span>
            <span className={`plm-text-base plm-font-bold plm-tabular-nums plm-w-5 plm-text-left plm-animate-fade-in ${result.awayGoals > result.homeGoals ? 'plm-text-charcoal' : 'plm-text-warm-400'}`}>
              {result.awayGoals}
            </span>
          </>
        ) : (
          <span className="plm-text-xs plm-text-warm-400 plm-uppercase plm-tracking-wider">v</span>
        )}
      </div>
      <div className="plm-flex-1 plm-flex plm-items-center plm-gap-1.5 plm-min-w-0">
        {away && getClubLogoUrl(away.id) && (
          <img src={getClubLogoUrl(away.id)} alt="" className="plm-w-4 plm-h-4 plm-flex-shrink-0 plm-object-contain" />
        )}
        <span className={`plm-text-sm plm-truncate ${result.awayClubId === playerClubId ? 'plm-font-bold' : ''}`}>
          {away?.shortName || result.awayClubId}
        </span>
      </div>
    </div>
  );
}

function ChampionBanner({
  champion,
  playerClubId,
  playerWasClincher,
  stakes,
  sortedPost,
}: {
  champion: string;
  playerClubId: string;
  playerWasClincher: boolean;
  stakes: FinalDayStakes;
  sortedPost: LeagueTableRow[];
}) {
  const champClub = clubDataMap.get(champion);
  const isPlayer = champion === playerClubId;
  const playerPos = sortedPost.findIndex((r) => r.clubId === playerClubId);

  // For non-title stakes, focus on the player's outcome rather than the champion.
  if (stakes.kind === 'relegation') {
    const survived = playerPos < 17;
    return (
      <div
        className="plm-rounded-lg plm-px-5 plm-py-6 plm-text-center plm-border-2"
        style={{
          borderColor: survived ? '#10b981' : '#dc2626',
          backgroundColor: survived ? '#ecfdf5' : '#fef2f2',
        }}
      >
        <div className="plm-text-3xl plm-mb-2" aria-hidden>{survived ? '⛑' : '⤓'}</div>
        <h3 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal">
          {survived ? 'We Stayed Up' : 'Down to the Drop Zone'}
        </h3>
        <p className="plm-text-xs plm-text-warm-600 plm-mt-2">
          {survived ? 'Survival secured.' : 'A long summer ahead.'}
        </p>
      </div>
    );
  }
  if (stakes.kind === 'topfour') {
    const got = playerPos < 4;
    return (
      <div
        className="plm-rounded-lg plm-px-5 plm-py-6 plm-text-center plm-border-2"
        style={{
          borderColor: got ? '#3b82f6' : '#9ca3af',
          backgroundColor: got ? '#eff6ff' : '#f9fafb',
        }}
      >
        <div className="plm-text-3xl plm-mb-2" aria-hidden>{got ? '★' : '☆'}</div>
        <h3 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal">
          {got ? 'Champions League Football' : 'Europa Next Year'}
        </h3>
        <p className="plm-text-xs plm-text-warm-600 plm-mt-2">
          Finished {playerPos + 1}{ordinalSuffix(playerPos + 1)}.
        </p>
      </div>
    );
  }

  // Title stakes — champion banner.
  return (
    <div
      className="plm-rounded-lg plm-px-5 plm-py-6 plm-text-center plm-border-2 plm-relative plm-overflow-hidden"
      style={{
        backgroundColor: '#fffbeb',
        borderColor: champClub?.colors.primary || '#FFD700',
      }}
    >
      <div className="plm-text-3xl plm-mb-1" aria-hidden>👑</div>
      <div className="plm-text-[10px] plm-font-bold plm-text-amber-700 plm-uppercase plm-tracking-[0.2em] plm-mb-1">
        Premier League Champions
      </div>
      <h3 className="plm-font-display plm-text-3xl plm-font-bold plm-text-charcoal plm-leading-tight">
        {champClub?.name || champion}
      </h3>
      {isPlayer && playerWasClincher && (
        <p className="plm-text-xs plm-text-amber-800 plm-mt-2 plm-italic">
          On the final day. Decided by your result. A moment your binder will remember.
        </p>
      )}
      {isPlayer && !playerWasClincher && (
        <p className="plm-text-xs plm-text-amber-800 plm-mt-2 plm-italic">
          Champions in style.
        </p>
      )}
      {!isPlayer && (
        <p className="plm-text-xs plm-text-warm-600 plm-mt-2 plm-italic">
          You finished {playerPos + 1}{ordinalSuffix(playerPos + 1)}.
        </p>
      )}
    </div>
  );
}

// ─── Pure helpers ──────────────────────────────────────────────────

interface PreviewArgs {
  seasonSeed: string;
  formation: Formation;
  mentality: Mentality;
  fortunes: ClubFortune[];
  clubs: ReturnType<typeof useGameStore.getState>['clubs'];
  fixtures: Fixture[];
  liveTable: LeagueTableRow[];
  playerClubId: string;
  managerReputation: number | undefined;
  managerPreferredFormation: string | undefined;
  managerBackground: import('@/types/entities').PlayingBackground | undefined;
  startingXI: Record<string, string>;
  captainId: string | null;
  activeModifiers: import('@/types/entities').ActiveModifier[];
}

function previewMayResults({
  seasonSeed,
  formation,
  mentality,
  fortunes,
  clubs,
  fixtures,
  liveTable,
  playerClubId,
  managerReputation,
  managerPreferredFormation,
  managerBackground,
  startingXI,
  captainId,
  activeModifiers,
}: PreviewArgs): { results: MatchResult[] } {
  const monthRng = new SeededRNG(`${seasonSeed}-month-may`);
  const fortuneMap = new Map<string, number>();
  for (const f of fortunes) fortuneMap.set(f.clubId, f.fortune);

  const monthFixs = getMonthFixtures(fixtures, 'may');
  const results: MatchResult[] = [];

  for (const fixture of monthFixs) {
    if (fixture.played) continue;

    const homeClub = clubs.find((c) => c.id === fixture.homeClubId)!;
    const awayClub = clubs.find((c) => c.id === fixture.awayClubId)!;
    const isPlayerHome = homeClub.id === playerClubId;
    const isPlayerAway = awayClub.id === playerClubId;

    const homePos = getLeaguePosition(liveTable, homeClub.id) || 10;
    const awayPos = getLeaguePosition(liveTable, awayClub.id) || 10;

    const homeFormation = isPlayerHome ? formation : selectAIFormation(monthRng, homeClub.tier);
    const awayFormation = isPlayerAway ? formation : selectAIFormation(monthRng, awayClub.tier);
    const homeMentality = isPlayerHome ? mentality : selectAIMentality(monthRng, homeClub.tier, homePos, 20);
    const awayMentality = isPlayerAway ? mentality : selectAIMentality(monthRng, awayClub.tier, awayPos, 20);

    const homeXI = isPlayerHome ? startingXI : undefined;
    const awayXI = isPlayerAway ? startingXI : undefined;

    const result = simulateMatch({
      homeClub,
      awayClub,
      fixture,
      homeFormation,
      awayFormation,
      homeMentality,
      awayMentality,
      homeFortune: fortuneMap.get(homeClub.id) || 0,
      awayFortune: fortuneMap.get(awayClub.id) || 0,
      homeReputation: isPlayerHome ? managerReputation : undefined,
      awayReputation: isPlayerAway ? managerReputation : undefined,
      homePreferredFormation: isPlayerHome ? managerPreferredFormation : undefined,
      awayPreferredFormation: isPlayerAway ? managerPreferredFormation : undefined,
      homeStartingXI: homeXI,
      awayStartingXI: awayXI,
      homeCaptainId: isPlayerHome ? captainId ?? undefined : undefined,
      awayCaptainId: isPlayerAway ? captainId ?? undefined : undefined,
      seasonSeed,
      userClubId: playerClubId,
      userBackground: managerBackground,
      activeModifiers,
    });
    results.push(result);
  }

  return { results };
}

function applyResultsToTable(table: LeagueTableRow[], results: MatchResult[]): LeagueTableRow[] {
  let next = table.map((r) => ({ ...r }));
  for (const result of results) {
    next = next.map((row) => {
      if (row.clubId === result.homeClubId) {
        const won = result.homeGoals > result.awayGoals;
        const drawn = result.homeGoals === result.awayGoals;
        return {
          ...row,
          played: row.played + 1,
          won: row.won + (won ? 1 : 0),
          drawn: row.drawn + (drawn ? 1 : 0),
          lost: row.lost + (!won && !drawn ? 1 : 0),
          goalsFor: row.goalsFor + result.homeGoals,
          goalsAgainst: row.goalsAgainst + result.awayGoals,
          goalDifference: row.goalDifference + result.homeGoals - result.awayGoals,
          points: row.points + (won ? 3 : drawn ? 1 : 0),
        };
      }
      if (row.clubId === result.awayClubId) {
        const won = result.awayGoals > result.homeGoals;
        const drawn = result.homeGoals === result.awayGoals;
        return {
          ...row,
          played: row.played + 1,
          won: row.won + (won ? 1 : 0),
          drawn: row.drawn + (drawn ? 1 : 0),
          lost: row.lost + (!won && !drawn ? 1 : 0),
          goalsFor: row.goalsFor + result.awayGoals,
          goalsAgainst: row.goalsAgainst + result.homeGoals,
          goalDifference: row.goalDifference + result.awayGoals - result.homeGoals,
          points: row.points + (won ? 3 : drawn ? 1 : 0),
        };
      }
      return row;
    });
  }
  return next;
}

function sortTableRows(table: LeagueTableRow[]): LeagueTableRow[] {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

function pickContenderRows(sorted: LeagueTableRow[], stakes: FinalDayStakes): LeagueTableRow[] {
  if (stakes.kind === 'relegation') {
    // Bottom 5 — the dropzone plus the row above for context.
    return sorted.slice(15, 20);
  }
  // Title / topfour — top 5.
  return sorted.slice(0, 5);
}

/**
 * Would this club be guaranteed champion if they lost their remaining
 * fixture? Used to decide if the title was "clinched on the final day".
 *
 * Simple lower-bound: if their current points alone exceed every other
 * club's max possible (current + 3), they're already champions.
 */
function wouldGuaranteeChampion(sorted: LeagueTableRow[], clubId: string): boolean {
  const us = sorted.find((r) => r.clubId === clubId);
  if (!us) return false;
  for (const r of sorted) {
    if (r.clubId === clubId) continue;
    if (r.points + 3 >= us.points) return false;
  }
  return true;
}

function ordinalSuffix(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
