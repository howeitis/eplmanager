import { useState, useCallback, useEffect, useRef } from 'react';
import { RetroPlayerCard } from './RetroPlayerCard';
import { getClubLogoUrl } from '@/data/assets';
import { CLUBS } from '@/data/clubs';
import type { Player } from '@/types/entities';

const CLUB_BY_ID = new Map(CLUBS.map((c) => [c.id, c]));

interface PackOpeningProps {
  players: Player[];
  clubName: string;
  clubId?: string;
  clubColors: { primary: string; secondary: string };
  packTitle: string;
  packSubtitle?: string;
  /**
   * Optional per-card club IDs that override the pack-level clubId when
   * rendering each card. Length should match players[]; missing/undefined
   * entries fall back to the pack-level clubId. Used by Team-of-the-Season
   * packs where each card represents a different club's player.
   */
  perCardClubIds?: string[];
  /** Render variant for the cards inside the pack.
   *  - 'normal' (default) → no extra treatment
   *  - 'retired' → desaturated card + RETIRED sash
   *  - 'tier-up' → celebratory RISER stamp + impact burst on every reveal,
   *    used by the Risers pack at season wrap. */
  cardVariant?: 'normal' | 'retired' | 'tier-up';
  /**
   * Optional override for the large logo painted onto the pack wrapper on
   * the intro screen. Defaults to `getClubLogoUrl(clubId)`. The TOTS pack
   * uses this to swap the user's club crest for the Premier League shield.
   */
  coverLogoUrl?: string;
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
  perCardClubIds,
  cardVariant = 'normal',
  coverLogoUrl,
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
  const isTierUp = cardVariant === 'tier-up';

