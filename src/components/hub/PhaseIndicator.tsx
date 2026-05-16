import type { GamePhase } from '@/types/entities';

const PHASE_DISPLAY: Record<GamePhase, { label: string; month: string }> = {
  summer_window: { label: 'Summer Transfer Window', month: 'Pre-Season' },
  july_advance: { label: 'July', month: 'July' },
  august: { label: 'August', month: 'August' },
  august_deadline: { label: 'Transfer Deadline Day', month: 'August' },
  september: { label: 'September', month: 'September' },
  october: { label: 'October', month: 'October' },
  november: { label: 'November', month: 'November' },
  december: { label: 'December', month: 'December' },
  january_window: { label: 'January Transfer Window', month: 'January' },
  january: { label: 'January', month: 'January' },
  january_deadline: { label: 'Transfer Deadline Day', month: 'January' },
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
  const startYear = 2026 + (seasonNumber - 1);
  const endYear = startYear + 1;

  const isWindow = phase === 'summer_window' || phase === 'july_advance'
    || phase === 'august_deadline' || phase === 'january_window'
    || phase === 'january_deadline';

  return (
    <div className="plm-flex plm-items-start plm-justify-between plm-gap-3">
      <div className="plm-min-w-0">
        <p className="plm-text-[10px] plm-font-medium plm-uppercase plm-tracking-[0.18em] plm-text-warm-500">
          Season {seasonNumber} &middot; {startYear}/{endYear.toString().slice(-2)}
        </p>
        <h2 className="plm-font-display plm-text-3xl plm-font-bold plm-text-charcoal plm-leading-tight plm-mt-0.5">
          {display.month}
        </h2>
      </div>
      {isWindow && (
        <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-[0.18em] plm-px-2.5 plm-py-1 plm-bg-amber-50 plm-text-amber-700 plm-rounded-full plm-border plm-border-amber-200 plm-flex-shrink-0 plm-mt-1">
          Window Open
        </span>
      )}
    </div>
  );
}
