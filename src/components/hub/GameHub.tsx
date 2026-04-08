import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { PhaseIndicator } from './PhaseIndicator';
import { BoardStatus } from './BoardStatus';
import { SquadMiniView } from './SquadMiniView';
import { GoalScorersWidget } from './GoalScorersWidget';
import { LeagueTable } from '../shared/LeagueTable';
import type { NavTab } from '../shared/BottomNav';

interface GameHubProps {
  onNavigate: (tab: NavTab) => void;
  onAdvance: () => void;
  advanceLabel: string;
}

export function GameHub({ onNavigate, onAdvance, advanceLabel }: GameHubProps) {
  const manager = useGameStore((s) => s.manager);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const clubs = useGameStore((s) => s.clubs);
  const budgets = useGameStore((s) => s.budgets);
  const leagueTable = useGameStore((s) => s.leagueTable);
  const shortlistNotifications = useGameStore((s) => s.shortlistNotifications);
  const clearShortlistNotifications = useGameStore((s) => s.clearShortlistNotifications);

  const [dismissedNotifications, setDismissedNotifications] = useState(false);

  // Reset dismissed state when new notifications arrive
  useEffect(() => {
    if (shortlistNotifications.length > 0) {
      setDismissedNotifications(false);
    }
  }, [shortlistNotifications.length]);

  const playerClub = clubs.find((c) => c.id === manager?.clubId);
  const clubData = CLUBS.find((c) => c.id === manager?.clubId);
  const playerBudget = budgets[manager?.clubId || ''] || 0;

  const sortedTable = [...leagueTable].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  const position = sortedTable.findIndex((r) => r.clubId === manager?.clubId) + 1;
  const playerRow = sortedTable.find((r) => r.clubId === manager?.clubId);

  const isTransferWindow =
    currentPhase === 'summer_window' || currentPhase === 'january_window';

  return (
    <div className="plm-flex plm-flex-col lg:plm-flex-row plm-gap-6 plm-w-full">
      {/* Desktop: League table on the left, sticky */}
      <div className="plm-hidden lg:plm-block lg:plm-w-[420px] lg:plm-flex-shrink-0">
        <div className="lg:plm-sticky lg:plm-top-6">
          <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
            <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-mb-3">
              Premier League
            </h2>
            <LeagueTable />
          </div>
        </div>
      </div>

      {/* Main content column */}
      <div className="plm-flex-1 plm-min-w-0 plm-space-y-4">
        {/* Phase indicator */}
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <PhaseIndicator phase={currentPhase} seasonNumber={seasonNumber} />
        </div>

        {/* Shortlist transfer notifications */}
        {shortlistNotifications.length > 0 && !dismissedNotifications && (
          <div className="plm-bg-amber-50 plm-border plm-border-amber-200 plm-rounded-lg plm-p-4">
            <div className="plm-flex plm-items-start plm-justify-between plm-gap-2">
              <div className="plm-flex-1 plm-min-w-0">
                <h3 className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-amber-700 plm-mb-1.5">
                  Shortlist Alert
                </h3>
                <div className="plm-space-y-1">
                  {shortlistNotifications.map((msg, i) => (
                    <p key={i} className="plm-text-sm plm-text-amber-800">{msg}</p>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setDismissedNotifications(true);
                  clearShortlistNotifications();
                }}
                aria-label="Dismiss shortlist notifications"
                className="plm-flex-shrink-0 plm-w-8 plm-h-8 plm-flex plm-items-center plm-justify-center plm-rounded-full plm-text-amber-500 hover:plm-bg-amber-100 plm-transition-colors plm-min-h-[44px] plm-min-w-[44px]"
              >
                <svg className="plm-w-4 plm-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Club stats row */}
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <div className="plm-flex plm-items-center plm-gap-3 plm-mb-3">
            {playerClub && (
              <div
                className="plm-w-10 plm-h-10 plm-rounded-full plm-flex-shrink-0 plm-border-2"
                style={{
                  backgroundColor: playerClub.colors.primary,
                  borderColor: playerClub.colors.secondary,
                }}
              />
            )}
            <div className="plm-min-w-0">
              <h1 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-truncate">
                {playerClub?.name}
              </h1>
              <p className="plm-text-xs plm-text-warm-500">
                {manager?.name} &middot; Rep {manager?.reputation}
              </p>
            </div>
          </div>
          <div className="plm-grid plm-grid-cols-4 plm-gap-2">
            <StatBox label="Pos" value={position || '-'} />
            <StatBox label="Pts" value={playerRow?.points ?? 0} />
            <StatBox label="Squad" value={playerClub?.roster.filter((p) => !p.isTemporary).length || 0} />
            <StatBox label="Budget" value={`£${playerBudget.toFixed(0)}M`} accent />
          </div>
        </div>

        {/* Board status */}
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <BoardStatus />
        </div>

        {/* Advance button */}
        <button
          onClick={onAdvance}
          className="plm-w-full plm-py-3.5 plm-rounded-lg plm-font-body plm-font-semibold plm-text-sm plm-transition-all plm-duration-200 plm-min-h-[44px]"
          style={{
            backgroundColor: clubData?.colors.primary || '#1A1A1A',
            color: isLightColor(clubData?.colors.primary || '#1A1A1A') ? '#1A1A1A' : '#FFFFFF',
          }}
        >
          {advanceLabel}
        </button>

        {/* Transfer window shortcut */}
        {isTransferWindow && (
          <button
            onClick={() => onNavigate('transfers')}
            className="plm-w-full plm-py-3 plm-rounded-lg plm-font-body plm-font-semibold plm-text-sm plm-bg-white plm-border plm-border-warm-300 plm-text-charcoal hover:plm-bg-warm-50 plm-transition-colors plm-min-h-[44px]"
          >
            Open Transfer Center
          </button>
        )}

        {/* Mobile: League table */}
        <div className="lg:plm-hidden">
          <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
            <h2 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal plm-mb-3">
              Premier League
            </h2>
            <LeagueTable compact />
          </div>
        </div>

        {/* Goal Scorers leaderboard */}
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <GoalScorersWidget />
        </div>

        {/* Squad mini-view */}
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <SquadMiniView />
          <button
            onClick={() => onNavigate('squad')}
            className="plm-mt-3 plm-w-full plm-text-center plm-text-xs plm-text-warm-500 hover:plm-text-charcoal plm-transition-colors plm-py-2 plm-min-h-[44px] plm-flex plm-items-center plm-justify-center"
          >
            View Full Squad &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="plm-bg-warm-50 plm-rounded plm-p-2 plm-text-center">
      <div className="plm-text-[10px] plm-text-warm-400 plm-font-medium plm-uppercase plm-tracking-wider">
        {label}
      </div>
      <div className={`plm-text-lg plm-font-bold plm-tabular-nums ${accent ? 'plm-text-emerald-700' : 'plm-text-charcoal'}`}>
        {value}
      </div>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
