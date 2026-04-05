import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import type { SeasonHistory as SeasonHistoryType } from '../../types/entities';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

export function SeasonHistoryScreen() {
  const seasonHistories = useGameStore((s) => s.seasonHistories);
  const manager = useGameStore((s) => s.manager);
  const playerClubId = manager?.clubId;

  // All-time records
  const records = useMemo(() => {
    let mostGoals = { name: '', goals: 0, season: 0 };
    let highestPoints = { club: '', points: 0, season: 0 };
    let longestStreak = 0;

    for (const history of seasonHistories) {
      // Top scorer per season
      for (const ps of history.playerStats) {
        if (ps.goals > mostGoals.goals) {
          mostGoals = { name: ps.playerName, goals: ps.goals, season: history.seasonNumber };
        }
      }
      // Champion points
      if (history.finalTable.length > 0) {
        const sorted = [...history.finalTable].sort((a, b) => b.points - a.points);
        if (sorted[0].points > highestPoints.points) {
          const club = clubDataMap.get(sorted[0].clubId);
          highestPoints = {
            club: club?.name || sorted[0].clubId,
            points: sorted[0].points,
            season: history.seasonNumber,
          };
        }
      }
    }

    return { mostGoals, highestPoints, longestStreak };
  }, [seasonHistories]);

  // Trophy cabinet
  const trophies = useMemo(() => {
    const result: { season: number; award: string }[] = [];
    for (const history of seasonHistories) {
      if (history.finalTable.length === 0) continue;
      const sorted = [...history.finalTable].sort((a, b) => b.points - a.points);
      if (sorted[0]?.clubId === playerClubId) {
        result.push({ season: history.seasonNumber, award: 'League Champion' });
      }
    }
    return result;
  }, [seasonHistories, playerClubId]);

  if (seasonHistories.length === 0) {
    return (
      <div className="plm-w-full">
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-8 plm-text-center">
          <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-mb-2">
            Season History
          </h2>
          <p className="plm-text-sm plm-text-warm-500">
            No completed seasons yet. History will appear after your first full season.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="plm-space-y-4 plm-w-full">
      {/* Trophy Cabinet */}
      {trophies.length > 0 && (
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
            Trophy Cabinet
          </h3>
          <div className="plm-flex plm-flex-wrap plm-gap-2">
            {trophies.map((t, i) => (
              <div key={i} className="plm-bg-amber-50 plm-border plm-border-amber-200 plm-rounded plm-px-3 plm-py-2 plm-text-center">
                <div className="plm-text-lg">&#9733;</div>
                <div className="plm-text-[10px] plm-font-bold plm-text-amber-700 plm-uppercase">
                  {t.award}
                </div>
                <div className="plm-text-[10px] plm-text-amber-600">Season {t.season}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All-time Records */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
          All-Time Records
        </h3>
        <div className="plm-grid plm-grid-cols-1 sm:plm-grid-cols-2 plm-gap-2">
          {records.mostGoals.goals > 0 && (
            <RecordCard
              label="Most Goals in a Season"
              value={`${records.mostGoals.name} (${records.mostGoals.goals})`}
              sub={`Season ${records.mostGoals.season}`}
            />
          )}
          {records.highestPoints.points > 0 && (
            <RecordCard
              label="Highest Points Total"
              value={`${records.highestPoints.club} (${records.highestPoints.points})`}
              sub={`Season ${records.highestPoints.season}`}
            />
          )}
        </div>
      </div>

      {/* Season-by-Season Log */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
          Season Log
        </h3>

        {/* Desktop table */}
        <div className="plm-hidden md:plm-block plm-overflow-x-auto">
          <table role="table" className="plm-w-full plm-text-sm">
            <caption className="plm-sr-only">Season-by-season results history</caption>
            <thead>
              <tr className="plm-border-b plm-border-warm-200">
                <th scope="col" className="plm-text-left plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">Season</th>
                <th scope="col" className="plm-text-left plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">Champion</th>
                <th scope="col" className="plm-text-left plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">Golden Boot</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">Your Pos</th>
                <th scope="col" className="plm-text-center plm-py-2 plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">Pts</th>
              </tr>
            </thead>
            <tbody>
              {seasonHistories.map((h) => (
                <HistoryRow key={h.seasonNumber} history={h} playerClubId={playerClubId} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:plm-hidden plm-space-y-2">
          {seasonHistories.map((h) => (
            <HistoryCard key={h.seasonNumber} history={h} playerClubId={playerClubId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({
  history,
  playerClubId,
}: {
  history: SeasonHistoryType;
  playerClubId: string | undefined;
}) {
  const sorted = [...history.finalTable].sort((a, b) => b.points - a.points);
  const champion = sorted[0];
  const championClub = clubDataMap.get(champion?.clubId || '');
  const playerRow = sorted.find((r) => r.clubId === playerClubId);
  const playerPos = sorted.findIndex((r) => r.clubId === playerClubId) + 1;

  // Top scorer
  let topScorer = { name: '', goals: 0 };
  for (const ps of history.playerStats) {
    if (ps.goals > topScorer.goals) {
      topScorer = { name: ps.playerName, goals: ps.goals };
    }
  }

  const startYear = 2025 + (history.seasonNumber - 1);

  return (
    <tr className="plm-border-b plm-border-warm-100 hover:plm-bg-warm-50">
      <td className="plm-py-2 plm-text-warm-600">{startYear}/{(startYear + 1).toString().slice(-2)}</td>
      <td className="plm-py-2">
        <div className="plm-flex plm-items-center plm-gap-1.5">
          <div className="plm-w-2.5 plm-h-2.5 plm-rounded-full" style={{ backgroundColor: championClub?.colors.primary }} />
          <span className="plm-font-medium">{championClub?.name}</span>
          <span className="plm-text-warm-400 plm-text-xs">({champion?.points} pts)</span>
        </div>
      </td>
      <td className="plm-py-2 plm-text-warm-600">
        {topScorer.name ? `${topScorer.name} (${topScorer.goals})` : '-'}
      </td>
      <td className="plm-py-2 plm-text-center plm-font-bold plm-tabular-nums">{playerPos || '-'}</td>
      <td className="plm-py-2 plm-text-center plm-tabular-nums">{playerRow?.points || '-'}</td>
    </tr>
  );
}

function HistoryCard({
  history,
  playerClubId,
}: {
  history: SeasonHistoryType;
  playerClubId: string | undefined;
}) {
  const sorted = [...history.finalTable].sort((a, b) => b.points - a.points);
  const champion = sorted[0];
  const championClub = clubDataMap.get(champion?.clubId || '');
  const playerPos = sorted.findIndex((r) => r.clubId === playerClubId) + 1;
  const playerRow = sorted.find((r) => r.clubId === playerClubId);
  const startYear = 2025 + (history.seasonNumber - 1);

  return (
    <div className="plm-rounded plm-border plm-border-warm-100 plm-p-3">
      <div className="plm-flex plm-items-center plm-justify-between plm-mb-1.5">
        <span className="plm-text-sm plm-font-bold">{startYear}/{(startYear + 1).toString().slice(-2)}</span>
        <span className="plm-text-xs plm-font-bold plm-tabular-nums">
          You: {playerPos ? `${playerPos}${getOrdinal(playerPos)} — ${playerRow?.points} pts` : '-'}
        </span>
      </div>
      <div className="plm-flex plm-items-center plm-gap-1.5 plm-text-xs plm-text-warm-600">
        <div className="plm-w-2.5 plm-h-2.5 plm-rounded-full" style={{ backgroundColor: championClub?.colors.primary }} />
        <span>Champion: {championClub?.name} ({champion?.points} pts)</span>
      </div>
    </div>
  );
}

function RecordCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="plm-bg-warm-50 plm-rounded plm-p-3">
      <div className="plm-text-[10px] plm-font-semibold plm-text-warm-400 plm-uppercase plm-tracking-wider plm-mb-1">
        {label}
      </div>
      <div className="plm-text-sm plm-font-bold plm-text-charcoal">{value}</div>
      <div className="plm-text-[10px] plm-text-warm-500">{sub}</div>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
