import { useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import type { TransferRecord } from '@/types/entities';

interface TransferHaulModalProps {
  transfers: TransferRecord[];
  onDismiss: () => void;
}

export function TransferHaulModal({ transfers, onDismiss }: TransferHaulModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const clubs = useGameStore((s) => s.clubs);
  const manager = useGameStore((s) => s.manager);
  const budgets = useGameStore((s) => s.budgets);

  const playerClubId = manager?.clubId || '';
  const playerClub = clubs.find((c) => c.id === playerClubId);
  const clubColors = playerClub?.colors;
  const remainingBudget = budgets[playerClubId] || 0;

  // Sort by OVR desc, then Fee desc as tiebreaker
  const sorted = [...transfers].sort((a, b) => {
    if (b.playerOverall !== a.playerOverall) return b.playerOverall - a.playerOverall;
    return b.fee - a.fee;
  });

  const totalSpent = sorted.reduce((sum, t) => sum + t.fee, 0);

  const { handleBackdropClick } = useModalDismiss(dialogRef, onDismiss);

  return (
    <div
      className="plm-fixed plm-inset-0 plm-z-[60] plm-flex plm-items-end md:plm-items-center plm-justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Transfer haul summary"
    >
      {/* Backdrop */}
      <div className="plm-absolute plm-inset-0 plm-bg-black/60 plm-animate-fade-in" />

      {/* Modal body */}
      <div
        ref={dialogRef}
        className={[
          'plm-relative plm-bg-white plm-w-full plm-max-h-[85vh] plm-overflow-y-auto plm-overscroll-contain',
          'plm-rounded-t-2xl plm-pb-6',
          'md:plm-rounded-xl md:plm-max-w-lg md:plm-mx-auto md:plm-pb-6',
          'plm-animate-slide-up',
        ].join(' ')}
      >
        {/* Accent bar */}
        <div
          className="plm-h-1.5 plm-w-full"
          style={{ backgroundColor: clubColors?.primary || '#1a1a2e' }}
        />

        {/* Drag handle (mobile) */}
        <div className="md:plm-hidden plm-flex plm-justify-center plm-pt-3 plm-pb-1">
          <div className="plm-w-10 plm-h-1 plm-rounded-full plm-bg-warm-300" />
        </div>

        <div className="plm-px-5 plm-pt-5">
          {/* Header */}
          <h2 className="plm-font-display plm-text-xl plm-font-bold plm-text-charcoal plm-text-center">
            Transfer Haul
          </h2>
          <p className="plm-text-sm plm-text-warm-500 plm-text-center plm-mt-1">
            {sorted.length} signing{sorted.length !== 1 ? 's' : ''} completed
          </p>

          {/* Transfer rows */}
          <div className="plm-mt-4 plm-space-y-2">
            {sorted.map((t, i) => {
              const fromClub = clubs.find((c) => c.id === t.fromClubId);
              return (
                <div
                  key={`${t.playerId}-${i}`}
                  className="plm-flex plm-items-center plm-gap-3 plm-bg-warm-50 plm-rounded-lg plm-px-4 plm-py-3"
                >
                  {/* Player info */}
                  <div className="plm-flex-1 plm-min-w-0">
                    <div className="plm-flex plm-items-center plm-gap-2">
                      <span className="plm-text-sm plm-font-bold plm-text-charcoal plm-truncate">
                        {t.playerName}
                      </span>
                      <span className="plm-text-xs plm-font-bold plm-text-charcoal plm-bg-warm-200 plm-px-1.5 plm-py-0.5 plm-rounded plm-flex-shrink-0">
                        {t.playerOverall}
                      </span>
                    </div>
                    <div className="plm-flex plm-items-center plm-gap-1.5 plm-mt-0.5">
                      <span className="plm-text-[10px] plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-500">
                        {t.playerPosition}
                      </span>
                      <span className="plm-text-[10px] plm-text-warm-400">&middot;</span>
                      <span className="plm-text-[10px] plm-text-warm-500">Age {t.playerAge}</span>
                      {fromClub && (
                        <>
                          <span className="plm-text-[10px] plm-text-warm-400">&middot;</span>
                          <span className="plm-text-[10px] plm-text-warm-500 plm-truncate">
                            from {fromClub.shortName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Fee */}
                  <span className="plm-text-sm plm-font-bold plm-text-charcoal plm-whitespace-nowrap">
                    &pound;{t.fee.toFixed(1)}M
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer: total spent + remaining budget */}
          <div className="plm-mt-4 plm-border-t plm-border-warm-200 plm-pt-4 plm-space-y-2">
            <div className="plm-flex plm-items-center plm-justify-between">
              <span className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
                Total Spent
              </span>
              <span className="plm-text-base plm-font-bold plm-text-charcoal">
                &pound;{totalSpent.toFixed(1)}M
              </span>
            </div>
            <div className="plm-flex plm-items-center plm-justify-between">
              <span className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
                Remaining Budget
              </span>
              <span className="plm-text-base plm-font-bold plm-text-charcoal">
                &pound;{remainingBudget.toFixed(1)}M
              </span>
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={onDismiss}
            className="plm-mt-5 plm-w-full plm-py-3 plm-px-4 plm-rounded-lg plm-text-sm plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-text-white hover:plm-opacity-90"
            style={{ backgroundColor: clubColors?.primary || '#1a1a2e' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
