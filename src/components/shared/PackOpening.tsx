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
            {/* Foil top strip */}
            <FoilStrip position="top" accentColor={clubColors.secondary || '#FFD700'} />

            {/* Inner decorative border */}
            <div
              className="plm-absolute plm-inset-3 plm-border-2 plm-rounded-lg plm-pointer-events-none plm-z-[2]"
              style={{ borderColor: isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)' }}
            />

            {/* Cellophane diagonal sheen */}
            <div
              className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1]"
              style={{
                background:
                  'repeating-linear-gradient(20deg, transparent 0 14px, rgba(255,255,255,0.06) 14px 16px)',
                mixBlendMode: 'overlay',
              }}
              aria-hidden="true"
            />

            {/* Club crest — center anchor, large */}
            <div className="plm-flex-1 plm-flex plm-items-center plm-justify-center plm-w-full plm-px-8 plm-relative plm-z-[3] plm-mt-12">
              {clubId ? (
                <img
                  src={getClubLogoUrl(clubId)}
                  alt={clubName}
                  className="plm-w-52 plm-h-52 plm-object-contain"
                  style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.45))' }}
                />
              ) : (
                <div className="plm-text-7xl" aria-hidden="true">{'\u26BD'}</div>
              )}
            </div>

            {/* Pack title + subtitle — sits above the bottom strip */}
            <div className="plm-flex plm-flex-col plm-items-center plm-gap-1 plm-mb-12 plm-px-4 plm-relative plm-z-[3]">
              <div
                className="plm-font-display plm-text-3xl plm-font-black plm-uppercase plm-tracking-[0.12em] plm-text-center plm-leading-none"
                style={{
                  color: isLight ? '#1A1A1A' : '#FFFFFF',
                  textShadow: isLight
                    ? '0 1px 0 rgba(255,255,255,0.4), 0 0 14px rgba(255,255,255,0.2)'
                    : '0 1px 2px rgba(0,0,0,0.55), 0 0 14px rgba(255,255,255,0.15)',
                }}
              >
                {packTitle}
              </div>
              {packSubtitle && (
                <div
                  className="plm-text-[11px] plm-font-body plm-uppercase plm-tracking-[0.22em] plm-opacity-85 plm-mt-1"
                  style={{ color: isLight ? '#1A1A1A' : '#FFFFFF' }}
                >
                  {packSubtitle}
                </div>
              )}
            </div>

            {/* Foil bottom strip with the card-count badge inset */}
            <FoilStrip position="bottom" accentColor={clubColors.secondary || '#FFD700'}>
              <div className="plm-absolute plm-bottom-2.5 plm-right-3 plm-bg-black/45 plm-rounded-full plm-px-3 plm-py-1 plm-backdrop-blur-sm plm-border plm-border-white/10">
                <span className="plm-text-[10px] plm-font-bold plm-uppercase plm-tracking-widest plm-text-white plm-tabular-nums">
                  {players.length} cards
                </span>
              </div>
            </FoilStrip>
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

// ─── Foil strip — metallic crinkle band like a real Topps/Panini wrapper ───
// Renders as a 38px tall band with a metallic gradient + repeating ridge
// pattern. The bottom strip can host a child element (the card-count badge).
function FoilStrip({
  position,
  accentColor,
  children,
}: {
  position: 'top' | 'bottom';
  accentColor: string;
  children?: React.ReactNode;
}) {
  const STRIP_H = 38;
  const positionStyle =
    position === 'top'
      ? { top: 0, left: 0, right: 0 }
      : { bottom: 0, left: 0, right: 0 };

  return (
    <div
      className="plm-absolute plm-pointer-events-none plm-z-[4] plm-overflow-hidden"
      style={{ ...positionStyle, height: STRIP_H }}
      aria-hidden="true"
    >
      {/* Base metallic gradient */}
      <div
        className="plm-absolute plm-inset-0"
        style={{
          background: `linear-gradient(${position === 'top' ? '180deg' : '0deg'},
            rgba(255,255,255,0.85) 0%,
            ${accentColor} 30%,
            rgba(255,255,255,0.6) 50%,
            ${accentColor} 70%,
            rgba(0,0,0,0.25) 100%)`,
          mixBlendMode: 'overlay',
          opacity: 0.95,
        }}
      />
      {/* Crinkle / rivet pattern — fine vertical ridges */}
      <div
        className="plm-absolute plm-inset-0"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 4px, rgba(255,255,255,0.18) 4px 5px, transparent 5px 8px)',
          mixBlendMode: 'overlay',
        }}
      />
      {/* Tear edge — zigzag along the inner edge */}
      <div
        className="plm-absolute plm-left-0 plm-right-0"
        style={{
          height: 6,
          [position === 'top' ? 'bottom' : 'top']: 0,
          background: `linear-gradient(${position === 'top' ? '180deg' : '0deg'},
            rgba(0,0,0,0.35), transparent)`,
          maskImage:
            'linear-gradient(90deg, transparent, black 4px, black calc(100% - 4px), transparent)',
        }}
      />
      {/* Notched edge — small triangular cuts along the inner side */}
      <svg
        className="plm-absolute plm-left-0 plm-right-0"
        style={{
          [position === 'top' ? 'bottom' : 'top']: -1,
          height: 6,
          width: '100%',
          transform: position === 'top' ? 'none' : 'scaleY(-1)',
        }}
        preserveAspectRatio="none"
        viewBox="0 0 100 6"
      >
        <path
          d="M0 0 L100 0 L100 4 L96 6 L92 4 L88 6 L84 4 L80 6 L76 4 L72 6 L68 4 L64 6 L60 4 L56 6 L52 4 L48 6 L44 4 L40 6 L36 4 L32 6 L28 4 L24 6 L20 4 L16 6 L12 4 L8 6 L4 4 L0 6 Z"
          fill={accentColor}
          opacity="0.8"
        />
      </svg>
      {children}
    </div>
  );
}
