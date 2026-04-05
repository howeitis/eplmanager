import type { GamePhase } from '../../types/entities';

const PHASE_DISPLAY: Record<GamePhase, { label: string; month: string }> = {
  summer_window: { label: 'Summer Transfer Window', month: 'Pre-Season' },
  august: { label: 'August', month: 'August' },
  september: { label: 'September', month: 'September' },
  october: { label: 'October', month: 'October' },
  november: { label: 'November', month: 'November' },
  december: { label: 'December', month: 'December' },
  january_window: { label: 'January Transfer Window', month: 'January' },
  january: { label: 'January', month: 'January' },
  february: { label: 'February', month: 'February' },
  march: { label: 'March', month: 'March' },
  april: { label: 'April', month: 'April' },
  may: { label: 'May', month: 'May' },
  season_end: { label: 'Season End', month: 'End of Season' },
};

interface PhaseIndicatorProps {
  phase: GamePhase;
  seasonNumber: number;
}

export function PhaseIndicator({ phase, seasonNumber }: PhaseIndicatorProps) {
  const display = PHASE_DISPLAY[phase];
  const startYear = 2025 + (seasonNumber - 1);
  const endYear = startYear + 1;

  const isWindow = phase === 'summer_window' || phase === 'january_window';

  return (
    <div className="plm-flex plm-items-center plm-justify-between">
      <div>
        <h2 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal">
          {display.month}
        </h2>
        <p className="plm-text-xs plm-text-warm-500 plm-font-body plm-mt-0.5">
          Season {seasonNumber} &middot; {startYear}/{endYear.toString().slice(-2)}
        </p>
      </div>
      {isWindow && (
        <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-px-2 plm-py-1 plm-bg-amber-50 plm-text-amber-700 plm-rounded plm-border plm-border-amber-200">
          Window Open
        </span>
      )}
    </div>
  );
}
