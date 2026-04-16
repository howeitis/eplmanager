import { useState, useCallback, useEffect, useRef } from 'react';
import { RetroPlayerCard } from './RetroPlayerCard';
import type { Player } from '../../types/entities';

interface PackOpeningProps {
  players: Player[];
  clubName: string;
  clubColors: { primary: string; secondary: string };
  packTitle: string;
  packSubtitle?: string;
  onComplete: () => void;
}

type PackState = 'intro' | 'shaking' | 'opening' | 'cards';

export function PackOpening({
  players,
  clubName,
  clubColors,
  packTitle,
  packSubtitle,
  onComplete,
}: PackOpeningProps) {
  const [packState, setPackState] = useState<PackState>('intro');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const touchStartRef = useRef<number | null>(null);

  const isLight = isLightColor(clubColors.primary);

  // Transition through pack states
  const handlePackTap = useCallback(() => {
    if (packState === 'intro') {
      setPackState('shaking');
      setTimeout(() => setPackState('opening'), 800);
      setTimeout(() => {
        setPackState('cards');
        setRevealedCards(new Set([0]));
      }, 1200);
    }
  }, [packState]);

  const handleNextCard = useCallback(() => {
    if (packState !== 'cards') return;
    if (currentCardIndex < players.length - 1) {
      const next = currentCardIndex + 1;
      setCurrentCardIndex(next);
      setRevealedCards((prev) => new Set([...prev, next]));
    } else {
      onComplete();
    }
  }, [packState, currentCardIndex, players.length, onComplete]);

  const handlePrevCard = useCallback(() => {
    if (packState !== 'cards') return;
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  }, [packState, currentCardIndex]);

  // Swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNextCard();
      else handlePrevCard();
    }
    touchStartRef.current = null;
  }, [handleNextCard, handlePrevCard]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (packState === 'intro') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePackTap();
        }
      } else if (packState === 'cards') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          handleNextCard();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePrevCard();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onComplete();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [packState, handlePackTap, handleNextCard, handlePrevCard, onComplete]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="plm-fixed plm-inset-0 plm-z-[70] plm-flex plm-flex-col plm-items-center plm-justify-center plm-bg-charcoal/95 plm-animate-fade-in">
      {/* Pack intro + shaking + opening states */}
      {packState !== 'cards' && (
        <div
          className="plm-flex plm-flex-col plm-items-center plm-gap-6 plm-cursor-pointer"
          onClick={handlePackTap}
          role="button"
          tabIndex={0}
          aria-label="Tap to open pack"
        >
          {/* Pack visual */}
          <div
            className={`plm-relative plm-w-48 plm-h-64 md:plm-w-56 md:plm-h-72 plm-rounded-2xl plm-shadow-2xl plm-flex plm-flex-col plm-items-center plm-justify-center plm-border-4 plm-transition-all ${
              packState === 'shaking' ? 'plm-animate-pack-shake' : ''
            } ${packState === 'opening' ? 'plm-animate-pack-burst' : ''}`}
            style={{
              background: `linear-gradient(145deg, ${clubColors.primary}, ${clubColors.secondary || clubColors.primary}dd, ${clubColors.primary})`,
              borderColor: clubColors.secondary || '#FFD700',
            }}
          >
            {/* Pack decoration */}
            <div className="plm-absolute plm-inset-3 plm-border-2 plm-rounded-xl plm-pointer-events-none" style={{ borderColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }} />

            {/* Pack content */}
            <div className="plm-text-4xl plm-mb-2" aria-hidden="true">{'\u26BD'}</div>
            <div
              className="plm-font-display plm-text-lg plm-font-black plm-uppercase plm-tracking-wider plm-text-center plm-px-4 plm-leading-tight"
              style={{ color: isLight ? '#1A1A1A' : '#FFFFFF' }}
            >
              {packTitle}
            </div>
            {packSubtitle && (
              <div
                className="plm-text-xs plm-font-body plm-mt-1 plm-uppercase plm-tracking-wider plm-opacity-80"
                style={{ color: isLight ? '#1A1A1A' : '#FFFFFF' }}
              >
                {packSubtitle}
              </div>
            )}

            {/* Card count badge */}
            <div
              className="plm-absolute plm-bottom-4 plm-bg-black/30 plm-rounded-full plm-px-3 plm-py-1"
            >
              <span className="plm-text-xs plm-font-bold plm-text-white plm-tabular-nums">
                {players.length} cards
              </span>
            </div>
          </div>

          {/* Tap prompt */}
          {packState === 'intro' && (
            <p className="plm-text-warm-400 plm-text-sm plm-font-body plm-animate-pulse">
              Tap to open
            </p>
          )}
        </div>
      )}

      {/* Cards carousel */}
      {packState === 'cards' && players.length > 0 && (
        <div
          className="plm-flex plm-flex-col plm-items-center plm-gap-2 plm-w-full plm-max-w-lg plm-px-4 plm-overflow-y-auto plm-max-h-screen plm-py-4"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Card counter */}
          <div className="plm-text-warm-400 plm-text-xs plm-font-body plm-uppercase plm-tracking-wider">
            {currentCardIndex + 1} / {players.length}
          </div>

          {/* Active card */}
          <div className="plm-flex plm-justify-center" key={currentCardIndex}>
            <RetroPlayerCard
              player={players[currentCardIndex]}
              clubName={clubName}
              clubColors={clubColors}
              size="xl"
              animated={revealedCards.has(currentCardIndex)}
            />
          </div>

          {/* Navigation dots */}
          <div className="plm-flex plm-gap-1.5 plm-mt-1">
            {players.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentCardIndex(idx);
                  setRevealedCards((prev) => new Set([...prev, idx]));
                }}
                className={`plm-w-2.5 plm-h-2.5 plm-rounded-full plm-transition-all plm-min-h-0 plm-min-w-0 ${
                  idx === currentCardIndex
                    ? 'plm-bg-white plm-scale-125'
                    : revealedCards.has(idx)
                    ? 'plm-bg-warm-500'
                    : 'plm-bg-warm-700'
                }`}
                aria-label={`Card ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="plm-flex plm-gap-3 plm-mt-1">
            <button
              onClick={handlePrevCard}
              disabled={currentCardIndex === 0}
              className="plm-px-5 plm-py-2.5 plm-rounded-lg plm-text-sm plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-border plm-border-warm-600 plm-text-warm-400 hover:plm-bg-warm-800 disabled:plm-opacity-30 disabled:plm-cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={handleNextCard}
              className="plm-px-5 plm-py-2.5 plm-rounded-lg plm-text-sm plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-text-white"
              style={{ backgroundColor: clubColors.primary }}
            >
              {currentCardIndex === players.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>

          {/* Skip button */}
          <button
            onClick={onComplete}
            className="plm-text-xs plm-text-warm-500 hover:plm-text-warm-300 plm-underline plm-mt-1 plm-transition-colors"
          >
            Skip all
          </button>
        </div>
      )}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
