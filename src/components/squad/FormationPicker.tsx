import type { Formation } from '../../engine/matchSim';
import type { Player } from '../../types/entities';
import { useGameStore } from '../../store/gameStore';

const FORMATIONS: { id: Formation; label: string; description: string }[] = [
  { id: '4-4-2', label: '4-4-2', description: 'Balanced classic' },
  { id: '4-3-3', label: '4-3-3', description: 'Attacking width' },
  { id: '3-5-2', label: '3-5-2', description: 'Midfield control' },
  { id: '4-2-3-1', label: '4-2-3-1', description: 'Creative attack' },
  { id: '5-3-2', label: '5-3-2', description: 'Defensive solidity' },
  { id: '3-4-3', label: '3-4-3', description: 'All-out attack' },
];

const FORMATION_MODIFIERS: Record<Formation, { atk: number; def: number }> = {
  '4-4-2': { atk: 0, def: 0 },
  '4-3-3': { atk: 3, def: -1 },
  '3-5-2': { atk: 1, def: 2 },
  '4-2-3-1': { atk: 2, def: 1 },
  '5-3-2': { atk: -1, def: 4 },
  '3-4-3': { atk: 4, def: -2 },
};

interface FormationPickerProps {
  formation: Formation;
  onFormationChange: (f: Formation) => void;
  roster: Player[];
}

export function FormationPicker({ formation, onFormationChange }: FormationPickerProps) {
  const preferredFormation = useGameStore((s) => s.manager?.preferredFormation);
  const mod = FORMATION_MODIFIERS[formation];

  return (
    <div>
      <h3 className="plm-text-xs plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-mb-2">
        Formation
      </h3>
      <div className="plm-grid plm-grid-cols-3 plm-gap-1.5">
        {FORMATIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFormationChange(f.id)}
            aria-pressed={formation === f.id}
            aria-label={`Formation ${f.label}: ${f.description}`}
            className={`plm-py-2 plm-px-2 plm-rounded plm-text-center plm-transition-all plm-min-h-[44px] ${
              formation === f.id
                ? 'plm-bg-charcoal plm-text-white plm-shadow-sm'
                : 'plm-bg-warm-50 plm-text-warm-700 hover:plm-bg-warm-100 plm-border plm-border-warm-200'
            }`}
          >
            <div className="plm-text-sm plm-font-bold plm-tabular-nums">
              {f.label}{f.id === preferredFormation ? ' ★' : ''}
            </div>
            <div className={`plm-text-[9px] ${formation === f.id ? 'plm-text-warm-300' : 'plm-text-warm-400'}`}>
              {f.description}
            </div>
          </button>
        ))}
      </div>
      <div className="plm-flex plm-gap-3 plm-mt-2 plm-text-[10px]">
        <span className={`plm-font-semibold ${mod.atk > 0 ? 'plm-text-emerald-600' : mod.atk < 0 ? 'plm-text-red-500' : 'plm-text-warm-500'}`}>
          ATK {mod.atk > 0 ? '+' : ''}{mod.atk}
        </span>
        <span className={`plm-font-semibold ${mod.def > 0 ? 'plm-text-emerald-600' : mod.def < 0 ? 'plm-text-red-500' : 'plm-text-warm-500'}`}>
          DEF {mod.def > 0 ? '+' : ''}{mod.def}
        </span>
        {formation === preferredFormation && (
          <span className="plm-font-semibold plm-text-amber-600">★ +1 ATK, +1 DEF</span>
        )}
      </div>
    </div>
  );
}
