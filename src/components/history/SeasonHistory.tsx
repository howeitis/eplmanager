import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import type { SeasonHistory as SeasonHistoryType } from '../../types/entities';
import { TutorialModal, useFirstVisitTutorial, type TutorialTab } from '../shared/TutorialModal';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

export function SeasonHistoryScreen() {
  const seasonHistories = useGameStore((s) => s.seasonHistories);
  const manager = useGameStore((s) => s.manager);
  const playerClubId = manager?.clubId;
  const saveSlot = useGameStore((s) => s.saveSlot);
  const firstVisit = useFirstVisitTutorial('history', saveSlot);
  // Which tab's tutorial to show in the review viewer (null = picker closed).
  const [reviewTab, setReviewTab] = useState<TutorialTab | null>(null);
  // Whether the "pick a tab" menu is visible.
  const [pickerOpen, setPickerOpen] = useState(false);

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
    // FA Cup wins from manager accomplishments
    if (manager?.accomplishments) {
      for (const acc of manager.accomplishments) {
        if (acc.type === 'fa-cup' && acc.clubId === playerClubId) {
          result.push({ season: acc.season, award: 'FA Cup Winner', type: 'fa-cup' });
        }
      }
    }
    // Sort by season, then league before fa-cup
    result.sort((a, b) => a.season - b.season || (a.type === 'league' ? -1 : 1));
    return result;
  }, [seasonHistories, playerClubId, manager?.accomplishments]);

  const tutorialButton = (
    <button
      onClick={() => setPickerOpen(true)}
      className="plm-inline-flex plm-items-center plm-gap-1.5 plm-px-3 plm-py-2 plm-rounded-full plm-border plm-border-blue-200 plm-bg-blue-50 plm-text-blue-700 plm-text-xs plm-font-semibold hover:plm-bg-blue-100 plm-min-h-[36px]"
    >
      <span aria-hidden="true">❓</span>
      <span>New here? How it works</span>
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
      <div className="plm-w-full">
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-8 plm-text-center">
          <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-mb-2">
            Season History
          </h2>
          <p className="plm-text-sm plm-text-warm-500 plm-mb-4">
            No completed seasons yet. History will appear after your first full season.
          </p>
          <div className="plm-flex plm-justify-center">{tutorialButton}</div>
        </div>
        {tutorialModal}
      </div>
    );
  }

  return (
    <div className="plm-space-y-4 plm-w-full">
      <div className="plm-flex plm-justify-end">{tutorialButton}</div>
      {tutorialModal}
      {/* Trophy Cabinet */}
      {trophies.length > 0 && (
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
            Trophy Cabinet
          </h3>
          <div className="plm-flex plm-flex-wrap plm-gap-3">
            {trophies.map((t, i) => {
              const startYear = 2025 + (t.season - 1);
              const yearLabel = `Season ${t.season}, ${startYear.toString().slice(-2)}/${(startYear + 1).toString().slice(-2)}`;
              const trophyImg = t.type === 'league' ? '/trophies/epl trophy.png' : '/trophies/fa cup trophy.png';
              return (
                <div key={i} className="plm-bg-amber-50 plm-border plm-border-amber-200 plm-rounded plm-px-4 plm-py-3 plm-text-center plm-w-32">
                  <img
                    src={trophyImg}
                    alt={t.award}
                    className={`${t.type === 'league' ? 'plm-w-28 plm-h-28 plm--my-2' : 'plm-w-20 plm-h-20'} plm-mx-auto plm-object-contain`}
                  />
                  <div className="plm-text-[10px] plm-font-bold plm-text-amber-700 plm-uppercase plm-mt-2">
                    {t.award}
                  </div>
                  <div className="plm-text-[10px] plm-text-amber-600 plm-mt-0.5">{yearLabel}</div>
                </div>
              );
            })}
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

// ─── Tutorial review picker ────────────────────────────────────────────────
// Shown from the "New here?" button. Lets the user jump into any tab's
// tutorial from one place.
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

