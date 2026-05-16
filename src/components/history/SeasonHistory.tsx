import { useMemo, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { CLUBS } from '@/data/clubs';
import { getTrophyImageUrl } from '@/data/assets';
import type { SeasonHistory as SeasonHistoryType } from '@/types/entities';
import { TutorialModal, type TutorialTab } from '@/components/shared/TutorialModal';
import { useFirstVisitTutorial } from '@/hooks/useFirstVisitTutorial';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

export function SeasonHistoryScreen() {
  const seasonHistories = useGameStore((s) => s.seasonHistories);
  const manager = useGameStore((s) => s.manager);
  const playerClubId = manager?.clubId;
  const playerClub = clubDataMap.get(playerClubId || '');
  const saveSlot = useGameStore((s) => s.saveSlot);
  const firstVisit = useFirstVisitTutorial('history', saveSlot);
  const [reviewTab, setReviewTab] = useState<TutorialTab | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // All-time records
  const records = useMemo(() => {
    let mostGoals = { name: '', goals: 0, season: 0 };
    let highestPoints = { club: '', points: 0, season: 0 };
    const longestStreak = 0;

    for (const history of seasonHistories) {
      for (const ps of history.playerStats) {
        if (ps.goals > mostGoals.goals) {
          mostGoals = { name: ps.playerName, goals: ps.goals, season: history.seasonNumber };
        }
      }
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

  // Trophy cabinet — league titles from final table + FA Cup wins from accomplishments
  const trophies = useMemo(() => {
    const result: { season: number; award: string; type: 'league' | 'fa-cup' }[] = [];
    for (const history of seasonHistories) {
      if (history.finalTable.length === 0) continue;
      const sorted = [...history.finalTable].sort((a, b) => b.points - a.points);
      if (sorted[0]?.clubId === playerClubId) {
        result.push({ season: history.seasonNumber, award: 'League Champion', type: 'league' });
      }
    }
    if (manager?.accomplishments) {
      for (const acc of manager.accomplishments) {
        if (acc.type === 'fa-cup' && acc.clubId === playerClubId) {
          result.push({ season: acc.season, award: 'FA Cup Winner', type: 'fa-cup' });
        }
      }
    }
    result.sort((a, b) => a.season - b.season || (a.type === 'league' ? -1 : 1));
    return result;
  }, [seasonHistories, playerClubId, manager?.accomplishments]);

  const tutorialButton = (
    <button
      onClick={() => setPickerOpen(true)}
      className="plm-inline-flex plm-items-center plm-gap-1.5 plm-text-[10px] plm-uppercase plm-tracking-[0.18em] plm-font-semibold plm-text-warm-500 hover:plm-text-charcoal plm-min-h-[36px]"
    >
      <span aria-hidden="true">?</span>
      <span>How it works</span>
    </button>
  );

  const tutorialModal = (
    <>
      {firstVisit.show && <TutorialModal tab="history" onClose={firstVisit.onClose} />}
      {reviewTab && <TutorialModal tab={reviewTab} onClose={() => setReviewTab(null)} />}
      {pickerOpen && (
        <TutorialPicker
          onPick={(t) => {
            setPickerOpen(false);
            setReviewTab(t);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );

  if (seasonHistories.length === 0) {
    return (
      <div className="plm-relative plm-w-full plm-space-y-4">
        {playerClub && (
          <div
            aria-hidden
            className="plm-pointer-events-none plm-absolute plm--left-4 plm--right-4 md:plm--left-6 md:plm--right-6 plm--top-16 plm-h-[320px]"
            style={{
              background: `linear-gradient(to bottom, ${playerClub.colors.primary}38 0%, ${playerClub.colors.primary}1F 28%, ${playerClub.colors.primary}0A 55%, transparent 100%)`,
              zIndex: 0,
            }}
          />
        )}
        <section className="plm-relative plm-pt-1" style={{ zIndex: 1 }}>
          <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
            Archive
          </p>
          <h1 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-1">
            Season History
          </h1>
          <p className="plm-font-display plm-italic plm-text-sm plm-text-warm-600 plm-mt-1">
            No completed seasons yet. The archive opens after your first full campaign.
          </p>
          <div className="plm-mt-4">{tutorialButton}</div>
        </section>
        {tutorialModal}
      </div>
    );
  }

  const accent = playerClub?.colors.primary || '#1A1A1A';
  // Strongest single-club performance for the masthead callout
  const headlineSeasons = seasonHistories.length;
  const yourTitles = trophies.filter((t) => t.type === 'league').length;
  const yourCups = trophies.filter((t) => t.type === 'fa-cup').length;

  return (
    <div className="plm-relative plm-w-full plm-space-y-6">
      {/* Club-color ambient glow — mirrors the hub masthead */}
      {playerClub && (
        <>
          <div
            aria-hidden
            className="plm-pointer-events-none plm-absolute plm--left-4 plm--right-4 md:plm--left-6 md:plm--right-6 plm--top-16 plm-h-[320px]"
            style={{
              background: `linear-gradient(to bottom, ${playerClub.colors.primary}38 0%, ${playerClub.colors.primary}1F 28%, ${playerClub.colors.primary}0A 55%, transparent 100%)`,
              zIndex: 0,
            }}
          />
          <div
            aria-hidden
            className="plm-pointer-events-none plm-absolute plm--left-4 plm--right-4 md:plm--left-6 md:plm--right-6 plm--bottom-20 md:plm-bottom-0 plm-h-[336px] md:plm-h-[256px]"
            style={{
              background: `linear-gradient(to top, ${playerClub.colors.primary}38 0%, ${playerClub.colors.primary}1F 28%, ${playerClub.colors.primary}0A 55%, transparent 100%)`,
              zIndex: 0,
            }}
          />
        </>
      )}

      {tutorialModal}

      {/* Editorial masthead */}
      <section className="plm-relative plm-pt-1" style={{ zIndex: 1 }}>
        <div className="plm-flex plm-items-start plm-justify-between plm-gap-3">
          <div className="plm-min-w-0">
            <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
              Archive
            </p>
            <h1 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-1">
              Season History
            </h1>
            <p className="plm-font-display plm-italic plm-text-sm plm-text-warm-600 plm-mt-1">
              {manager?.name ? `${manager.name}'s reign in numbers` : 'Your reign in numbers'}
            </p>
          </div>
          <div className="plm-flex-shrink-0 plm-pt-1">{tutorialButton}</div>
        </div>

        <div className="plm-mt-5 plm-pt-5 plm-border-t plm-border-warm-200 plm-grid plm-grid-cols-3 plm-divide-x plm-divide-warm-200">
          <MastheadStat label="Seasons" value={headlineSeasons} />
          <MastheadStat label="Titles" value={yourTitles} accent={yourTitles > 0 ? accent : undefined} />
          <MastheadStat label="FA Cups" value={yourCups} accent={yourCups > 0 ? accent : undefined} />
        </div>
      </section>

      {/* Trophy Cabinet — unboxed editorial row */}
      {trophies.length > 0 && (
        <section className="plm-relative plm-pt-5 plm-border-t plm-border-warm-200" style={{ zIndex: 1 }}>
          <div className="plm-flex plm-items-baseline plm-justify-between plm-mb-3">
            <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal">
              Trophy Cabinet
            </h2>
            <span className="plm-text-[10px] plm-uppercase plm-tracking-[0.18em] plm-text-warm-500 plm-font-semibold plm-tabular-nums">
              {trophies.length} {trophies.length === 1 ? 'honour' : 'honours'}
            </span>
          </div>
          <div className="plm-flex plm-flex-wrap plm-gap-4">
            {trophies.map((t, i) => {
              const startYear = 2025 + (t.season - 1);
              const yearLabel = `${startYear.toString().slice(-2)}/${(startYear + 1).toString().slice(-2)}`;
              const trophyImg = getTrophyImageUrl(t.type);
              return (
                <div key={i} className="plm-w-24 plm-flex plm-flex-col plm-items-center plm-text-center">
                  <div className="plm-w-24 plm-h-24 plm-flex plm-items-center plm-justify-center">
                    <img
                      src={trophyImg}
                      alt={t.award}
                      className="plm-max-w-full plm-max-h-full plm-object-contain"
                    />
                  </div>
                  <div className="plm-text-[10px] plm-font-semibold plm-text-charcoal plm-uppercase plm-tracking-[0.12em] plm-mt-1.5">
                    {t.award}
                  </div>
                  <div className="plm-font-display plm-italic plm-text-[11px] plm-text-warm-500 plm-mt-0.5 plm-tabular-nums">
                    Season {t.season} &middot; {yearLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* All-time Records — magazine pull-quote feel */}
      {(records.mostGoals.goals > 0 || records.highestPoints.points > 0) && (
        <section className="plm-relative plm-pt-5 plm-border-t plm-border-warm-200" style={{ zIndex: 1 }}>
          <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-mb-3">
            All-Time Records
          </h2>
          <div className="plm-grid plm-grid-cols-1 sm:plm-grid-cols-2 plm-gap-x-8 plm-gap-y-4">
            {records.mostGoals.goals > 0 && (
              <RecordLine
                label="Most Goals in a Season"
                value={`${records.mostGoals.name}`}
                tail={`${records.mostGoals.goals} goals`}
                sub={`Season ${records.mostGoals.season}`}
                accent={accent}
              />
            )}
            {records.highestPoints.points > 0 && (
              <RecordLine
                label="Highest Points Total"
                value={records.highestPoints.club}
                tail={`${records.highestPoints.points} pts`}
                sub={`Season ${records.highestPoints.season}`}
                accent={accent}
              />
            )}
          </div>
        </section>
      )}

      {/* Season-by-Season Log */}
      <section className="plm-relative plm-pt-5 plm-border-t plm-border-warm-200" style={{ zIndex: 1 }}>
        <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-mb-3">
          Season Log
        </h2>

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

        {/* Mobile rows — flat list with hairline dividers */}
        <ul className="md:plm-hidden plm-divide-y plm-divide-warm-100">
          {seasonHistories.map((h) => (
            <li key={h.seasonNumber}>
              <HistoryCard history={h} playerClubId={playerClubId} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function MastheadStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="plm-px-2 plm-text-center first:plm-pl-0 last:plm-pr-0">
      <div
        className="plm-font-display plm-text-2xl plm-font-bold plm-tabular-nums plm-leading-none"
        style={{ color: accent || '#1A1A1A' }}
      >
        {value}
      </div>
      <div className="plm-text-[10px] plm-text-warm-500 plm-font-medium plm-uppercase plm-tracking-[0.15em] plm-mt-1.5">
        {label}
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

  let topScorer = { name: '', goals: 0 };
  for (const ps of history.playerStats) {
    if (ps.goals > topScorer.goals) {
      topScorer = { name: ps.playerName, goals: ps.goals };
    }
  }

  const startYear = 2025 + (history.seasonNumber - 1);

  return (
    <tr className="plm-border-b plm-border-warm-100 hover:plm-bg-warm-50">
      <td className="plm-py-2 plm-text-warm-600 plm-tabular-nums">{startYear}/{(startYear + 1).toString().slice(-2)}</td>
      <td className="plm-py-2">
        <div className="plm-flex plm-items-center plm-gap-1.5">
          <div className="plm-w-2.5 plm-h-2.5 plm-rounded-full" style={{ backgroundColor: championClub?.colors.primary }} />
          <span className="plm-font-medium">{championClub?.name}</span>
          <span className="plm-text-warm-400 plm-text-xs plm-tabular-nums">({champion?.points} pts)</span>
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
    <div className="plm-py-3">
      <div className="plm-flex plm-items-center plm-justify-between plm-mb-1">
        <span className="plm-font-display plm-text-base plm-font-bold plm-tabular-nums">
          {startYear}/{(startYear + 1).toString().slice(-2)}
        </span>
        <span className="plm-text-xs plm-font-semibold plm-tabular-nums">
          {playerPos ? `${playerPos}${getOrdinal(playerPos)} · ${playerRow?.points} pts` : '-'}
        </span>
      </div>
      <div className="plm-flex plm-items-center plm-gap-1.5 plm-text-xs plm-text-warm-600">
        <div className="plm-w-2 plm-h-2 plm-rounded-full plm-flex-shrink-0" style={{ backgroundColor: championClub?.colors.primary }} />
        <span className="plm-truncate">
          Champion: {championClub?.name}{' '}
          <span className="plm-text-warm-400 plm-tabular-nums">({champion?.points} pts)</span>
        </span>
      </div>
    </div>
  );
}

function RecordLine({
  label,
  value,
  tail,
  sub,
  accent,
}: {
  label: string;
  value: string;
  tail: string;
  sub: string;
  accent: string;
}) {
  return (
    <div>
      <div className="plm-text-[10px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-[0.15em]">
        {label}
      </div>
      <div className="plm-flex plm-items-baseline plm-justify-between plm-gap-2 plm-mt-1.5 plm-pb-2 plm-border-b plm-border-warm-200">
        <span className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-truncate">
          {value}
        </span>
        <span
          className="plm-font-display plm-text-lg plm-font-bold plm-tabular-nums plm-flex-shrink-0"
          style={{ color: accent }}
        >
          {tail}
        </span>
      </div>
      <div className="plm-text-[10px] plm-text-warm-500 plm-font-medium plm-uppercase plm-tracking-[0.15em] plm-mt-1.5">
        {sub}
      </div>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ─── Tutorial review picker ────────────────────────────────────────────────
const TUTORIAL_OPTIONS: { tab: TutorialTab; label: string; icon: string }[] = [
  { tab: 'hub', label: 'Game Hub', icon: '🏟' },
  { tab: 'squad', label: 'Squad', icon: '👥' },
  { tab: 'transfers', label: 'Transfers', icon: '💷' },
  { tab: 'history', label: 'History', icon: '📜' },
  { tab: 'manager', label: 'Manager', icon: '🎩' },
  { tab: 'overview', label: 'Full overview', icon: '📖' },
];

function TutorialPicker({
  onPick,
  onClose,
}: {
  onPick: (tab: TutorialTab) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="plm-fixed plm-inset-0 plm-z-[100] plm-flex plm-items-center plm-justify-center plm-p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-picker-title"
    >
      <div
        className="plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-max-w-md plm-w-full plm-shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="plm-flex plm-items-center plm-justify-between plm-px-5 plm-py-3 plm-border-b plm-border-warm-200">
          <h3 id="tutorial-picker-title" className="plm-font-display plm-font-bold plm-text-lg plm-text-charcoal">
            Review a tutorial
          </h3>
          <button
            onClick={onClose}
            aria-label="Close tutorial picker"
            className="plm-text-warm-500 hover:plm-text-charcoal plm-text-xl plm-leading-none"
          >
            ×
          </button>
        </div>
        <div className="plm-p-3 plm-grid plm-grid-cols-2 plm-gap-2">
          {TUTORIAL_OPTIONS.map((opt) => (
            <button
              key={opt.tab}
              onClick={() => onPick(opt.tab)}
              className="plm-flex plm-items-center plm-gap-2 plm-px-3 plm-py-3 plm-rounded plm-border plm-border-warm-200 plm-bg-warm-50 hover:plm-bg-blue-50 hover:plm-border-blue-200 plm-text-left plm-min-h-[44px]"
            >
              <span className="plm-text-lg" aria-hidden="true">{opt.icon}</span>
              <span className="plm-text-sm plm-font-semibold plm-text-charcoal">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
