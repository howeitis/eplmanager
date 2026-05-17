import { useMemo, useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { useNavigation } from '@/hooks/useNavigation';
import { CLUBS } from '@/data/clubs';
import { RetroPlayerCard } from '@/components/shared/RetroPlayerCard';
import { ManagerMomentCard } from './ManagerMomentCard';
import { playerCards, managerMomentCards } from '@/utils/binder';
import type { BinderCard, PlayerBinderCardType } from '@/types/entities';

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

type Filter = 'all' | 'moments' | PlayerBinderCardType;

// Risers and generic "Season End" cards aren't minted anymore — only special
// tier transitions (Starboy / Icon / Legend) become cards, and they live
// under Moments rather than as their own filter. Old saves with legacy
// tier-up / season-end cards still surface them under the All view.
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'moments', label: 'Moments' },
  { id: 'signing', label: 'Signings' },
  { id: 'tots', label: 'TOTS' },
  { id: 'retirement', label: 'Retirees' },
  { id: 'youth-intake', label: 'Youth' },
];

/**
 * Career sticker album. Lists every player and manager card the user has
 * accumulated, grouped by season most-recent-first. Click a card to enlarge
 * it. Cards are full snapshots so this view is decoupled from live roster
 * state — players who were sold or who have retired still show up here.
 */
