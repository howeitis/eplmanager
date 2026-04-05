import type { Mentality } from '../../engine/matchSim';

const MENTALITIES: { id: Mentality; label: string; description: string; atk: number; def: number }[] = [
  { id: 'defensive', label: 'Defensive', description: 'Sit deep, absorb pressure', atk: -3, def: 4 },
  { id: 'balanced', label: 'Balanced', description: 'Measured approach', atk: 0, def: 0 },
  { id: 'attacking', label: 'Attacking', description: 'Push forward aggressively', atk: 4, def: -3 },
];

interface MentalitySelectorProps {
  mentality: Mentality;
  onMentalityChange: (m: Mentality) => void;
}

export function MentalitySelector({ mentality, onMentalityChange }: MentalitySelectorProps) {
  return (
    <div>
      <h3 className="plm-text-xs plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider plm-mb-2">
        Mentality
      </h3>
      <div className="plm-space-y-1.5">
        {MENTALITIES.map((m) => (
          <button
            key={m.id}
            onClick={() => onMentalityChange(m.id)}
            aria-pressed={mentality === m.id}
            aria-label={`${m.label}: ${m.description}`}
            className={`plm-w-full plm-flex plm-items-center plm-justify-between plm-py-2.5 plm-px-3 plm-rounded plm-text-left plm-transition-all plm-min-h-[44px] ${
              mentality === m.id
                ? 'plm-bg-charcoal plm-text-white plm-shadow-sm'
                : 'plm-bg-warm-50 plm-text-warm-700 hover:plm-bg-warm-100 plm-border plm-border-warm-200'
            }`}
          >
            <div>
              <div className="plm-text-sm plm-font-semibold">{m.label}</div>
              <div className={`plm-text-[10px] ${mentality === m.id ? 'plm-text-warm-300' : 'plm-text-warm-400'}`}>
                {m.description}
              </div>
            </div>
            <div className="plm-flex plm-gap-2 plm-text-[10px] plm-font-semibold">
              <span className={mentality === m.id ? (m.atk > 0 ? 'plm-text-emerald-300' : m.atk < 0 ? 'plm-text-red-300' : 'plm-text-warm-400') : (m.atk > 0 ? 'plm-text-emerald-600' : m.atk < 0 ? 'plm-text-red-500' : 'plm-text-warm-500')}>
                ATK {m.atk > 0 ? '+' : ''}{m.atk}
              </span>
              <span className={mentality === m.id ? (m.def > 0 ? 'plm-text-emerald-300' : m.def < 0 ? 'plm-text-red-300' : 'plm-text-warm-400') : (m.def > 0 ? 'plm-text-emerald-600' : m.def < 0 ? 'plm-text-red-500' : 'plm-text-warm-500')}>
                DEF {m.def > 0 ? '+' : ''}{m.def}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
