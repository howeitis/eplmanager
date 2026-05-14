import { useState, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';
import { ManagerCard } from '../shared/ManagerCard';
import { getManagerFaceUri } from '../../utils/avatarFace';
import { saveGame } from '../../utils/save';
import { TutorialModal, useFirstVisitTutorial } from '../shared/TutorialModal';

const PHILOSOPHY_LABELS: Record<string, string> = {
  attacking: 'Attacking',
  possession: 'Possession',
  pragmatic: 'Pragmatic',
  defensive: 'Defensive',
  developmental: 'Developmental',
  'rotation-heavy': 'Rotation-Heavy',
};

const BACKGROUND_LABELS: Record<string, string> = {
  'former-pro': 'Former Professional',
  'lower-league-pro': 'Lower League Pro',
  'academy-coach': 'Academy Coach',
  journalist: 'Journalist',
  analyst: 'Analyst',
  'never-played': 'Never Played',
};

const ACCOMPLISHMENT_ICONS: Record<string, string> = {
  'league-title': '🏆',
  'fa-cup': '🏅',
  'manager-of-season': '⭐',
  'milestone-games': '📊',
  'club-hired': '📋',
  'club-departed': '👋',
  promotion: '⬆',
  relegation: '⬇',
};

const clubMap = new Map(CLUBS.map((c) => [c.id, c]));

interface ManagerProfileScreenProps {
  onResign?: () => void;
}

export function ManagerProfileScreen({ onResign }: ManagerProfileScreenProps = {}) {
  const manager = useGameStore((s) => s.manager);
  const seasonNumber = useGameStore((s) => s.seasonNumber);
  const saveSlot = useGameStore((s) => s.saveSlot);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resignStep, setResignStep] = useState<0 | 1 | 2>(0);
  const tutorial = useFirstVisitTutorial('manager', saveSlot);

  const handleSave = useCallback(async () => {
    if (!saveSlot || saving) return;
    setSaving(true);
    try {
      const state = useGameStore.getState();
      await saveGame(saveSlot, state);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [saveSlot, saving]);

  if (!manager) {
    return (
      <div className="plm-text-center plm-py-12 plm-text-warm-500">
        No manager profile found.
      </div>
    );
  }

  const currentClub = clubMap.get(manager.clubId);
  const yearsInManagement = seasonNumber;

  // Group accomplishments by season, reverse chronological
  const accomplishmentsBySeason = new Map<number, typeof manager.accomplishments>();
  for (const acc of manager.accomplishments) {
    const existing = accomplishmentsBySeason.get(acc.season) || [];
    existing.push(acc);
    accomplishmentsBySeason.set(acc.season, existing);
  }
  const sortedSeasons = [...accomplishmentsBySeason.keys()].sort((a, b) => b - a);

  const accent = currentClub?.colors.primary;

  return (
    <div className="plm-relative plm-space-y-6">
      {/* Club-color ambient glow — bleeds to viewport edges, mirrors the hub masthead. */}
      {currentClub && (
        <div
          aria-hidden
          className="plm-pointer-events-none plm-absolute plm--left-4 plm--right-4 md:plm--left-6 md:plm--right-6 plm--top-16 plm-h-[320px]"
          style={{
            background: `linear-gradient(to bottom, ${currentClub.colors.primary}38 0%, ${currentClub.colors.primary}1F 28%, ${currentClub.colors.primary}0A 55%, transparent 100%)`,
            zIndex: 0,
          }}
        />
      )}

      {/* Editorial masthead — unboxed identity + stats */}
      <section className="plm-relative" style={{ zIndex: 1 }}>
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
          The Manager
        </p>
        <div className="plm-mt-3 plm-flex plm-items-center plm-gap-3">
          <div className="plm-relative plm-flex-shrink-0">
            <div
              className="plm-w-14 plm-h-14 plm-rounded-full plm-flex plm-items-center plm-justify-center plm-overflow-hidden plm-border-2"
              style={{
                backgroundColor: currentClub?.colors.primary || '#f3f4f6',
                borderColor: currentClub?.colors.secondary || '#d1d5db',
              }}
            >
              <img
                src={getManagerFaceUri(manager.avatar)}
                alt=""
                aria-hidden="true"
                draggable={false}
                className="plm-w-full plm-h-full plm-object-contain"
              />
            </div>
            {currentClub && getClubLogoUrl(currentClub.id) && (
              <img
                src={getClubLogoUrl(currentClub.id)}
                alt={currentClub.name}
                className="plm-absolute plm--bottom-1 plm--right-1 plm-w-6 plm-h-6 plm-rounded-full plm-bg-white plm-p-0.5 plm-border plm-border-warm-200 plm-object-contain"
              />
            )}
          </div>
          <div className="plm-min-w-0 plm-flex-1">
            <h1 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight plm-truncate">
              {manager.name}
            </h1>
            <p className="plm-font-display plm-italic plm-text-sm plm-text-warm-600 plm-truncate">
              {currentClub ? `Managing ${currentClub.name}` : 'Between clubs'}
            </p>
          </div>
        </div>

        <div className="plm-mt-4 plm-flex plm-flex-wrap plm-gap-x-3 plm-gap-y-1 plm-text-sm plm-text-warm-600">
          <span>{manager.nationality}</span>
          <span aria-hidden>&middot;</span>
          <span>Age {manager.age}</span>
          <span aria-hidden>&middot;</span>
          <span>Rep {manager.reputation}</span>
        </div>

        <div className="plm-mt-3 plm-flex plm-flex-wrap plm-gap-2">
          <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-[0.15em] plm-bg-warm-100 plm-text-warm-700 plm-px-2.5 plm-py-1 plm-rounded-full">
            {PHILOSOPHY_LABELS[manager.philosophy] || manager.philosophy}
          </span>
          <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-[0.15em] plm-bg-warm-100 plm-text-warm-700 plm-px-2.5 plm-py-1 plm-rounded-full">
            {manager.preferredFormation}
          </span>
          <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-[0.15em] plm-bg-warm-100 plm-text-warm-700 plm-px-2.5 plm-py-1 plm-rounded-full">
            {BACKGROUND_LABELS[manager.playingBackground] || manager.playingBackground}
          </span>
        </div>

        {manager.bio && (
          <p className="plm-mt-5 plm-pt-4 plm-border-t plm-border-warm-200 plm-font-display plm-italic plm-text-sm plm-text-warm-600 plm-leading-relaxed">
            &ldquo;{manager.bio}&rdquo;
          </p>
        )}

        {/* Career totals — editorial 4-up stat row */}
        <div className="plm-mt-5 plm-pt-5 plm-border-t plm-border-warm-200 plm-grid plm-grid-cols-2 md:plm-grid-cols-4 plm-divide-x plm-divide-warm-200">
          <ManagerStatBox label="Games" value={manager.totalGamesManaged} />
          <ManagerStatBox label="League Titles" value={manager.totalLeagueTitles} accent={!!manager.totalLeagueTitles && !!accent ? accent : undefined} />
          <ManagerStatBox label="FA Cups" value={manager.totalFaCups} />
          <ManagerStatBox label="Years" value={yearsInManagement} />
        </div>
      </section>

      {/* Manager Card — unboxed centered showpiece */}
      <section className="plm-relative" style={{ zIndex: 1 }}>
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500 plm-mb-3">
          Manager Card
        </p>
        <div className="plm-flex plm-justify-center">
          <ManagerCard
            manager={manager}
            clubName={currentClub?.name}
            clubColors={currentClub?.colors}
            seasonNumber={seasonNumber}
          />
        </div>
      </section>

      {/* Tenures — unboxed editorial list */}
      <section className="plm-relative plm-pt-5 plm-border-t plm-border-warm-200" style={{ zIndex: 1 }}>
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500 plm-mb-3">
          Club Tenures
        </p>
        <div className="plm-space-y-3">
          {manager.tenures.map((tenure, idx) => {
            const tenureClub = clubMap.get(tenure.clubId);
            const isCurrent = idx === manager.tenures.length - 1 && !tenure.endSeason;
            return (
              <div
                key={`${tenure.clubId}-${tenure.startSeason}`}
                className="plm-flex plm-items-start plm-gap-3 plm-py-3 plm-border-b plm-border-warm-200 last:plm-border-b-0"
              >
                {tenureClub && getClubLogoUrl(tenureClub.id) ? (
                  <img
                    src={getClubLogoUrl(tenureClub.id)}
                    alt={tenureClub.name}
                    className="plm-w-8 plm-h-8 plm-rounded-full plm-flex-shrink-0 plm-border-2 plm-bg-white plm-p-0.5 plm-object-contain"
                    style={{ borderColor: tenureClub.colors.secondary }}
                  />
                ) : (
                  <div
                    className="plm-w-8 plm-h-8 plm-rounded-full plm-flex-shrink-0 plm-border-2"
                    style={{
                      backgroundColor: tenureClub?.colors.primary || '#e5e7eb',
                      borderColor: tenureClub?.colors.secondary || '#d1d5db',
                    }}
                  />
                )}
                <div className="plm-flex-1 plm-min-w-0">
                  <div className="plm-flex plm-items-center plm-gap-2">
                    <span className="plm-font-semibold plm-text-sm plm-text-charcoal">
                      {tenureClub?.name || tenure.clubId}
                    </span>
                    {isCurrent && (
                      <span className="plm-text-[10px] plm-bg-green-100 plm-text-green-700 plm-px-1.5 plm-py-0.5 plm-rounded-full plm-font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="plm-text-xs plm-text-warm-500 plm-mt-0.5">
                    Season {tenure.startSeason}{tenure.endSeason ? `–${tenure.endSeason}` : '–present'}
                    {' '}&middot; {tenure.gamesManaged} games
                    {' '}&middot; Best finish: {ordinal(tenure.bestLeagueFinish)}
                  </div>
                  {(tenure.leagueTitles > 0 || tenure.faCups > 0) && (
                    <div className="plm-text-xs plm-text-warm-600 plm-mt-1">
                      {tenure.leagueTitles > 0 && <span>🏆 {tenure.leagueTitles} title{tenure.leagueTitles !== 1 ? 's' : ''}</span>}
                      {tenure.leagueTitles > 0 && tenure.faCups > 0 && ' · '}
                      {tenure.faCups > 0 && <span>🏅 {tenure.faCups} FA Cup{tenure.faCups !== 1 ? 's' : ''}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Honors / Accomplishments — unboxed */}
      {manager.accomplishments.length > 0 && (
        <section className="plm-relative plm-pt-5 plm-border-t plm-border-warm-200" style={{ zIndex: 1 }}>
          <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500 plm-mb-3">
            Honors
          </p>
          <div className="plm-space-y-4">
            {sortedSeasons.map((season) => {
              const accs = accomplishmentsBySeason.get(season)!;
              return (
                <div key={season}>
                  <div className="plm-text-xs plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wide plm-mb-1.5">
                    Season {season}
                  </div>
                  <div className="plm-space-y-1.5">
                    {accs.map((acc) => {
                      const accClub = clubMap.get(acc.clubId);
                      return (
                        <div
                          key={acc.id}
                          className="plm-flex plm-items-center plm-gap-2.5 plm-text-sm"
                        >
                          <span className="plm-text-base" aria-hidden="true">
                            {ACCOMPLISHMENT_ICONS[acc.type] || '•'}
                          </span>
                          <span className="plm-text-charcoal">{acc.headline}</span>
                          {accClub && (
                            <span
                              className="plm-w-3 plm-h-3 plm-rounded-full plm-flex-shrink-0"
                              style={{ backgroundColor: accClub.colors.primary }}
                              title={accClub.name}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !saveSlot}
        className={`plm-w-full plm-py-3.5 plm-rounded-lg plm-font-body plm-font-semibold plm-text-sm plm-transition-all plm-duration-200 plm-min-h-[44px] plm-border ${
          saved
            ? 'plm-bg-emerald-50 plm-border-emerald-300 plm-text-emerald-700'
            : 'plm-bg-charcoal plm-text-white plm-border-charcoal hover:plm-bg-charcoal-light'
        } disabled:plm-opacity-50 disabled:plm-cursor-not-allowed`}
      >
        {saving ? 'Saving...' : saved ? 'Game Saved!' : 'Save Game'}
      </button>

      {/* Resign Button */}
      {onResign && (
        <button
          onClick={() => setResignStep(1)}
          className="plm-w-full plm-py-3 plm-rounded-lg plm-font-body plm-font-semibold plm-text-sm plm-transition-all plm-duration-200 plm-min-h-[44px] plm-border plm-border-red-200 plm-bg-white plm-text-red-700 hover:plm-bg-red-50"
        >
          Resign Position
        </button>
      )}

      {/* Resign confirmation modals */}
      {resignStep > 0 && onResign && (
        <div
          className="plm-fixed plm-inset-0 plm-z-[100] plm-flex plm-items-center plm-justify-center plm-p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setResignStep(0)}
        >
          <div
            className="plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-p-5 plm-max-w-sm plm-w-full plm-shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {resignStep === 1 ? (
              <>
                <h3 className="plm-font-display plm-font-bold plm-text-lg plm-text-charcoal plm-mb-2">
                  Resign from {currentClub?.name}?
                </h3>
                <p className="plm-text-sm plm-text-warm-600 plm-mb-4">
                  Your tenure here will end. Trophies and records remain in your career history, but you'll lose your connection with this squad.
                </p>
                <div className="plm-flex plm-gap-2">
                  <button
                    onClick={() => setResignStep(0)}
                    className="plm-flex-1 plm-py-2.5 plm-rounded plm-border plm-border-warm-200 plm-text-sm plm-font-semibold plm-text-charcoal hover:plm-bg-warm-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setResignStep(2)}
                    className="plm-flex-1 plm-py-2.5 plm-rounded plm-bg-red-600 plm-text-white plm-text-sm plm-font-semibold hover:plm-bg-red-700"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="plm-font-display plm-font-bold plm-text-lg plm-text-charcoal plm-mb-2">
                  Are you sure?
                </h3>
                <p className="plm-text-sm plm-text-warm-600 plm-mb-4">
                  This cannot be undone. You will step down and be asked to choose a new club.
                </p>
                <div className="plm-flex plm-gap-2">
                  <button
                    onClick={() => setResignStep(0)}
                    className="plm-flex-1 plm-py-2.5 plm-rounded plm-border plm-border-warm-200 plm-text-sm plm-font-semibold plm-text-charcoal hover:plm-bg-warm-50"
                  >
                    Stay
                  </button>
                  <button
                    onClick={() => {
                      setResignStep(0);
                      onResign();
                    }}
                    className="plm-flex-1 plm-py-2.5 plm-rounded plm-bg-red-600 plm-text-white plm-text-sm plm-font-semibold hover:plm-bg-red-700"
                  >
                    Resign
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {tutorial.show && <TutorialModal tab="manager" onClose={tutorial.onClose} />}
    </div>
  );
}

function ManagerStatBox({ label, value, accent }: { label: string; value: number; accent?: string }) {
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

function ordinal(n: number): string {
  if (n > 20) return `${n}th`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