export function BinderScreen() {
  const manager = useGameStore((s) => s.manager);
  const { navigateBack } = useNavigation();
  const [filter, setFilter] = useState<Filter>('all');
  const [enlarged, setEnlarged] = useState<BinderCard | null>(null);

  // Stable reference so the useMemo below doesn't see a new `[]` every render
  // when the manager has no binder yet — keeps the season grouping cached.
  const binder = useMemo(() => manager?.binder ?? [], [manager?.binder]);
  const total = binder.length;
  const playerCount = playerCards(binder).length;
  const momentCount = managerMomentCards(binder).length;

  // Apply the filter then group by season descending. We bucket by season so
  // the binder reads like a multi-volume yearbook — each season's "pages"
  // sit together and the user can scroll back through their career.
  const grouped = useMemo(() => {
    const filtered = binder.filter((c) => {
      if (filter === 'all') return true;
      if (filter === 'moments') return c.kind === 'manager-moment';
      return c.kind === 'player' && c.type === filter;
    });
    const buckets = new Map<number, BinderCard[]>();
    for (const c of filtered) {
      const arr = buckets.get(c.season) ?? [];
      arr.push(c);
      buckets.set(c.season, arr);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => b - a);
  }, [binder, filter]);

  return (
    <div className="plm-space-y-4 plm-w-full plm-py-4">
      {/* Back to History */}
      <button
        type="button"
        onClick={navigateBack}
        className="plm-inline-flex plm-items-center plm-gap-1.5 plm-text-xs plm-font-semibold plm-text-warm-500 hover:plm-text-charcoal plm-transition-colors plm-min-h-[44px]"
        aria-label="Back to Season History"
      >
        <span aria-hidden>‹</span>
        <span>Season History</span>
      </button>

      {/* Header */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
        <div className="plm-flex plm-items-center plm-gap-2 plm-mb-1">
          <div className="plm-h-px plm-flex-1 plm-bg-warm-200" />
          <span className="plm-text-[10px] plm-font-bold plm-text-warm-400 plm-uppercase plm-tracking-[0.2em]">
            Career Binder
          </span>
          <div className="plm-h-px plm-flex-1 plm-bg-warm-200" />
        </div>
        <h2 className="plm-font-display plm-text-2xl plm-font-bold plm-text-charcoal plm-text-center plm-mb-1">
          {manager?.name ? `${manager.name}'s Scrapbook` : 'Your Scrapbook'}
        </h2>
        <p className="plm-text-xs plm-text-warm-500 plm-text-center">
          {total === 0
            ? 'Empty. Sign players, lift trophies, or survive a relegation scrap and they land here.'
            : `${total} card${total === 1 ? '' : 's'} · ${momentCount} moment${momentCount === 1 ? '' : 's'} · ${playerCount} player${playerCount === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* Filter pills */}
      <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-3 plm-overflow-x-auto">
        <div className="plm-flex plm-gap-2 plm-min-w-max">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`plm-rounded-full plm-px-3 plm-py-2 plm-text-xs plm-font-semibold plm-transition-colors plm-min-h-[44px] plm-whitespace-nowrap ${
                  active
                    ? 'plm-bg-charcoal plm-text-white'
                    : 'plm-bg-warm-50 plm-text-warm-700 hover:plm-bg-warm-100'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grouped grid */}
      {grouped.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        grouped.map(([season, cards]) => (
          <SeasonGroup
            key={season}
            season={season}
            cards={cards}
            onCardClick={(c) => setEnlarged(c)}
          />
        ))
      )}

      {/* Enlarged card overlay */}
      {enlarged && <EnlargedCardModal card={enlarged} onDismiss={() => setEnlarged(null)} />}
    </div>
  );
}

// ─── Season group ────────────────────────────────────────────────

function SeasonGroup({
  season,
  cards,
  onCardClick,
}: {
  season: number;
  cards: BinderCard[];
  onCardClick: (c: BinderCard) => void;
}) {
  return (
    <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-4">
      <div className="plm-flex plm-items-center plm-gap-2 plm-mb-3">
        <h3 className="plm-font-display plm-text-base plm-font-bold plm-text-charcoal">
          Season {season}
        </h3>
        <span className="plm-text-[10px] plm-font-semibold plm-text-warm-400 plm-uppercase plm-tracking-wider">
          {cards.length} card{cards.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="plm-flex plm-flex-wrap plm-gap-3 plm-justify-start">
        {cards.map((card) => (
          <BinderThumbnail key={card.id} card={card} onClick={() => onCardClick(card)} />
        ))}
      </div>
    </div>
  );
}

// ─── Thumbnail ───────────────────────────────────────────────────

function BinderThumbnail({ card, onClick }: { card: BinderCard; onClick: () => void }) {
  const label = thumbnailLabel(card);

  return (
    <button
      type="button"
      onClick={onClick}
      className="plm-flex plm-flex-col plm-items-center plm-gap-1 plm-rounded-lg hover:plm-bg-warm-50 plm-p-1 plm-transition-colors plm-min-h-[44px]"
      aria-label={label}
    >
      {card.kind === 'player' ? (
        <RetroPlayerCard
          player={card.player}
          clubId={card.clubId}
          clubName={clubDataMap.get(card.clubId)?.name}
          clubColors={clubDataMap.get(card.clubId)?.colors}
          size="sm"
          disableFlip
          retired={card.type === 'retirement'}
          tierUp={card.type === 'tier-up'}
        />
      ) : (
        <ManagerMomentCard
          card={card}
          clubName={clubDataMap.get(card.clubId)?.shortName}
          size="sm"
        />
      )}
      <span className="plm-text-[9px] plm-font-semibold plm-text-warm-500 plm-uppercase plm-tracking-wider">
        {thumbnailTypeLabel(card)}
      </span>
    </button>
  );
}

// ─── Empty state ─────────────────────────────────────────────────

function EmptyState({ filter }: { filter: Filter }) {
  const msg =
    filter === 'all'
      ? "Your binder is empty. Sign players, win trophies, or scrape past relegation — and they'll show up here."
      : `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase() ?? ''} cards yet for this filter.`;
  return (
    <div className="plm-bg-white plm-rounded-lg plm-shadow-sm plm-border plm-border-warm-200 plm-p-10 plm-text-center">
      <div className="plm-text-4xl plm-mb-3" aria-hidden>▦</div>
      <p className="plm-text-sm plm-text-warm-600">{msg}</p>
    </div>
  );
}

// ─── Enlarged-card modal ─────────────────────────────────────────

function EnlargedCardModal({ card, onDismiss }: { card: BinderCard; onDismiss: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { handleBackdropClick } = useModalDismiss(dialogRef, onDismiss);
  const clubData = clubDataMap.get(card.clubId);
  const mintedDate = new Date(card.mintedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div
      className="plm-fixed plm-inset-0 plm-z-50 plm-flex plm-items-center plm-justify-center plm-px-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged card"
    >
      <div className="plm-absolute plm-inset-0 plm-bg-black/70 plm-animate-fade-in" />
      <div
        ref={dialogRef}
        className="plm-relative plm-bg-cream plm-rounded-xl plm-px-6 plm-py-8 plm-flex plm-flex-col plm-items-center plm-gap-4 plm-animate-slide-up plm-max-h-[90vh] plm-overflow-y-auto"
      >
        <button
          onClick={onDismiss}
          aria-label="Close"
          className="plm-absolute plm-top-3 plm-right-3 plm-w-9 plm-h-9 plm-flex plm-items-center plm-justify-center plm-rounded-full plm-text-warm-500 hover:plm-bg-warm-100 plm-min-h-[44px] plm-min-w-[44px]"
        >
          <svg className="plm-w-5 plm-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {card.kind === 'player' ? (
          <RetroPlayerCard
            player={card.player}
            clubId={card.clubId}
            clubName={clubData?.name}
            clubColors={clubData?.colors}
            size="xl"
            retired={card.type === 'retirement'}
            tierUp={card.type === 'tier-up'}
          />
        ) : (
          <ManagerMomentCard card={card} clubName={clubData?.name} size="lg" />
        )}
        <div className="plm-text-center plm-text-xs plm-text-warm-500 plm-max-w-xs">
          <div className="plm-font-semibold plm-uppercase plm-tracking-wider plm-text-[10px] plm-text-warm-400">
            {thumbnailTypeLabel(card)} · Season {card.season}
          </div>
          {card.kind === 'player' && card.fee !== undefined && (
            <div className="plm-mt-1">Signed for £{card.fee.toFixed(1)}M</div>
          )}
          <div className="plm-mt-1 plm-italic">Minted {mintedDate}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Label helpers ───────────────────────────────────────────────

function thumbnailTypeLabel(card: BinderCard): string {
  if (card.kind === 'manager-moment') return 'Moment';
  const type: PlayerBinderCardType = card.type;
  switch (type) {
    case 'signing': return 'Signing';
    case 'season-end': return 'Season End';
    case 'retirement': return 'Retired';
    case 'tots': return 'TOTS';
    case 'tier-up': return 'Riser';
    case 'youth-intake': return 'Youth';
  }
}

function thumbnailLabel(card: BinderCard): string {
  if (card.kind === 'player') return `${card.player.name}, ${thumbnailTypeLabel(card)} Season ${card.season}`;
  return `${card.title}, Season ${card.season}`;
}
