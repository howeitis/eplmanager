import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';
import type { ClubData } from '../../types/entities';

interface ClubSelectProps {
  onSelectClub: (club: ClubData) => void;
  onBack: () => void;
}

const TIER_LABELS: Record<number, string> = {
  1: 'Elite',
  2: 'Contender',
  3: 'Established',
  4: 'Mid-Table',
  5: 'Survival',
};

export function ClubSelect({ onSelectClub, onBack }: ClubSelectProps) {
  const groupedByTier = [1, 2, 3, 4, 5].map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    clubs: CLUBS.filter((c) => c.tier === tier),
  }));

  return (
    <div className="plm-min-h-screen plm-bg-gray-50 plm-px-4 plm-py-8">
      <div className="plm-max-w-lg plm-mx-auto">
        <button
          onClick={onBack}
          aria-label="Back to save slots"
          className="plm-text-sm plm-text-gray-500 hover:plm-text-gray-700 plm-mb-4 plm-min-h-[44px] plm-inline-flex plm-items-center"
        >
          &larr; Back
        </button>
        <h1 className="plm-text-2xl plm-font-bold plm-text-gray-900 plm-mb-1">
          Choose Your Club
        </h1>
        <p className="plm-text-gray-500 plm-text-sm plm-mb-6">
          Select a Premier League club to manage
        </p>

        {groupedByTier.map(({ tier, label, clubs }) => (
          <div key={tier} className="plm-mb-6">
            <h2 className="plm-text-xs plm-font-semibold plm-text-gray-400 plm-uppercase plm-tracking-wider plm-mb-2">
              Tier {tier} &mdash; {label}
            </h2>
            <div className="plm-space-y-2">
              {clubs.map((club) => (
                <button
                  key={club.id}
                  onClick={() => onSelectClub(club)}
                  aria-label={`Select ${club.name}, Tier ${tier} ${label}, Budget £${club.budget}M`}
                  className="plm-w-full plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-gray-200 plm-p-3 plm-text-left hover:plm-border-gray-400 plm-transition-colors plm-flex plm-items-center plm-gap-3 plm-min-h-[44px]"
                >
                  <img
                    src={getClubLogoUrl(club.id)}
                    alt={club.shortName}
                    className="plm-w-8 plm-h-8 plm-flex-shrink-0 plm-object-contain"
                  />
                  <div className="plm-flex-1">
                    <div className="plm-font-semibold plm-text-gray-900 plm-text-sm">
                      {club.name}
                    </div>
                    <div className="plm-text-xs plm-text-gray-500">
                      Budget: &pound;{club.budget}M
                    </div>
                  </div>
                  <div className="plm-text-xs plm-text-gray-400 plm-font-mono">
                    {club.shortName}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
