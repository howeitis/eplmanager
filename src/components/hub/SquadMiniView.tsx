import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Player, Position } from '../../types/entities';

const POSITION_ORDER: Position[] = ['GK', 'CB', 'FB', 'MF', 'WG', 'ST'];

function getFormBadge(form: number): { label: string; color: string } {
  if (form >= 3) return { label: 'Hot', color: 'plm-text-emerald-600 plm-bg-emerald-50' };
  if (form >= 1) return { label: 'Good', color: 'plm-text-emerald-600 plm-bg-emerald-50' };
  if (form <= -3) return { label: 'Cold', color: 'plm-text-red-600 plm-bg-red-50' };
  if (form <= -1) return { label: 'Poor', color: 'plm-text-red-600 plm-bg-red-50' };
  return { label: '', color: '' };
}

export function SquadMiniView() {
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);

  const playerClub = clubs.find((c) => c.id === manager?.clubId);

  const roster = useMemo(() => {
    if (!playerClub) return [];
    return [...playerClub.roster]
      .filter((p) => !p.isTemporary)
      .sort((a, b) => {
        const posA = POSITION_ORDER.indexOf(a.position);
        const posB = POSITION_ORDER.indexOf(b.position);
        if (posA !== posB) return posA - posB;
        return b.overall - a.overall;
      });
  }, [playerClub]);

  if (!playerClub) return null;

  const injuredCount = roster.filter((p) => p.injured).length;

  return (
    <div>
      <div className="plm-flex plm-items-center plm-justify-between plm-mb-2">
        <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal">
          Squad
        </h3>
        <div className="plm-flex plm-gap-3 plm-text-xs plm-text-warm-500">
          <span>{roster.length} players</span>
          {injuredCount > 0 && (
            <span className="plm-text-red-600">{injuredCount} injured</span>
          )}
        </div>
      </div>
      <div className="plm-space-y-0.5">
        {roster.slice(0, 8).map((player) => (
          <MiniPlayerRow key={player.id} player={player} />
        ))}
        {roster.length > 8 && (
          <p className="plm-text-[11px] plm-text-warm-400 plm-text-center plm-pt-1">
            +{roster.length - 8} more
          </p>
        )}
      </div>
    </div>
  );
}

function MiniPlayerRow({ player }: { player: Player }) {
  const formBadge = getFormBadge(player.form);

  return (
    <div className={`plm-flex plm-items-center plm-gap-2 plm-py-1.5 plm-px-2 plm-rounded ${
      player.injured ? 'plm-opacity-50' : ''
    }`}>
      <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-text-warm-400 plm-w-5 plm-text-center plm-tracking-wider">
        {player.position}
      </span>
      <span className="plm-text-sm plm-text-charcoal plm-flex-1 plm-truncate">
        {player.name}
      </span>
      {player.injured && (
        <span
          className="plm-text-[10px] plm-text-red-500 plm-font-medium plm-tabular-nums"
          title={`Out ${player.injuryWeeks} month${player.injuryWeeks === 1 ? '' : 's'}`}
        >
          INJ {player.injuryWeeks}m
        </span>
      )}
      {formBadge.label && !player.injured && (
        <span className={`plm-text-[9px] plm-font-semibold plm-px-1 plm-py-0.5 plm-rounded ${formBadge.color}`}>
          {formBadge.label}
        </span>
      )}
      <span className="plm-text-xs plm-font-bold plm-text-warm-700 plm-tabular-nums plm-w-5 plm-text-right">
        {player.overall}
      </span>
    </div>
  );
}
