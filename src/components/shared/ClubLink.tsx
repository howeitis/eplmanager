import { useGameStore } from '../../store/gameStore';
import { useNavigation } from '../../hooks/useNavigation';
import { CLUBS } from '../../data/clubs';
import { getClubLogoUrl } from '../../data/assets';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

interface ClubLinkProps {
  clubId: string;
  short?: boolean;
  showDot?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ClubLink({ clubId, short, showDot = true, className, children }: ClubLinkProps) {
  const manager = useGameStore((s) => s.manager);
  const { navigateToClub } = useNavigation();
  const club = clubDataMap.get(clubId);

  if (!club) return null;

  const label = children ?? (short ? club.shortName : club.name);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToClub(clubId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigateToClub(clubId);
    }
  };

  const isPlayerClub = clubId === manager?.clubId;

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`plm-inline-flex plm-items-center plm-gap-1.5 plm-text-left plm-cursor-pointer plm-bg-transparent plm-border-0 plm-p-0 plm-font-inherit plm-text-inherit hover:plm-underline plm-underline-offset-2 plm-transition-colors ${className || ''}`}
      aria-label={`View ${club.name} squad`}
      title={isPlayerClub ? 'View your squad' : `Browse ${club.name}'s squad`}
    >
      {showDot && (
        <img
          src={getClubLogoUrl(clubId)}
          alt=""
          className="plm-w-4 plm-h-4 plm-flex-shrink-0 plm-object-contain"
          aria-hidden="true"
        />
      )}
      <span className="plm-truncate">{label}</span>
    </button>
  );
}
