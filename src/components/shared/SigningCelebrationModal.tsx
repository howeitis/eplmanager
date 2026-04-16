import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { isRival } from '../../engine/transfers';
import { RetroPlayerCard } from './RetroPlayerCard';
import { Confetti } from './Confetti';
import type { Player, Club } from '../../types/entities';

export interface SigningCelebrationData {
  player: Player;
  fee: number;
  fromClubId: string;
  fromClubName: string;
}

interface SigningCelebrationModalProps {
  data: SigningCelebrationData;
  onDismiss: () => void;
}

function getFlavorLine(
  player: Player,
  fee: number,
  marketValue: number,
  buyerClub: Club,
  fromClubId: string,
  clubs: Club[],
): string {
  // Priority order: Derby raid > Star > Flop-risk > Young prospect > Bargain > Veteran > Default
  const lines: { condition: boolean; line: string }[] = [
    {
      condition: isRival(buyerClub.id, fromClubId, clubs),
      line: `Straight from the enemy's camp. ${player.name} trades ${clubs.find((c) => c.id === fromClubId)?.name || 'rival'} colors for ${buyerClub.name}.`,
    },
    {
      condition: player.overall >= 80,
      line: `A statement signing. ${player.name} joins ${buyerClub.name} in a deal that will be talked about for years.`,
    },
    {
      condition: player.overall <= 70 && fee >= 20,
      line: `A gamble. The pressure is on ${player.name} to justify the price tag.`,
    },
    {
      condition: player.age <= 21,
      line: `The future is ${player.name}. Scouts have been tracking him for seasons.`,
    },
    {
      condition: fee < marketValue,
      line: `A coup in the market. ${buyerClub.name} landed ${player.name} for well below his valuation.`,
    },
    {
      condition: player.age >= 32,
      line: `One last ride. ${player.name} brings experience and leadership to ${buyerClub.name}.`,
    },
  ];

  const matched = lines.find((l) => l.condition);
  if (matched) return matched.line;

  // Default
  return `${player.name} joins ${buyerClub.name}. The squad is stronger today than yesterday.`;
}

export function SigningCelebrationModal({ data, onDismiss }: SigningCelebrationModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const clubs = useGameStore((s) => s.clubs);
  const manager = useGameStore((s) => s.manager);
  const playerClubId = manager?.clubId || '';
  const buyerClub = clubs.find((c) => c.id === playerClubId);

  const marketValue = data.player.value;
  const flavorLine = buyerClub
    ? getFlavorLine(data.player, data.fee, marketValue, buyerClub, data.fromClubId, clubs)
    : `${data.player.name} has signed. The squad grows stronger.`;

  // Focus trap + Esc handler — Esc does NOT dismiss (must click Continue)
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => {
      const btn = dialogRef.current?.querySelector<HTMLElement>('button');
      btn?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [onDismiss]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  const clubColors = buyerClub?.colors;
  const isGoldSigning = data.player.overall >= 80;

  return (
    <>
    {isGoldSigning && <Confetti count={60} duration={3000} />}
    <div
      className="plm-fixed plm-inset-0 plm-z-[60] plm-flex plm-items-end md:plm-items-center plm-justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Signing celebration for ${data.player.name}`}
    >
      {/* Backdrop */}
      <div className="plm-absolute plm-inset-0 plm-bg-black/60 plm-animate-fade-in" />

      {/* Modal body */}
      <div
        ref={dialogRef}
        className={[
          'plm-relative plm-bg-white plm-w-full plm-overflow-hidden',
          // Mobile: bottom sheet
          'plm-rounded-t-2xl plm-pb-6',
          // Desktop: centered modal
          'md:plm-rounded-xl md:plm-max-w-md md:plm-mx-auto md:plm-pb-6',
          // Entrance animation
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

        <div className="plm-px-6 plm-pt-5 plm-text-center">
          {/* Headline */}
          <h2 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-leading-tight">
            Welcome to {buyerClub?.name || 'the Club'}!
          </h2>

          {/* Player card — xl for gold signings */}
          <div className="plm-mt-5 plm-flex plm-justify-center plm-overflow-x-hidden">
            <div className={isGoldSigning ? 'plm-scale-[0.72] plm-origin-top' : ''}>
              <RetroPlayerCard
                player={data.player}
                clubId={buyerClub?.id}
                clubName={buyerClub?.name}
                clubColors={buyerClub?.colors}
                size={isGoldSigning ? 'xl' : 'md'}
                animated
              />
            </div>
          </div>

          {/* Fee */}
          <div className="plm-mt-4 plm-flex plm-items-center plm-justify-center plm-gap-2">
            <span className="plm-text-xs plm-font-semibold plm-uppercase plm-tracking-wider plm-text-warm-400">
              Fee
            </span>
            <span className="plm-text-lg plm-font-bold plm-text-charcoal">
              &pound;{data.fee.toFixed(1)}M
            </span>
          </div>

          {/* Flavor line */}
          <p className="plm-mt-4 plm-text-sm plm-text-warm-600 plm-italic plm-leading-relaxed plm-max-w-xs plm-mx-auto">
            {flavorLine}
          </p>

          {/* Continue button */}
          <button
            onClick={onDismiss}
            className="plm-mt-6 plm-w-full plm-py-3 plm-px-4 plm-rounded-lg plm-text-sm plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-text-white hover:plm-opacity-90"
            style={{ backgroundColor: clubColors?.primary || '#1a1a2e' }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
