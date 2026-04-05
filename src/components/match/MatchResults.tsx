import { useMemo } from 'react';
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

  // Sort fixtures by gameweek
  const sortedFixtures = useMemo(
    () => [...fixtures].filter((f) => f.played && f.result).sort((a, b) => a.gameweek - b.gameweek),
    [fixtures],
  );

  // Interleave events between result groups by gameweek
  const gameweeks = useMemo(() => {
    const gwMap = new Map<number, Fixture[]>();
    for (const f of sortedFixtures) {
      const arr = gwMap.get(f.gameweek) || [];
      arr.push(f);
      gwMap.set(f.gameweek, arr);
    }
    return Array.from(gwMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [sortedFixtures]);

  return (
    <div className="plm-space-y-4 plm-w-full">
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <h2 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-mb-1">
          {monthLabel} Results
        </h2>
        <p className="plm-text-xs plm-text-warm-500 plm-mb-4">
          {sortedFixtures.length} matches played
        </p>

        {/* Events banner */}
        {events.length > 0 && (
          <div className="plm-space-y-1.5 plm-mb-4">
            {events.map((event) => (
              <EventBanner key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Match results by gameweek */}
        <div className="plm-space-y-4">
          {gameweeks.map(([gw, gwFixtures]) => (
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
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* League table */}
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

function MatchScoreCard({
  result,
  playerClubId,
  clubs,
}: {
  fixture: Fixture;
  result: MatchResult;
  playerClubId: string | undefined;
  clubs: { id: string; roster: { id: string; name: string }[] }[];
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

  return (
    <div
      role="article"
      aria-label={`${homeClub?.shortName} ${result.homeGoals} - ${result.awayGoals} ${awayClub?.shortName}`}
      className={`plm-rounded plm-border plm-transition-all ${
        isPlayerMatch
          ? 'plm-border-warm-300 plm-bg-warm-50 plm-shadow-sm'
          : 'plm-border-warm-100 plm-bg-white'
      } ${result.isDerby ? 'plm-ring-1 plm-ring-amber-200' : ''}`}
    >
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
