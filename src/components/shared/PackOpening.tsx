import { useState, useCallback, useEffect, useRef } from 'react';
import { RetroPlayerCard } from './RetroPlayerCard';
import { getClubLogoUrl } from '../../data/assets';
import type { Player } from '../../types/entities';

interface PackOpeningProps {
  players: Player[];
  clubName: string;
  clubId?: string;
  clubColors: { primary: string; secondary: string };
  packTitle: string;
  packSubtitle?: string;
  onComplete: () => void;
}

type PackState = 'intro' | 'shaking' | 'opening' | 'cards';

// Particle for "pack pull" entrance
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

function generateParticles(count: number, isGold: boolean): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      size: 2 + Math.random() * 4,
      color: isGold
        ? ['#FFD700', '#FFA500', '#FFEC8B', '#FFE4B5'][i % 4]
        : ['#C0C0C0', '#E8E8E8', '#A9A9A9', '#D3D3D3'][i % 4],
      duration: 0.6 + Math.random() * 0.8,
      delay: Math.random() * 0.3,
    });
  }
  return particles;
}

export function PackOpening({
  players,
  clubName,
  clubId,
  clubColors,
  packTitle,
  packSubtitle,
  onComplete,
}: PackOpeningProps) {
  const [packState, setPackState] = useState<PackState>('intro');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  const [showImpact, setShowImpact] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const touchStartRef = useRef<number | null>(null);

  const isLight = isLightColor(clubColors.primary);
  const currentPlayer = players[currentCardIndex];
  const isHighRated = currentPlayer?.overall >= 85;

  // Trigger impact effect when revealing a high-rated card
  useEffect(() => {
    if (packState !== 'cards') return;
    if (!revealedCards.has(currentCardIndex)) return;

    if (isHighRated) {
      setShowImpact(true);
      setParticles(generateParticles(20, true));
      const timer = setTimeout(() => {
        setShowImpact(false);
        setParticles([]);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [packState, currentCardIndex, isHighRated, revealedCards]);

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
    <div
      className={`plm-fixed plm-inset-0 plm-z-[70] plm-flex plm-flex-col plm-items-center plm-justify-center plm-bg-charcoal/95 plm-animate-fade-in ${
        showImpact ? 'plm-animate-screen-shake' : ''
      }`}
    >
      {/* Pack intro + shaking + opening states */}
      {packState !== 'cards' && (
        <div
          className="plm-flex plm-flex-col plm-items-center plm-gap-6 plm-cursor-pointer"
          onClick={handlePackTap}
          role="button"
          tabIndex={0}
          aria-label="Tap to open pack"
        >
          {/* Pack visual — same footprint as an xl player card (w-[21rem] h-[31rem]) */}
          <div
            className={`plm-relative plm-w-[21rem] plm-h-[31rem] plm-rounded-xl plm-shadow-2xl plm-flex plm-flex-col plm-items-center plm-border-4 plm-transition-all plm-overflow-hidden ${
              packState === 'shaking' ? 'plm-animate-pack-shake' : ''
            } ${packState === 'opening' ? 'plm-animate-pack-burst' : ''}`}
            style={{
              background: `linear-gradient(145deg, ${clubColors.primary}, ${clubColors.secondary || clubColors.primary}dd, ${clubColors.primary})`,
              borderColor: clubColors.secondary || '#FFD700',
            }}
          >
            {/* Inner decorative border */}
            <div
              className="plm-absolute plm-inset-3 plm-border-2 plm-rounded-lg plm-pointer-events-none"
              style={{ borderColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)' }}
            />

            {/* EPL Manager logo — top anchor */}
            <div className="plm-flex plm-flex-col plm-items-center plm-mt-10 plm-gap-1.5 plm-relative plm-z-[2]">
              <img
                src="/epl_manager_logo.webp"
                alt="EPL Manager"
                className="plm-w-28 plm-h-28 plm-object-contain plm-drop-shadow-lg"
              />
              <div
                className="plm-font-display plm-text-[11px] plm-font-bold plm-uppercase plm-tracking-[0.18em] plm-opacity-80"
                style={{ color: isLight ? '#1A1A1A' : '#FFFFFF' }}
              >
                Premier League Manager
              </div>
            </div>

            {/* Club crest — center anchor, large */}
            <div className="plm-flex-1 plm-flex plm-items-center plm-justify-center plm-w-full plm-px-8 plm-relative plm-z-[2]">
              {clubId ? (
                <img
                  src={getClubLogoUrl(clubId)}
                  alt={clubName}
                  className="plm-w-44 plm-h-44 plm-object-contain plm-drop-shadow-xl"
                />
              ) : (
                <div className="plm-text-6xl" aria-hidden="true">{'\u26BD'}</div>
              )}
            </div>

            {/* Pack title + subtitle — bottom anchor */}
            <div className="plm-flex plm-flex-col plm-items-center plm-gap-1 plm-mb-10 plm-px-4 plm-relative plm-z-[2]">
              <div
                className="plm-font-display plm-text-2xl plm-font-black plm-uppercase plm-tracking-wider plm-text-center plm-leading-tight"
                style={{
                  color: isLight ? '#1A1A1A' : '#FFFFFF',
                  textShadow: isLight ? '0 1px 0 rgba(255,255,255,0.3)' : '0 1px 2px rgba(0,0,0,0.45)',
                }}
              >
                {packTitle}
              </div>
              {packSubtitle && (
                <div
                  className="plm-text-[11px] plm-font-body plm-uppercase plm-tracking-[0.16em] plm-opacity-75"
                  style={{ color: isLight ? '#1A1A1A' : '#FFFFFF' }}
                >
                  {packSubtitle}
                </div>
              )}
            </div>

            {/* Card count badge */}
            <div className="plm-absolute plm-bottom-4 plm-right-4 plm-bg-black/30 plm-rounded-full plm-px-3 plm-py-1">
              <span className="plm-text-[11px] plm-font-bold plm-text-white plm-tabular-nums">
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
          className="plm-flex plm-flex-col plm-items-center plm-gap-2 plm-w-full plm-max-w-lg plm-px-4 plm-overflow-y-auto plm-max-h-screen plm-py-4 plm-relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Particle effects for high-rated card reveals */}
          {particles.length > 0 && (
            <div className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-30 plm-overflow-hidden">
              {particles.map((p) => (
                <div
                  key={p.id}
                  className="plm-absolute plm-rounded-full"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                    animation: `plm-particle-burst ${p.duration}s ease-out ${p.delay}s forwards`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>
          )}

          {/* Card counter */}
          <div className="plm-text-warm-400 plm-text-xs plm-font-body plm-uppercase plm-tracking-wider">
            {currentCardIndex + 1} / {players.length}
          </div>

          {/* Active card */}
          <div className="plm-flex plm-justify-center" key={currentCardIndex}>
            <RetroPlayerCard
              player={players[currentCardIndex]}
              clubId={clubId}
              clubName={clubName}
              clubColors={clubColors}
              size="xl"
              animated={revealedCards.has(currentCardIndex)}
              disableFlip
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
