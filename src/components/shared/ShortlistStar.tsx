import { useGameStore } from '../../store/gameStore';

interface ShortlistStarProps {
  playerId: string;
  className?: string;
}

export function ShortlistStar({ playerId, className }: ShortlistStarProps) {
  const shortlist = useGameStore((s) => s.shortlist);
  if (!shortlist.includes(playerId)) return null;
  return (
    <span
      className={`plm-text-amber-500 plm-flex-shrink-0 ${className || 'plm-text-xs'}`}
      aria-label="Shortlisted"
      title="Shortlisted"
    >
      ★
    </span>
  );
}
