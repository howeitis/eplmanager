import { useEffect, useRef, useState } from 'react';
import type { TacticCard } from '@/types/tactics';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface TacticCardUnlockModalProps {
  card: TacticCard | null;
  onDismiss: () => void;
  /** When set, also auto-equip the card via this callback before dismissing. */
  onEquip?: (cardId: string) => void;
}

/**
 * Phase B reveal moment for newly-minted instruction cards. Intentionally
 * lighter than the full PackOpening flow — a single card, a flip, an equip
 * affordance. Extends naturally into a PackOpening integration later.
 */
export function TacticCardUnlockModal({ card, onDismiss, onEquip }: TacticCardUnlockModalProps) {
  const [flipped, setFlipped] = useState(false);
  const [entered, setEntered] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const { handleBackdropClick } = useModalDismiss(dialogRef, onDismiss, { enabled: !!card });

  useEffect(() => {
    if (!card) {
      setFlipped(false);
      setEntered(false);
      return;
    }
    // Tiny stagger so the card animates in cleanly rather than popping.
    const t = window.setTimeout(() => setEntered(true), 30);
    return () => window.clearTimeout(t);
  }, [card]);

  if (!card) return null;

  const isConditional = !!card.effect?.condition;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tactic-unlock-title"
      className="plm-fixed plm-inset-0 plm-z-[60] plm-flex plm-items-center plm-justify-center plm-bg-black/70 plm-backdrop-blur-sm plm-px-4 plm-py-6"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={`plm-w-full plm-max-w-sm plm-relative plm-transition-all plm-duration-300 plm-ease-out ${
          entered ? 'plm-opacity-100 plm-translate-y-0' : 'plm-opacity-0 plm-translate-y-2'
        }`}
      >
        <div className="plm-text-center plm-mb-3">
          <div className="plm-text-[10px] plm-font-bold plm-tracking-[0.3em] plm-uppercase plm-text-amber-300">
            New Tactic Card Unlocked
          </div>
          <h2 id="tactic-unlock-title" className="plm-font-display plm-text-warm-50 plm-text-xl plm-mt-1">
            Instruction Slot
          </h2>
        </div>

        {/* The card itself — uses the same visual treatment as the picker card,
            scaled up. Flips on tap to reveal the condition / effect detail. */}
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? 'Show card front' : 'Show card details'}
          className="plm-relative plm-w-full plm-aspect-[3/4] plm-mb-4 plm-rounded-xl plm-bg-charcoal plm-text-warm-50 plm-shadow-2xl plm-shadow-amber-900/30 plm-overflow-hidden plm-border plm-border-amber-400/50"
        >
          {/* Bronze accent bar */}
          <span
            aria-hidden="true"
            className="plm-absolute plm-bottom-0 plm-left-0 plm-right-0 plm-h-1 plm-bg-gradient-to-r plm-from-amber-700 plm-via-amber-400 plm-to-amber-700"
          />
          {/* Front face */}
          <div className={`plm-absolute plm-inset-0 plm-flex plm-flex-col plm-justify-between plm-p-5 plm-transition-opacity plm-duration-200 ${
            flipped ? 'plm-opacity-0 plm-pointer-events-none' : 'plm-opacity-100'
          }`}>
            <div className="plm-flex plm-items-start plm-justify-between">
              <span className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-widest plm-text-amber-300">
                Instruction
              </span>
              <span className={`plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-wider ${
                isConditional ? 'plm-text-amber-300' : 'plm-text-warm-400'
              }`}>
                {isConditional ? 'Conditional' : 'Always On'}
              </span>
            </div>
            <div>
              <div className="plm-font-display plm-text-3xl plm-font-bold plm-leading-tight">
                {card.name}
              </div>
              <p className="plm-text-sm plm-text-warm-300 plm-mt-3 plm-italic plm-leading-snug">
                {card.description}
              </p>
            </div>
            <div className="plm-text-[10px] plm-text-warm-400 plm-text-center">
              Tap to flip · See effect
            </div>
          </div>
          {/* Back face */}
          <div className={`plm-absolute plm-inset-0 plm-flex plm-flex-col plm-justify-center plm-p-5 plm-gap-3 plm-transition-opacity plm-duration-200 ${
            flipped ? 'plm-opacity-100' : 'plm-opacity-0 plm-pointer-events-none'
          }`}>
            <div className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-widest plm-text-amber-300 plm-text-center">
              Effect
            </div>
            <div className="plm-grid plm-grid-cols-3 plm-gap-2 plm-text-center">
              <StatPill label="ATK" value={card.effect?.atkMod ?? 0} />
              <StatPill label="DEF" value={card.effect?.defMod ?? 0} />
              <StatPill label="FORM" value={card.effect?.formMod ?? 0} />
            </div>
            {isConditional && card.effect?.conditionLabel && (
              <div className="plm-mt-1 plm-rounded plm-bg-amber-400/15 plm-border plm-border-amber-300/30 plm-px-3 plm-py-2">
                <div className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-wider plm-text-amber-300 plm-mb-0.5">
                  Fires In
                </div>
                <div className="plm-text-sm plm-text-warm-50">
                  {card.effect.conditionLabel}
                </div>
              </div>
            )}
            <div className="plm-text-[10px] plm-text-warm-400 plm-text-center plm-mt-1">
              Tap to flip back
            </div>
          </div>
        </button>

        <div className="plm-flex plm-gap-2">
          {onEquip && (
            <button
              type="button"
              onClick={() => { onEquip(card.id); onDismiss(); }}
              className="plm-flex-1 plm-px-4 plm-py-3 plm-rounded plm-bg-amber-400 plm-text-charcoal plm-font-semibold plm-text-sm hover:plm-bg-amber-300 plm-transition-colors"
            >
              Equip Now
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="plm-flex-1 plm-px-4 plm-py-3 plm-rounded plm-bg-warm-200/10 plm-text-warm-100 plm-font-semibold plm-text-sm plm-border plm-border-warm-100/20 hover:plm-bg-warm-200/20 plm-transition-colors"
          >
            Add to Collection
          </button>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  const tone = value > 0
    ? 'plm-text-emerald-300'
    : value < 0
      ? 'plm-text-red-300'
      : 'plm-text-warm-400';
  return (
    <div className="plm-rounded plm-bg-warm-50/5 plm-border plm-border-warm-50/10 plm-py-2">
      <div className="plm-text-[9px] plm-font-bold plm-uppercase plm-tracking-wider plm-text-warm-400 plm-mb-0.5">
        {label}
      </div>
      <div className={`plm-text-xl plm-font-bold plm-tabular-nums ${tone}`}>
        {value > 0 ? '+' : ''}{value}
      </div>
    </div>
  );
}
