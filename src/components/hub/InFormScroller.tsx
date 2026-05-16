import { useMemo, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useModalParams } from '@/hooks/useModalParams';
import { RetroPlayerCard } from '@/components/shared/RetroPlayerCard';
import { ScrollPipIndicator } from '@/components/shared/ScrollPipIndicator';

export function InFormScroller() {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);
  const { openModal } = useModalParams();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const accent = playerClub.colors?.primary;

  return (
    <div>
      <div className="plm-px-1 plm-flex plm-items-center plm-justify-between plm-mb-2.5">
        <p className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-[0.16em] plm-text-warm-500 plm-m-0">
          In Form
        </p>
        {inForm.length > 0 && (
          <ScrollPipIndicator count={inForm.length} scrollRef={scrollRef} accent={accent} />
        )}
      </div>

      {inForm.length === 0 ? (
        <p className="plm-text-xs plm-text-warm-500 plm-italic plm-py-3 plm-text-center">
          No standout form this month.
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="plm--mx-4 plm-px-4 plm-overflow-x-auto plm-snap-x plm-snap-mandatory plm-scroll-px-4 plm-no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
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
