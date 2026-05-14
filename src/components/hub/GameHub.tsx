import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl, getNationalTeamLogoUrl } from '../../data/assets';
import { PhaseIndicator } from './PhaseIndicator';
import { BoardStatus } from './BoardStatus';
import { InFormScroller } from './InFormScroller';
import { AroundTheLeague } from './AroundTheLeague';
import { LeagueTable } from '../shared/LeagueTable';
import { TutorialModal, useFirstVisitTutorial } from '../shared/TutorialModal';
import type { NavTab } from '../shared/BottomNav';

interface GameHubProps {
  onNavigate: (tab: NavTab) => void;
  onAdvance: () => void;
  advanceLabel: string;
  julyNarrative?: string | null;
  julyWinnerNationality?: string | null;
}

export function GameHub({ onNavigate, onAdvance, advanceLabel, julyNarrative, julyWinnerNationality }: GameHubProps) {
  const manager = useGameStore((s) => s.manager);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const currentPhase = useGameStore((s) => s.currentPhase);
  const clubs = useGameStore((s) => s.clubs);
  const budgets = useGameStore((s) => s.budgets);
  const leagueTable = useGameStore((s) => s.leagueTable);
  const clubReputation = useGameStore((s) => s.clubReputation);
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
    <div className="plm-relative plm-flex plm-flex-col lg:plm-flex-row plm-gap-6 plm-w-full">
      {/* Club-color ambient glow — soft linear wash across the entire top
          of the hub using the player's primary club color. Sits behind all
          content. */}
      {clubData && (
        <div
          aria-hidden
          className="plm-pointer-events-none plm-absolute plm-inset-x-0 plm--top-16 plm-h-[320px]"
          style={{
            background: `linear-gradient(to bottom, ${clubData.colors.primary}38 0%, ${clubData.colors.primary}1F 28%, ${clubData.colors.primary}0A 55%, transparent 100%)`,
            zIndex: 0,
          }}
        />
      )}

      {/* Desktop: League table on the left, sticky */}
      <div className="plm-relative plm-hidden lg:plm-block lg:plm-w-[520px] lg:plm-flex-shrink-0" style={{ zIndex: 1 }}>
        <div className="lg:plm-sticky lg:plm-top-6">
          <div className="plm-bg-white plm-border plm-border-warm-200 plm-rounded-2xl plm-p-5">
            <header className="plm-mb-4 plm-pb-3 plm-border-b plm-border-warm-200">
              <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
                Standings
              </p>
              <h2 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
                Premier League
              </h2>
            </header>
            <LeagueTable />
          </div>
        </div>
      </div>

      {/* Main content column */}
      <div className="plm-relative plm-flex-1 plm-min-w-0 plm-space-y-4" style={{ zIndex: 1 }}>
        {/* Top hero — phase header + club identity sit together unboxed
            as one masthead block, no extra gap between them. */}
        <div className="plm-pt-1 plm-pb-1">
          <PhaseIndicator phase={currentPhase} seasonNumber={seasonNumber} />

          {/* Club identity, logo + name + manager line — flows directly
              under the phase header. */}
          <div className="plm-mt-3 plm-flex plm-items-center plm-gap-3">
            {playerClub && getClubLogoUrl(playerClub.id) ? (
              <img
                src={getClubLogoUrl(playerClub.id)}
                alt={playerClub.name}
                className="plm-w-14 plm-h-14 plm-flex-shrink-0 plm-object-contain"
              />
            ) : playerClub ? (
              <div
                className="plm-w-14 plm-h-14 plm-flex-shrink-0"
                style={{ backgroundColor: playerClub.colors.primary }}
              />
            ) : null}
            <div className="plm-min-w-0 plm-flex-1">
              <h1 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight plm-truncate">
                {playerClub?.name}
              </h1>
              <p className="plm-font-display plm-italic plm-text-sm plm-text-warm-600 plm-truncate">
                Managed by {manager?.name}
              </p>
            </div>
          </div>

          <div className="plm-mt-5 plm-space-y-3">
            <ReputationGauge reputation={manager?.reputation ?? 0} accent={clubData?.colors.primary} />
            {playerClub && (
              <ClubReputationGauge
                reputation={clubReputation[playerClub.id] ?? 50}
                tier={playerClub.tier}
                accent={clubData?.colors.primary}
              />
            )}
          </div>

          <div className="plm-mt-5 plm-pt-5 plm-border-t plm-border-warm-200 plm-grid plm-grid-cols-3 plm-divide-x plm-divide-warm-200">
            <StatBox label="Position" value={position || '-'} />
            <StatBox label="Points" value={playerRow?.points ?? 0} />
            <StatBox label="Budget" value={`£${playerBudget.toFixed(0)}M`} accent />
          </div>
        </div>

        {/* July narrative (WC / Euro / preseason) */}
        {currentPhase === 'july_advance' && julyNarrative && (() => {
          const crestUrl = julyWinnerNationality ? getNationalTeamLogoUrl(julyWinnerNationality) : null;
          return (
            <div className="plm-bg-amber-50 plm-border plm-border-amber-200 plm-rounded-2xl plm-p-4">
              <h3 className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-amber-700 plm-mb-1.5">
                Summer Headlines
              </h3>
              <div className="plm-flex plm-items-start plm-gap-3">
                {crestUrl && (
                  <img
                    src={crestUrl}
                    alt=""
                    className="plm-w-10 plm-h-10 plm-flex-shrink-0 plm-object-contain plm-mt-0.5"
                  />
                )}
                <p className="plm-text-sm plm-text-amber-900 plm-leading-relaxed plm-min-w-0">{julyNarrative}</p>
              </div>
            </div>
          );
        })()}

        {/* Deadline day banner */}
        {(currentPhase === 'august_deadline' || currentPhase === 'january_deadline') && (
          <div className="plm-bg-red-50 plm-border plm-border-red-200 plm-rounded-2xl plm-p-4">
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
          <div className="plm-bg-amber-50 plm-border plm-border-amber-200 plm-rounded-2xl plm-p-4">
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

        {/* Club identity hero now lives inside the masthead block above. */}

        {/* Board status */}
        <div className="plm-bg-white plm-border plm-border-warm-200 plm-rounded-2xl plm-p-5">
          <BoardStatus />
        </div>

        {/* Advance button — editorial: rounded chrome, uppercase tracking */}
        <button
          onClick={onAdvance}
          className="plm-w-full plm-py-4 plm-rounded-2xl plm-font-body plm-font-semibold plm-text-xs plm-uppercase plm-tracking-[0.18em] plm-transition-all plm-duration-200 plm-min-h-[44px]"
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
            className="plm-w-full plm-py-3 plm-rounded-2xl plm-font-body plm-font-semibold plm-text-xs plm-uppercase plm-tracking-[0.18em] plm-bg-white plm-border plm-border-warm-300 plm-text-charcoal hover:plm-bg-warm-50 plm-transition-colors plm-min-h-[44px]"
          >
            Open Transfer Center
          </button>
        )}

        {/* Mobile: League table */}
        <div className="lg:plm-hidden">
          <div className="plm-bg-white plm-border plm-border-warm-200 plm-rounded-2xl plm-p-5">
            <header className="plm-mb-4 plm-pb-3 plm-border-b plm-border-warm-200">
              <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
                Standings
              </p>
              <h2 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
                Premier League
              </h2>
            </header>
            <LeagueTable compact />
          </div>
        </div>

        {/* Around the League — snap-scrolling deck: Next Month, Recent Results,
            Rivals, Golden Boot. Each card carries its own chrome, so this
            section has no outer wrapper. */}
        <AroundTheLeague />

        {/* In Form — top 5 by form, excluding injured */}
        <div className="plm-bg-white plm-border plm-border-warm-200 plm-rounded-2xl plm-p-5">
          <InFormScroller />
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
    <div className="plm-px-2 plm-text-center first:plm-pl-0 last:plm-pr-0">
      <div className={`plm-font-display plm-text-2xl plm-font-bold plm-tabular-nums plm-leading-none ${accent ? 'plm-text-emerald-700' : 'plm-text-charcoal'}`}>
        {value}
      </div>
      <div className="plm-text-[10px] plm-text-warm-500 plm-font-medium plm-uppercase plm-tracking-[0.15em] plm-mt-1.5">
        {label}
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
  const standing =
    reputation >= 80 ? 'Iconic' :
    reputation >= 60 ? 'Established' :
    reputation >= 40 ? 'Respected' :
    reputation >= 20 ? 'Up-and-coming' : 'Untested';
  return (
    <div>
      <div className="plm-flex plm-items-baseline plm-justify-between plm-text-[10px] plm-uppercase plm-tracking-[0.15em] plm-font-medium">
        <span className="plm-text-warm-500">Manager Reputation</span>
        <span className="plm-tabular-nums plm-text-charcoal plm-font-semibold">{reputation} · {standing}</span>
      </div>
      <div className="plm-mt-1.5 plm-h-px plm-w-full plm-bg-warm-200 plm-relative">
        <div
          className="plm-absolute plm-inset-y-0 plm-left-0 plm-h-px plm-transition-all plm-duration-700"
          style={{ width: `${pct}%`, backgroundColor: accent || '#1A1A1A' }}
        />
      </div>
    </div>
  );
}

