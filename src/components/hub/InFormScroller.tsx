import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useModalParams } from '../../hooks/useModalParams';
import { RetroPlayerCard } from '../shared/RetroPlayerCard';

export function InFormScroller() {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const { openModal } = useModalParams();

  const playerClub = clubs.find((c) => c.id === manager?.clubId);

  const inForm = useMemo(() => {
    if (!playerClub) return [];
    return [...playerClub.roster]
      .filter((p) => !p.isTemporary && !p.injured)
      .sort((a, b) => (b.form - a.form) || (b.overall - a.overall))
      .slice(0, 5);
  }, [playerClub]);

  const browseList = useMemo(() => inForm.map((p) => p.id), [inForm]);

  if (!playerClub) return null;

  return (
    <div>
      <header className="plm-mb-4 plm-pb-3 plm-border-b plm-border-warm-200 plm-flex plm-items-end plm-justify-between plm-gap-3">
        <div className="plm-min-w-0">
          <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
            This Month
          </p>
          <h3 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
            In Form
          </h3>
        </div>
        {inForm.length > 0 && (
          <span className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.15em] plm-text-warm-500 plm-flex-shrink-0 plm-mb-1">
            Top {inForm.length}
          </span>
        )}
      </header>

      {inForm.length === 0 ? (
        <p className="plm-text-xs plm-text-warm-500 plm-italic plm-py-3 plm-text-center">
          No standout form this month.
        </p>
      ) : (
        <div className="plm--mx-4 plm-px-4 plm-overflow-x-auto plm-snap-x plm-snap-mandatory plm-scroll-px-4">
          <ul className="plm-flex plm-gap-3 plm-pb-1 plm-list-none plm-pl-0 plm-m-0" role="list">
            {inForm.map((player) => (
              <li key={player.id} className="plm-snap-start plm-flex-shrink-0">
                <button
                  type="button"
                  onClick={() => openModal(player.id, playerClub.id, browseList)}
                  aria-label={`Open ${player.name} — form ${player.form >= 0 ? '+' : ''}${player.form}, overall ${player.overall}`}
                  className="plm-block plm-rounded-xl focus-visible:plm-outline-none focus-visible:plm-ring-2 focus-visible:plm-ring-charcoal focus-visible:plm-ring-offset-2"
                >
                  <RetroPlayerCard
                    player={player}
                    clubId={playerClub.id}
                    clubName={playerClub.name}
                    clubColors={playerClub.colors}
                    size="sm"
                    disableFlip
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
