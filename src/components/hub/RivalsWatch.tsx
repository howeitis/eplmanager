import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CLUBS } from '@/data/clubs';
import { getClubLogoUrl } from '@/data/assets';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

/**
 * Surfaces the player's rivals' positions vs theirs. Uses existing rivalry
 * data from the club entries and the current league table — no new state.
 *
 * Hidden when no league rounds have been played yet, or the player's club
 * has no listed rivalries (e.g. promoted club without local derbies on
 * record).
 */
export function RivalsWatch() {
  const manager = useGameStore((s) => s.manager);
  const leagueTable = useGameStore((s) => s.leagueTable);

  const playerClubId = manager?.clubId;
  const playerClub = playerClubId ? clubDataMap.get(playerClubId) : undefined;

  const sortedTable = useMemo(() => {
    return [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }, [leagueTable]);

  const playerPos = playerClubId
    ? sortedTable.findIndex((r) => r.clubId === playerClubId) + 1
    : 0;
  const playerRow = playerClubId ? sortedTable.find((r) => r.clubId === playerClubId) : undefined;

  const rivals = useMemo(() => {
    if (!playerClub || playerClub.rivalries.length === 0) return [];
    return playerClub.rivalries
      .map((rid) => {
        const idx = sortedTable.findIndex((r) => r.clubId === rid);
        if (idx === -1) return null;
        return {
          clubId: rid,
          row: sortedTable[idx],
          position: idx + 1,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [playerClub, sortedTable]);

  if (!playerRow || playerPos === 0 || rivals.length === 0) return null;

  return (
    <div>
      <header className="plm-mb-4 plm-pb-3 plm-border-b plm-border-warm-200">
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
          Derby Watch
        </p>
        <h3 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
          Rivals
        </h3>
      </header>
      <ul className="plm-space-y-2">
        {rivals.map(({ clubId, row, position }) => {
          const club = clubDataMap.get(clubId);
          const ptsGap = row.points - playerRow.points;
          const ahead = position < playerPos;
          const tone = ahead
            ? 'plm-text-rose-600'
            : ptsGap === 0 && position === playerPos
            ? 'plm-text-warm-600'
            : 'plm-text-emerald-600';
          const arrow = ahead ? '▲' : '▼';
          const gapLabel = ptsGap === 0
            ? 'level'
            : `${ptsGap > 0 ? '+' : ''}${ptsGap} pt${Math.abs(ptsGap) === 1 ? '' : 's'}`;
          return (
            <li key={clubId} className="plm-flex plm-items-center plm-gap-2 plm-text-sm">
              <span className="plm-text-warm-400 plm-tabular-nums plm-w-6 plm-text-right">{position}.</span>
              {getClubLogoUrl(clubId) ? (
                <img
                  src={getClubLogoUrl(clubId)}
                  alt=""
                  className="plm-w-5 plm-h-5 plm-rounded-full plm-object-contain plm-bg-white plm-p-0.5 plm-flex-shrink-0"
                  style={{ border: `1px solid ${club?.colors.secondary || '#ddd'}` }}
                  aria-hidden="true"
                />
              ) : (
                <div
                  className="plm-w-5 plm-h-5 plm-rounded-full plm-flex-shrink-0"
                  style={{ backgroundColor: club?.colors.primary }}
                />
              )}
              <span className="plm-flex-1 plm-min-w-0 plm-truncate plm-text-charcoal">
                {club?.shortName || club?.name}
              </span>
              <span className={`plm-text-xs plm-font-semibold plm-tabular-nums ${tone}`}>
                {arrow} {gapLabel}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="plm-mt-3 plm-text-[11px] plm-text-warm-500 plm-italic">
        Bragging rights {rivals.some((r) => r.position < playerPos) ? 'on the line' : 'are yours — for now'}.
      </p>
    </div>
  );
}
