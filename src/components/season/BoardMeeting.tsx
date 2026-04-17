import { useEffect, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';
import { getChairman } from '../../data/chairmen';
import { analyzeSquad } from '../../engine/squadAnalysis';
import {
  selectGreeting,
  describeGoal,
  describeBudget,
  classifyStanding,
} from '../../engine/boardMeeting';

interface BoardMeetingProps {
  onContinue: () => void;
}

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

export function BoardMeeting({ onContinue }: BoardMeetingProps) {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const boardExpectation = useGameStore((s) => s.boardExpectation);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const budgets = useGameStore((s) => s.budgets);
  const seasonHistories = useGameStore((s) => s.seasonHistories);
  const leagueTable = useGameStore((s) => s.leagueTable);

  const playerClubId = manager?.clubId || '';
  const playerClub = clubs.find((c) => c.id === playerClubId);
  const clubData = clubDataMap.get(playerClubId);
  const chairman = getChairman(playerClubId);

  // Last season position
  const lastSeasonPosition = useMemo(() => {
    if (seasonHistories.length === 0) return null;
    const lastHistory = seasonHistories[seasonHistories.length - 1];
    const sorted = [...lastHistory.finalTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    const pos = sorted.findIndex((r) => r.clubId === playerClubId) + 1;
    return pos || null;
  }, [seasonHistories, playerClubId]);

  // Current league position (for standing computation in returning seasons)
  const currentPosition = useMemo(() => {
    if (!leagueTable || leagueTable.length === 0) return null;
    const sorted = [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    const pos = sorted.findIndex((r) => r.clubId === playerClubId) + 1;
    return pos || null;
  }, [leagueTable, playerClubId]);

  // Standing
  const standing = useMemo(() => {
    if (!boardExpectation) return 'on_track' as const;
    if (seasonNumber === 1) return 'on_track' as const;
    // Use last season finish for returning-season standing
    const refPosition = lastSeasonPosition || currentPosition || 10;
    return classifyStanding(refPosition, boardExpectation);
  }, [boardExpectation, seasonNumber, lastSeasonPosition, currentPosition]);

  // Greeting
  const greeting = useMemo(() => {
    if (!chairman || !manager) return '';
    return selectGreeting(
      chairman.personality,
      seasonNumber,
      manager.name,
      lastSeasonPosition,
      standing,
    );
  }, [chairman, manager, seasonNumber, lastSeasonPosition, standing]);

  // Goal
  const goalText = useMemo(() => {
    if (!boardExpectation) return 'Have a good season.';
    return describeGoal(boardExpectation);
  }, [boardExpectation]);

  // Budget
  const budget = budgets[playerClubId] || 0;
  const budgetDialogue = useMemo(() => {
    if (!chairman) return `You have \u00A3${budget.toFixed(0)}M to spend.`;
    return describeBudget(chairman.personality, budget);
  }, [chairman, budget]);

  // Squad assessment
  const assessment = useMemo(() => {
    if (!playerClub || !manager) return null;
    return analyzeSquad(playerClub, clubs, manager.philosophy, seasonNumber);
  }, [playerClub, clubs, manager, seasonNumber]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!manager || !chairman || !playerClub || !clubData) return null;

  const accentColor = clubData.colors.primary;
  const isLight = isLightColor(accentColor);

  return (
    <div className="plm-min-h-screen plm-bg-cream plm-font-body">
      <div className="plm-max-w-2xl plm-mx-auto plm-px-4 plm-py-8 md:plm-px-8 md:plm-py-12">
        {/* Header */}
        <div className="plm-text-center plm-mb-8">
          {getClubLogoUrl(playerClub.id) ? (
            <img
              src={getClubLogoUrl(playerClub.id)}
              alt={playerClub.name}
              className="plm-w-16 plm-h-16 plm-rounded-full plm-mb-4 plm-object-contain plm-bg-white plm-p-1 plm-border-2 plm-mx-auto"
              style={{ borderColor: clubData.colors.secondary }}
            />
          ) : (
            <div
              className="plm-inline-flex plm-items-center plm-justify-center plm-w-16 plm-h-16 plm-rounded-full plm-mb-4 plm-border-2 plm-mx-auto"
              style={{
                backgroundColor: accentColor,
                borderColor: clubData.colors.secondary,
              }}
            />
          )}
          <h1 className="plm-font-display plm-text-2xl md:plm-text-3xl plm-font-bold plm-text-charcoal plm-mb-1">
            Board Meeting
          </h1>
          <p className="plm-text-sm plm-text-warm-500">
            {playerClub.name} &middot; Season {seasonNumber}
          </p>
        </div>

        {/* Chairman info */}
        <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-5 plm-mb-4">
          <div className="plm-flex plm-items-start plm-gap-4">
            <div
              className="plm-flex-shrink-0 plm-w-12 plm-h-12 plm-rounded-full plm-flex plm-items-center plm-justify-center plm-text-lg plm-font-bold"
              style={{
                backgroundColor: accentColor + '20',
                color: isLight ? '#1A1A1A' : accentColor,
              }}
            >
              {chairman.name.charAt(0)}
            </div>
            <div className="plm-min-w-0">
              <h2 className="plm-font-display plm-text-lg plm-font-bold plm-text-charcoal">
                {chairman.name}
              </h2>
              <p className="plm-text-xs plm-text-warm-500 plm-mb-1">
                {chairman.title} &middot; {formatPersonality(chairman.personality)}
              </p>
              <p className="plm-text-xs plm-text-warm-400 plm-italic">
                &ldquo;{chairman.quirk}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Greeting */}
        <Section number={1} title="The Greeting">
          <p className="plm-text-sm plm-text-charcoal plm-leading-relaxed">
            {greeting}
          </p>
        </Section>

        {/* Section 2: The Goal */}
        <Section number={2} title="The Season Objective">
          <div className="plm-flex plm-items-center plm-gap-3">
            <div
              className="plm-flex-shrink-0 plm-w-10 plm-h-10 plm-rounded-lg plm-flex plm-items-center plm-justify-center"
              style={{ backgroundColor: accentColor + '15' }}
            >
              <svg className="plm-w-5 plm-h-5" style={{ color: accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="plm-text-base plm-font-bold plm-text-charcoal">
                {goalText}
              </p>
              <p className="plm-text-xs plm-text-warm-500">
                Board expectation: finish {ordinal(boardExpectation?.minPosition || 20)} or higher
              </p>
            </div>
          </div>
        </Section>

        {/* Section 3: The Budget */}
        <Section number={3} title="Transfer Budget">
          <p className="plm-text-sm plm-text-charcoal plm-leading-relaxed plm-mb-3">
            {budgetDialogue}
          </p>
          <div
            className="plm-rounded-lg plm-p-4 plm-text-center"
            style={{ backgroundColor: accentColor + '10' }}
          >
            <p className="plm-text-xs plm-text-warm-500 plm-uppercase plm-tracking-wider plm-font-medium plm-mb-1">
              Available Funds
            </p>
            <p className="plm-text-3xl plm-font-bold plm-tabular-nums" style={{ color: accentColor }}>
              {'\u00A3'}{budget.toFixed(0)}M
            </p>
          </div>
        </Section>

        {/* Section 4: Squad Assessment */}
        <Section number={4} title="Squad Assessment">
          {assessment && (
            <div className="plm-space-y-4">
              {/* Strengths */}
              {assessment.strengths.length > 0 && (
                <div>
                  <h4 className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-emerald-700 plm-mb-2">
                    Strengths
                  </h4>
                  <div className="plm-space-y-2">
                    {assessment.strengths.map((point, i) => (
                      <AssessmentCard key={i} point={point} type="strength" />
                    ))}
                  </div>
                </div>
              )}

              {/* Weaknesses */}
              {assessment.weaknesses.length > 0 && (
                <div>
                  <h4 className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-red-700 plm-mb-2">
                    Weaknesses
                  </h4>
                  <div className="plm-space-y-2">
                    {assessment.weaknesses.map((point, i) => (
                      <AssessmentCard key={i} point={point} type="weakness" />
                    ))}
                  </div>
                </div>
              )}

              {assessment.strengths.length === 0 && assessment.weaknesses.length === 0 && (
                <p className="plm-text-sm plm-text-warm-500 plm-italic">
                  The squad is balanced — no standout strengths or weaknesses to report.
                </p>
              )}
            </div>
          )}

          {/* Youth placeholder */}
          {/* TODO(v1.6): Youth intake update */}
        </Section>

        {/* Continue button */}
        <div className="plm-mt-8 plm-pb-4">
          <button
            onClick={onContinue}
            className="plm-w-full plm-py-3.5 plm-rounded-lg plm-font-body plm-font-semibold plm-text-sm plm-transition-all plm-duration-200 plm-min-h-[44px]"
            style={{
              backgroundColor: accentColor,
              color: isLight ? '#1A1A1A' : '#FFFFFF',
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-5 plm-mb-4">
      <div className="plm-flex plm-items-center plm-gap-2 plm-mb-3">
        <span className="plm-flex-shrink-0 plm-w-6 plm-h-6 plm-rounded-full plm-bg-warm-100 plm-text-warm-500 plm-text-xs plm-font-bold plm-flex plm-items-center plm-justify-center">
          {number}
        </span>
        <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function AssessmentCard({ point, type }: { point: { headline: string; detail: string; position?: string }; type: 'strength' | 'weakness' }) {
  const isStrength = type === 'strength';
  return (
    <div className={`plm-rounded-lg plm-p-3 plm-border ${isStrength ? 'plm-bg-emerald-50 plm-border-emerald-100' : 'plm-bg-red-50 plm-border-red-100'}`}>
      <div className="plm-flex plm-items-start plm-gap-2">
        <span className={`plm-flex-shrink-0 plm-mt-0.5 plm-text-sm ${isStrength ? 'plm-text-emerald-600' : 'plm-text-red-600'}`}>
          {isStrength ? '+' : '-'}
        </span>
        <div className="plm-min-w-0">
          <p className={`plm-text-sm plm-font-semibold ${isStrength ? 'plm-text-emerald-800' : 'plm-text-red-800'}`}>
            {point.headline}
          </p>
          <p className={`plm-text-xs plm-mt-0.5 ${isStrength ? 'plm-text-emerald-700' : 'plm-text-red-700'}`}>
            {point.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───

function formatPersonality(p: string): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