  // Trigger impact effect when revealing a celebratory card. Fires on every
  // tier-up card (the Risers pack — each card is *the* moment); high-rated
  // cards (85+ OVR) still get it in normal/retired packs.
  useEffect(() => {
    if (packState !== 'cards') return;
    if (!revealedCards.has(currentCardIndex)) return;

    if (isHighRated || isTierUp) {
      setShowImpact(true);
      setParticles(generateParticles(isTierUp ? 28 : 20, true));
      const timer = setTimeout(() => {
        setShowImpact(false);
        setParticles([]);
      }, isTierUp ? 1400 : 1200);
      return () => clearTimeout(timer);
    }
  }, [packState, currentCardIndex, isHighRated, isTierUp, revealedCards]);

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
      className={`plm-fixed plm-inset-0 plm-z-[70] plm-flex plm-flex-col plm-items-center plm-justify-center plm-bg-charcoal plm-animate-fade-in ${
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
            className={`plm-relative plm-w-[21rem] plm-h-[31rem] plm-rounded-xl plm-flex plm-flex-col plm-items-center plm-border-[3px] plm-transition-all plm-overflow-hidden ${
              packState === 'shaking' ? 'plm-animate-pack-shake' : ''
            } ${packState === 'opening' ? 'plm-animate-pack-burst' : ''}`}
            style={{
              background: `linear-gradient(145deg, ${clubColors.primary}, ${clubColors.secondary || clubColors.primary}dd, ${clubColors.primary})`,
              // Silver trim — subtle gradient so the edge catches light.
              borderImage:
                'linear-gradient(135deg, #f4f6f8 0%, #c8cdd2 25%, #ffffff 50%, #aab0b6 75%, #e6e9ec 100%) 1',
              borderColor: '#c8cdd2',
              boxShadow:
                '0 30px 60px -12px rgba(0,0,0,0.55), 0 18px 36px -18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.25)',
            }}
          >
            {/* Silver foil top strip */}
            <FoilStrip position="top" />

            {/* Inner decorative border */}
            <div
              className="plm-absolute plm-inset-3 plm-rounded-lg plm-pointer-events-none plm-z-[2]"
              style={{
                border: '1.5px solid rgba(255,255,255,0.55)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.25)',
              }}
            />

            {/* Cellophane diagonal pinstripe */}
            <div
              className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[1]"
              style={{
                background:
                  'repeating-linear-gradient(20deg, transparent 0 14px, rgba(255,255,255,0.06) 14px 16px)',
                mixBlendMode: 'overlay',
              }}
              aria-hidden="true"
            />

            {/* Specular highlight — soft sweep across the upper-left quadrant */}
            <div
              className="plm-absolute plm-inset-0 plm-pointer-events-none plm-z-[2]"
              style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 25% 20%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 35%, transparent 65%)',
                mixBlendMode: 'screen',
              }}
              aria-hidden="true"
            />

            {/* Slow diagonal sheen sweep — polished foil shimmer */}
            <div
              className="plm-absolute plm-inset-0 plm-pointer-events-none plm-overflow-hidden plm-z-[2]"
              aria-hidden="true"
            >
              <div
                className="plm-absolute plm-top-0 plm-h-full plm-w-1/3 plm-animate-shimmer"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
                  filter: 'blur(2px)',
                }}
              />
            </div>

            {/* Pack cover logo — center anchor, large. `coverLogoUrl`
                wins if provided (Team-of-the-Season packs paint the
                Premier League shield here); otherwise we fall back to
                the pack's clubId crest, with the soccer-ball emoji as
                the last-resort empty state. */}
            <div className="plm-flex-1 plm-flex plm-items-center plm-justify-center plm-w-full plm-px-8 plm-relative plm-z-[3] plm-mt-12">
              {coverLogoUrl ? (
                <img
                  src={coverLogoUrl}
                  alt={clubName}
                  className="plm-w-52 plm-h-52 plm-object-contain"
                  style={{
                    filter:
                      'drop-shadow(0 10px 22px rgba(0,0,0,0.55)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                  }}
                />
              ) : clubId ? (
                <img
                  src={getClubLogoUrl(clubId)}
                  alt={clubName}
                  className="plm-w-52 plm-h-52 plm-object-contain"
                  style={{
                    filter:
                      'drop-shadow(0 10px 22px rgba(0,0,0,0.55)) drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                  }}
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

            {/* Silver foil bottom strip with the card-count badge inset */}
            <FoilStrip position="bottom">
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

          {/* Active card — no key on currentCardIndex so React reuses the
              same DOM node when paging between cards. That avoids the
              unmount/remount cycle that previously caused a brief opacity-0
              frame (plm-animate-card-flip starts invisible) and bled the
              SeasonEnd page through the overlay as a white flash.
              `animated` is wired to the *first reveal only* (revealedCards
              size 1) so card 0 still gets its dramatic flip-in after the
              pack burst; every subsequent next/prev navigation re-uses the
              same DOM element with no className flip and no animation
              restart. */}
          <div className="plm-flex plm-justify-center">
            {(() => {
              const cardClubId = perCardClubIds?.[currentCardIndex] ?? clubId;
              const cardClub = cardClubId ? CLUB_BY_ID.get(cardClubId) : null;
              const cardClubName = cardClub?.name ?? clubName;
              const cardClubColors = cardClub?.colors ?? clubColors;
              return (
                <RetroPlayerCard
                  player={players[currentCardIndex]}
                  clubId={cardClubId}
                  clubName={cardClubName}
                  clubColors={cardClubColors}
                  size="xl"
                  animated={revealedCards.size === 1 && currentCardIndex === 0}
                  disableFlip
                  retired={cardVariant === 'retired'}
                  tierUp={cardVariant === 'tier-up'}
                />
              );
            })()}
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

// ─── Silver foil strip — metallic crinkle band like a real Topps/Panini wrapper ───
// Renders as a 42px tall band with a true silver palette: bright highlight
// running through the middle, darker shoulders, vertical crinkle ridges, and
// a soft inner shadow that gives the strip a slight 3D bevel. The bottom strip
// can host a child element (the card-count badge).
function FoilStrip({
  position,
  children,
}: {
  position: 'top' | 'bottom';
  children?: React.ReactNode;
}) {
  const STRIP_H = 42;
  const positionStyle =
    position === 'top'
      ? { top: 0, left: 0, right: 0 }
      : { bottom: 0, left: 0, right: 0 };

  // Inner-edge shading direction: top strip shadows on its bottom edge so it
  // reads as a raised lip; bottom strip shadows on its top edge for symmetry.
  const innerShadow =
    position === 'top'
      ? 'inset 0 -3px 6px -2px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.65)'
      : 'inset 0 3px 6px -2px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(255,255,255,0.5)';

  return (
    <div
      className="plm-absolute plm-pointer-events-none plm-z-[4] plm-overflow-hidden"
      style={{
        ...positionStyle,
        height: STRIP_H,
        boxShadow: innerShadow,
      }}
      aria-hidden="true"
    >
      {/* Base silver gradient — bright center band, darker shoulders. */}
      <div
        className="plm-absolute plm-inset-0"
        style={{
          background: `linear-gradient(${position === 'top' ? '180deg' : '0deg'},
            #8a8e92 0%,
            #c0c4c8 18%,
            #f4f6f8 42%,
            #ffffff 52%,
            #d4d8dc 70%,
            #8a8e92 100%)`,
        }}
      />
      {/* Brushed-metal vertical ridges — fine repeating ticks for the crinkle. */}
      <div
        className="plm-absolute plm-inset-0"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 4px, rgba(255,255,255,0.32) 4px 5px, transparent 5px 9px)',
          mixBlendMode: 'overlay',
        }}
      />
      {/* Subtle horizontal bands — adds variation so it reads as foil, not paint. */}
      <div
        className="plm-absolute plm-inset-0"
        style={{
          background: `linear-gradient(${position === 'top' ? '180deg' : '0deg'},
            rgba(255,255,255,0.18) 0%,
            transparent 30%,
            rgba(255,255,255,0.28) 48%,
            transparent 70%,
            rgba(0,0,0,0.18) 100%)`,
          mixBlendMode: 'overlay',
        }}
      />
      {/* Tear edge — gradient fade along the inner edge for a clean transition. */}
      <div
        className="plm-absolute plm-left-0 plm-right-0"
        style={{
          height: 7,
          [position === 'top' ? 'bottom' : 'top']: 0,
          background: `linear-gradient(${position === 'top' ? '180deg' : '0deg'},
            rgba(0,0,0,0.4), transparent)`,
          maskImage:
            'linear-gradient(90deg, transparent, black 4px, black calc(100% - 4px), transparent)',
        }}
      />
      {/* Notched zigzag — small triangular cuts for the perforated tear feel. */}
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
          fill="#c8cdd2"
          opacity="0.9"
        />
      </svg>
      {children}
    </div>
  );
}
