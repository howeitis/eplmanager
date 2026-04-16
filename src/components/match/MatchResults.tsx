import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { LeagueTable } from '../shared/LeagueTable';
import { ClubLink } from '../shared/ClubLink';
import type { MatchResult, Fixture, SeasonEvent } from '../../types/entities';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

interface MatchResultsProps {
  monthLabel: string;
  fixtures: Fixture[];
  events: SeasonEvent[];
  onContinue: () => void;
}

export function MatchResults({ monthLabel, fixtures, events, onContinue }: MatchResultsProps) {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const playerClubId = manager?.clubId;
  const playerClubData = clubDataMap.get(playerClubId || '');

  const [showAllResults, setShowAllResults] = useState(false);

  // Sort fixtures by gameweek
  const sortedFixtures = useMemo(
    () => [...fixtures].filter((f) => f.played && f.result).sort((a, b) => a.gameweek - b.gameweek),
    [fixtures],
  );

  // Split user's fixtures from others
  const userFixtures = useMemo(
    () => sortedFixtures.filter((f) => f.homeClubId === playerClubId || f.awayClubId === playerClubId),
    [sortedFixtures, playerClubId],
  );

  // Compute user's monthly stats
  const monthStats = useMemo(() => {
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    for (const f of userFixtures) {
      const r = f.result!;
      const isHome = f.homeClubId === playerClubId;
      const myGoals = isHome ? r.homeGoals : r.awayGoals;
      const theirGoals = isHome ? r.awayGoals : r.homeGoals;
      goalsFor += myGoals;
      goalsAgainst += theirGoals;
      if (myGoals > theirGoals) wins++;
      else if (myGoals === theirGoals) draws++;
      else losses++;
    }
    const points = wins * 3 + draws;
    return { wins, draws, losses, goalsFor, goalsAgainst, points };
  }, [userFixtures, playerClubId]);

  // Interleave events
  const allGameweeks = useMemo(() => {
    const gwMap = new Map<number, Fixture[]>();
    for (const f of sortedFixtures) {
      const arr = gwMap.get(f.gameweek) || [];
      arr.push(f);
      gwMap.set(f.gameweek, arr);
    }
    return Array.from(gwMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [sortedFixtures]);

  const userGameweeks = useMemo(() => {
    const gwMap = new Map<number, Fixture[]>();
    for (const f of userFixtures) {
      const arr = gwMap.get(f.gameweek) || [];
      arr.push(f);
      gwMap.set(f.gameweek, arr);
    }
    return Array.from(gwMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [userFixtures]);

  const accentColor = playerClubData?.colors.primary || '#1A1A1A';
  const accentLight = accentColor + '20';

  return (
    <div className="plm-space-y-4 plm-w-full">

      {/* ─── Key stats header ─── */}
      <div
        className="plm-rounded-lg plm-p-4 plm-border"
        style={{ backgroundColor: accentLight, borderColor: accentColor + '40' }}
      >
        <div className="plm-flex plm-items-center plm-gap-3 plm-mb-3">
          {playerClubData && (
            <div
              className="plm-w-8 plm-h-8 plm-rounded-full plm-flex-shrink-0 plm-border-2"
              style={{ backgroundColor: accentColor, borderColor: playerClubData.colors.secondary }}
            />
          )}
          <div>
            <h2 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-leading-none">
              {monthLabel}
            </h2>
            <p className="plm-text-xs plm-text-warm-500 plm-mt-0.5">
              {userFixtures.length} match{userFixtures.length !== 1 ? 'es' : ''} played
            </p>
          </div>
        </div>

        {/* Point stats row */}
        {userFixtures.length > 0 ? (
          <div className="plm-grid plm-grid-cols-4 plm-gap-2">
            <KeyStatBox label="Points" value={`+${monthStats.points}`} accent accentColor={accentColor} />
            <KeyStatBox label="W-D-L" value={`${monthStats.wins}-${monthStats.draws}-${monthStats.losses}`} />
            <KeyStatBox label="Scored" value={monthStats.goalsFor} />
            <KeyStatBox label="Conceded" value={monthStats.goalsAgainst} />
          </div>
        ) : (
          <p className="plm-text-sm plm-text-warm-500 plm-italic">No matches this period.</p>
        )}
      </div>

      {/* ─── Events banner ─── */}
      {events.length > 0 && (
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <div className="plm-space-y-1.5">
            {events.map((event) => (
              <EventBanner key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Your club's results ─── */}
      {userFixtures.length > 0 && (
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
            {playerClubData?.name || 'Your'} Results
          </h3>
          <div className="plm-space-y-2">
            {userGameweeks.map(([gw, gwFixtures]) => (
              <div key={gw}>
                <div className="plm-text-[10px] plm-font-semibold plm-text-warm-400 plm-uppercase plm-tracking-wider plm-mb-1.5">
                  Matchday {gw}
                </div>
                <div className="plm-space-y-1.5">
                  {gwFixtures.map((fixture) => (
                    <MatchScoreCard
                      key={fixture.id}
                      fixture={fixture}
                      result={fixture.result!}
                      playerClubId={playerClubId}
                      clubs={clubs}
                      playerClubData={playerClubData}
                      isUserSection
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── All results (collapsible) ─── */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-overflow-hidden">
        <button
          onClick={() => setShowAllResults((v) => !v)}
          className="plm-w-full plm-flex plm-items-center plm-justify-between plm-p-4 plm-text-left plm-min-h-[44px] hover:plm-bg-warm-50 plm-transition-colors"
        >
          <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal">
            All Results ({sortedFixtures.length} matches)
          </h3>
          <span className="plm-text-warm-400 plm-text-sm plm-font-bold">
            {showAllResults ? '▲' : '▼'}
          </span>
        </button>

        {showAllResults && (
          <div className="plm-px-4 plm-pb-4 plm-space-y-4 plm-border-t plm-border-warm-100">
            <div className="plm-pt-3 plm-space-y-4">
              {allGameweeks.map(([gw, gwFixtures]) => (
                <div key={gw}>
                  <div className="plm-text-[10px] plm-font-semibold plm-text-warm-400 plm-uppercase plm-tracking-wider plm-mb-1.5">
                    Matchday {gw}
                  </div>
                  <div className="plm-space-y-1.5">
                    {gwFixtures.map((fixture) => (
                      <MatchScoreCard
                        key={fixture.id}
                        fixture={fixture}
                        result={fixture.result!}
                        playerClubId={playerClubId}
                        clubs={clubs}
                        playerClubData={playerClubData}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Standings ─── */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
          Standings
        </h3>
        <LeagueTable />
      </div>

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="plm-w-full plm-py-3.5 plm-rounded-lg plm-font-body plm-font-semibold plm-text-sm plm-bg-charcoal plm-text-white hover:plm-bg-charcoal-light plm-transition-colors plm-min-h-[44px]"
      >
        Continue
      </button>
    </div>
  );
}

// ─── Key stat box ───

function KeyStatBox({
  label,
  value,
  accent,
  accentColor,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  accentColor?: string;
}) {
  return (
    <div className="plm-bg-white/60 plm-rounded plm-p-2 plm-text-center">
      <div className="plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-wider plm-font-medium">{label}</div>
      <div
        className="plm-text-base plm-font-bold plm-tabular-nums"
        style={{ color: accent && accentColor ? accentColor : '#1A1A1A' }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Match score card ───

function MatchScoreCard({
  result,
  playerClubId,
  clubs,
  playerClubData,
  isUserSection = false,
}: {
  fixture: Fixture;
  result: MatchResult;
  playerClubId: string | undefined;
  clubs: { id: string; roster: { id: string; name: string }[] }[];
  playerClubData?: ReturnType<typeof clubDataMap.get>;
  isUserSection?: boolean;
}) {
  const homeClub = clubDataMap.get(result.homeClubId);
  const awayClub = clubDataMap.get(result.awayClubId);
  const isPlayerMatch = result.homeClubId === playerClubId || result.awayClubId === playerClubId;

  const findPlayerName = (playerId: string, clubId: string): string => {
    const club = clubs.find((c) => c.id === clubId);
    const player = club?.roster.find((p) => p.id === playerId);
    return player?.name || 'Unknown';
  };

  const homeScorers = result.scorers
    .filter((s) => s.isHome)
    .map((s) => findPlayerName(s.playerId, result.homeClubId));
  const awayScorers = result.scorers
    .filter((s) => !s.isHome)
    .map((s) => findPlayerName(s.playerId, result.awayClubId));

  // User match highlight style
  const userAccent = playerClubData?.colors.primary;
  const userAccentBg = userAccent ? userAccent + '15' : undefined;
  const userAccentBorder = userAccent ? userAccent + '60' : undefined;

  return (
    <div
      role="article"
      aria-label={`${homeClub?.shortName} ${result.homeGoals} - ${result.awayGoals} ${awayClub?.shortName}`}
      className={`plm-rounded plm-border plm-transition-all ${
        isPlayerMatch && !isUserSection
          ? ''
          : isPlayerMatch
          ? 'plm-shadow-sm'
          : 'plm-border-warm-100 plm-bg-white'
      } ${result.isDerby ? 'plm-ring-1 plm-ring-amber-200' : ''}`}
      style={
        isPlayerMatch
          ? { backgroundColor: userAccentBg || '#FAF8F5', borderColor: userAccentBorder || '#E0DCD5' }
          : undefined
      }
    >
      {/* User match header tag */}
      {isPlayerMatch && !isUserSection && (
        <div
          className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-text-center plm-py-0.5 plm-rounded-t plm-border-b"
          style={{
            backgroundColor: userAccent ? userAccent + '25' : '#F0EDE8',
            color: userAccent || '#6B6760',
            borderColor: userAccent ? userAccent + '40' : '#E0DCD5',
          }}
        >
          {playerClubData?.shortName || 'Your Club'}
        </div>
      )}

      {result.isDerby && (
        <div className="plm-text-[9px] plm-font-bold plm-text-amber-600 plm-uppercase plm-tracking-wider plm-text-center plm-py-0.5 plm-bg-amber-50 plm-rounded-t plm-border-b plm-border-amber-100">
          Derby
        </div>
      )}

      <div className="plm-flex plm-items-center plm-py-2.5 plm-px-3">
        {/* Home team */}
        <div className="plm-flex-1 plm-flex plm-items-center plm-gap-1.5 plm-justify-end plm-min-w-0">
          <ClubLink
            clubId={result.homeClubId}
            short
            showDot={false}
            className={`plm-text-sm plm-truncate plm-text-right plm-justify-end ${result.homeClubId === playerClubId ? 'plm-font-bold' : ''}`}
          />
          <div
            className="plm-w-3 plm-h-3 plm-rounded-full plm-flex-shrink-0"
            style={{ backgroundColor: homeClub?.colors.primary }}
          />
        </div>

        {/* Score */}
        <div className="plm-flex plm-items-center plm-gap-1.5 plm-mx-3">
          <span className={`plm-text-lg plm-font-bold plm-tabular-nums plm-w-5 plm-text-right ${
            result.homeGoals > result.awayGoals ? 'plm-text-charcoal' : 'plm-text-warm-400'
          }`}>
            {result.homeGoals}
          </span>
          <span className="plm-text-warm-300">-</span>
          <span className={`plm-text-lg plm-font-bold plm-tabular-nums plm-w-5 plm-text-left ${
            result.awayGoals > result.homeGoals ? 'plm-text-charcoal' : 'plm-text-warm-400'
          }`}>
            {result.awayGoals}
          </span>
        </div>

        {/* Away team */}
        <div className="plm-flex-1 plm-flex plm-items-center plm-gap-1.5 plm-min-w-0">
          <div
            className="plm-w-3 plm-h-3 plm-rounded-full plm-flex-shrink-0"
            style={{ backgroundColor: awayClub?.colors.primary }}
          />
          <ClubLink
            clubId={result.awayClubId}
            short
            showDot={false}
            className={`plm-text-sm plm-truncate ${result.awayClubId === playerClubId ? 'plm-font-bold' : ''}`}
          />
        </div>
      </div>

      {/* Scorers for player's match */}
      {isPlayerMatch && (homeScorers.length > 0 || awayScorers.length > 0) && (
        <div className="plm-px-3 plm-pb-2 plm-flex plm-gap-4 plm-text-[10px] plm-text-warm-500">
          {homeScorers.length > 0 && (
            <div className="plm-flex-1 plm-text-right plm-truncate">
              {dedupeScorers(homeScorers)}
            </div>
          )}
          {homeScorers.length === 0 && <div className="plm-flex-1" />}
          <div className="plm-w-[42px]" />
          {awayScorers.length > 0 && (
            <div className="plm-flex-1 plm-truncate">
              {dedupeScorers(awayScorers)}
            </div>
          )}
          {awayScorers.length === 0 && <div className="plm-flex-1" />}
        </div>
      )}
    </div>
  );
}

function dedupeScorers(names: string[]): string {
  const counts = new Map<string, number>();
  for (const name of names) {
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => {
      const lastName = name.split(' ').pop() || name;
      return count > 1 ? `${lastName} x${count}` : lastName;
    })
    .join(', ');
}

function EventBanner({ event }: { event: SeasonEvent }) {
  const typeStyles: Record<string, string> = {
    narrative: 'plm-bg-blue-50 plm-border-blue-200 plm-text-blue-800',
    modifier: 'plm-bg-purple-50 plm-border-purple-200 plm-text-purple-800',
    injury: 'plm-bg-red-50 plm-border-red-200 plm-text-red-800',
    transfer: 'plm-bg-amber-50 plm-border-amber-200 plm-text-amber-800',
  };

  return (
    <div className={`plm-rounded plm-border plm-px-3 plm-py-2 plm-text-xs ${
      typeStyles[event.type] || typeStyles.narrative
    }`}>
      <span className="plm-font-semibold plm-uppercase plm-tracking-wider plm-text-[9px] plm-mr-1.5">
        {event.category.replace('_', ' ')}
      </span>
      {event.description}
    </div>
  );
}
