import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';
import { PhaseIndicator } from './PhaseIndicator';
import { BoardStatus } from './BoardStatus';
import { SquadMiniView } from './SquadMiniView';
import { GoalScorersWidget } from './GoalScorersWidget';
import { RivalsWatch } from './RivalsWatch';
import { LeagueTable } from '../shared/LeagueTable';
import { TutorialModal, useFirstVisitTutorial } from '../shared/TutorialModal';
import type { NavTab } from '../shared/BottomNav';

interface GameHubProps {
  onNavigate: (tab: NavTab) => void;
  onAdvance: () => void;
  advanceLabel: string;
  julyNarrative?: string | null;
}

export function GameHub({ onNavigate, onAdvance, advanceLabel, julyNarrative }: GameHubProps) {
  const manager = useGameStore((s) => s.manager);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const clubs = useGameStore((s) => s.clubs);
  const budgets = useGameStore((s) => s.budgets);
  const leagueTable = useGameStore((s) => s.leagueTable);
  const shortlistNotifications = useGameStore((s) => s.shortlistNotifications);
  const clearShortlistNotifications = useGameStore((s) => s.clearShortlistNotifications);
  const saveSlot = useGameStore((s) => s.saveSlot);

  const [dismissedNotifications, setDismissedNotifications] = useState(false);
  const tutorial = useFirstVisitTutorial('hub', saveSlot);

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
    currentPhase === 'summer_window' || currentPhase === 'july_advance'
    || currentPhase === 'august_deadline' || currentPhase === 'january_window'
    || currentPhase === 'january_deadline';

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

        {/* July narrative (WC / Euro / preseason) */}
        {currentPhase === 'july_advance' && julyNarrative && (
          <div className="plm-bg-amber-50 plm-border plm-border-amber-200 plm-rounded-lg plm-p-4">
            <h3 className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-amber-700 plm-mb-1.5">
              Summer Headlines
            </h3>
            <p className="plm-text-sm plm-text-amber-900 plm-leading-relaxed">{julyNarrative}</p>
          </div>
        )}

        {/* Deadline day banner */}
        {(currentPhase === 'august_deadline' || currentPhase === 'january_deadline') && (
          <div className="plm-bg-red-50 plm-border plm-border-red-200 plm-rounded-lg plm-p-4">
            <h3 className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-red-700 plm-mb-1.5">
              Transfer Deadline Day
            </h3>
            <p className="plm-text-sm plm-text-red-800 plm-leading-relaxed">
              Last chance to complete your transfer business. The window closes when you advance.
            </p>
          </div>
        )}

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
              getClubLogoUrl(playerClub.id) ? (
                <img
                  src={getClubLogoUrl(playerClub.id)}
                  alt={playerClub.name}
                  className="plm-w-10 plm-h-10 plm-rounded-full plm-flex-shrink-0 plm-object-contain plm-bg-white plm-p-0.5 plm-border-2"
                  style={{ borderColor: playerClub.colors.secondary }}
                />
              ) : (
                <div
                  className="plm-w-10 plm-h-10 plm-rounded-full plm-flex-shrink-0 plm-border-2"
                  style={{ backgroundColor: playerClub.colors.primary, borderColor: playerClub.colors.secondary }}
                />
              )
            )}
            <div className="plm-min-w-0 plm-flex-1">
              <h1 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal plm-truncate">
                {playerClub?.name}
              </h1>
              <p className="plm-text-xs plm-text-warm-500 plm-truncate">
                {manager?.name}
              </p>
              <ReputationGauge reputation={manager?.reputation ?? 0} accent={clubData?.colors.primary} />
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

        {/* Rivals tracker — head-to-head positions vs your derby rivals */}
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
          <RivalsWatch />
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
      {tutorial.show && <TutorialModal tab="hub" onClose={tutorial.onClose} />}
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

function ReputationGauge({ reputation, accent }: { reputation: number; accent?: string }) {
  const pct = Math.max(0, Math.min(100, reputation));
  const tier =
    reputation >= 80 ? 'Iconic' :
    reputation >= 60 ? 'Established' :
    reputation >= 40 ? 'Respected' :
    reputation >= 20 ? 'Up-and-coming' : 'Untested';
  return (
    <div className="plm-mt-1.5">
      <div className="plm-flex plm-items-center plm-justify-between plm-text-[10px] plm-text-warm-500 plm-uppercase plm-tracking-wider plm-font-semibold">
        <span>Reputation</span>
        <span className="plm-tabular-nums plm-text-charcoal">{reputation} · {tier}</span>
      </div>
      <div className="plm-mt-1 plm-h-1.5 plm-w-full plm-rounded-full plm-bg-warm-100 plm-overflow-hidden">
        <div
          className="plm-h-full plm-rounded-full plm-transition-all plm-duration-700"
          style={{ width: `${pct}%`, backgroundColor: accent || '#1A1A1A' }}
        />
      </div>
    </div>
  );
}
