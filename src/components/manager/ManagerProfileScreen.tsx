import { useGameStore } from '../../store/gameStore';
import { CLUBS } from '../../data/clubs';

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

export function ManagerProfileScreen() {
  const manager = useGameStore((s) => s.manager);
  const seasonNumber = useGameStore((s) => s.seasonNumber);

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

  return (
    <div className="plm-space-y-6">
      {/* Header */}
      <div className="plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-p-5">
        <div className="plm-flex plm-items-start plm-gap-4">
          <div
            className="plm-w-16 plm-h-16 plm-rounded-full plm-flex plm-items-center plm-justify-center plm-text-3xl plm-border-2 plm-flex-shrink-0"
            style={{
              backgroundColor: currentClub?.colors.primary || '#f3f4f6',
              borderColor: currentClub?.colors.secondary || '#d1d5db',
            }}
          >
            {manager.avatar}
          </div>
          <div className="plm-min-w-0">
            <h1 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal">
              {manager.name}
            </h1>
            <div className="plm-flex plm-flex-wrap plm-gap-x-3 plm-gap-y-1 plm-mt-1 plm-text-sm plm-text-warm-600">
              <span>{manager.nationality}</span>
              <span>&middot;</span>
              <span>Age {manager.age}</span>
              <span>&middot;</span>
              <span>Rep {manager.reputation}</span>
            </div>
            <div className="plm-flex plm-flex-wrap plm-gap-2 plm-mt-2">
              <span className="plm-text-xs plm-bg-warm-100 plm-text-warm-700 plm-px-2 plm-py-0.5 plm-rounded-full">
                {PHILOSOPHY_LABELS[manager.philosophy] || manager.philosophy}
              </span>
              <span className="plm-text-xs plm-bg-warm-100 plm-text-warm-700 plm-px-2 plm-py-0.5 plm-rounded-full">
                {manager.preferredFormation}
              </span>
              <span className="plm-text-xs plm-bg-warm-100 plm-text-warm-700 plm-px-2 plm-py-0.5 plm-rounded-full">
                {BACKGROUND_LABELS[manager.playingBackground] || manager.playingBackground}
              </span>
            </div>
          </div>
        </div>

        {manager.bio && (
          <p className="plm-mt-4 plm-text-sm plm-text-warm-600 plm-italic plm-border-t plm-border-warm-100 plm-pt-3">
            &ldquo;{manager.bio}&rdquo;
          </p>
        )}
      </div>

      {/* Career Totals */}
      <div className="plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-p-5">
        <h2 className="plm-font-display plm-font-bold plm-text-charcoal plm-mb-3">Career Totals</h2>
        <div className="plm-grid plm-grid-cols-2 md:plm-grid-cols-4 plm-gap-4">
          <StatCard label="Games Managed" value={manager.totalGamesManaged} />
          <StatCard label="League Titles" value={manager.totalLeagueTitles} />
          <StatCard label="FA Cups" value={manager.totalFaCups} />
          <StatCard label="Years in Management" value={yearsInManagement} />
        </div>
      </div>

      {/* Tenures */}
      <div className="plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-p-5">
        <h2 className="plm-font-display plm-font-bold plm-text-charcoal plm-mb-3">Club Tenures</h2>
        <div className="plm-space-y-3">
          {manager.tenures.map((tenure, idx) => {
            const tenureClub = clubMap.get(tenure.clubId);
            const isCurrent = idx === manager.tenures.length - 1 && !tenure.endSeason;
            return (
              <div
                key={`${tenure.clubId}-${tenure.startSeason}`}
                className="plm-flex plm-items-start plm-gap-3 plm-p-3 plm-rounded-lg plm-border plm-border-warm-100"
              >
                <div
                  className="plm-w-8 plm-h-8 plm-rounded-full plm-flex-shrink-0 plm-border-2"
                  style={{
                    backgroundColor: tenureClub?.colors.primary || '#e5e7eb',
                    borderColor: tenureClub?.colors.secondary || '#d1d5db',
                  }}
                />
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
      </div>

      {/* Honors / Accomplishments */}
      {manager.accomplishments.length > 0 && (
        <div className="plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-p-5">
          <h2 className="plm-font-display plm-font-bold plm-text-charcoal plm-mb-3">Honors</h2>
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
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="plm-text-center">
      <div className="plm-text-2xl plm-font-display plm-font-bold plm-text-charcoal">{value}</div>
      <div className="plm-text-xs plm-text-warm-500">{label}</div>
    </div>
  );
}

function ordinal(n: number): string {
  if (n > 20) return `${n}th`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