/**
 * Club reputation gauge — separate from manager rep. Shows where the club
 * sits across the five competitive bands (Elite → Struggling) and which
 * direction it's trending. Climbs/falls organically as the club outperforms
 * or underperforms its current tier across multiple seasons.
 */
function ClubReputationGauge({ reputation, tier, accent }: {
  reputation: number;
  tier: number;
  accent?: string;
}) {
  const pct = Math.max(0, Math.min(100, reputation));
  const label =
    tier === 1 ? 'Elite' :
    tier === 2 ? 'Established' :
    tier === 3 ? 'Mid-table' :
    tier === 4 ? 'Battling' : 'Struggling';
  // Tick markers visualize the 5 tier bands so it's clear the bar isn't a
  // single linear value but a position within a hierarchy.
  const tickPositions = [38, 55, 72, 88]; // matches TIER_REP_THRESHOLDS in clubReputation.ts
  return (
    <div>
      <div className="plm-flex plm-items-baseline plm-justify-between plm-text-[10px] plm-uppercase plm-tracking-[0.15em] plm-font-medium">
        <span className="plm-text-warm-500">Club Reputation</span>
        <span className="plm-tabular-nums plm-text-charcoal plm-font-semibold">Tier {tier} · {label}</span>
      </div>
      <div className="plm-mt-1.5 plm-relative plm-h-px plm-w-full plm-bg-warm-200">
        <div
          className="plm-absolute plm-inset-y-0 plm-left-0 plm-h-px plm-transition-all plm-duration-700"
          style={{ width: `${pct}%`, backgroundColor: accent || '#1A1A1A' }}
        />
        {tickPositions.map((p) => (
          <span
            key={p}
            className="plm-absolute plm--top-1 plm-h-3 plm-w-px plm-bg-warm-300"
            style={{ left: `${p}%` }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
