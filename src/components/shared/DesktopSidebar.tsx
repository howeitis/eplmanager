import { useLayoutEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getClubLogoUrl } from '@/data/assets';
import type { NavTab } from './BottomNav';

interface DesktopSidebarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onBack: () => void;
}

export function DesktopSidebar({ activeTab, onNavigate, onBack }: DesktopSidebarProps) {
  const currentPhase = useGameStore((s) => s.currentPhase);
  const manager = useGameStore((s) => s.manager);
  const clubs = useGameStore((s) => s.clubs);

  const isTransferWindow =
    currentPhase === 'summer_window' || currentPhase === 'july_advance'
    || currentPhase === 'august_deadline' || currentPhase === 'january_window'
    || currentPhase === 'january_deadline';
  const playerClub = clubs.find((c) => c.id === manager?.clubId);

  const tabs: { id: NavTab; label: string; disabled?: boolean }[] = [
    { id: 'hub', label: 'Game Hub' },
    { id: 'squad', label: 'Squad' },
    { id: 'transfers', label: 'Transfers', disabled: !isTransferWindow },
    { id: 'history', label: 'History' },
    { id: 'manager', label: 'Manager' },
  ];

  // Vertical indicator slides between active tab positions. We measure each
  // tab button so the slide tracks real layout rather than a hardcoded height.
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<{ top: number; height: number; ready: boolean }>({
    top: 0,
    height: 0,
    ready: false,
  });
  const activeIndex = tabs.findIndex((t) => t.id === activeTab);

  useLayoutEffect(() => {
    const el = tabRefs.current[activeIndex];
    if (el) {
      setIndicator({ top: el.offsetTop, height: el.offsetHeight, ready: true });
    }
  }, [activeIndex, activeTab]);

  return (
    <aside className="plm-hidden md:plm-flex plm-flex-col plm-self-stretch plm-w-56 plm-bg-white plm-border-r plm-border-warm-200 plm-flex-shrink-0">
      {/* Club header — crest sits unboxed above the nav */}
      <div className="plm-px-4 plm-pt-5 plm-pb-3 plm-border-b plm-border-warm-200">
        <div className="plm-flex plm-flex-col plm-items-center plm-text-center plm-gap-2">
          {playerClub && (
            getClubLogoUrl(playerClub.id) ? (
              <img
                src={getClubLogoUrl(playerClub.id)}
                alt={playerClub.name}
                className="plm-w-16 plm-h-16 plm-object-contain plm-flex-shrink-0"
              />
            ) : (
              <div
                className="plm-w-16 plm-h-16 plm-flex-shrink-0"
                style={{ backgroundColor: playerClub.colors.primary }}
              />
            )
          )}
          <div className="plm-min-w-0 plm-w-full">
            <div className="plm-font-display plm-font-bold plm-text-sm plm-text-charcoal plm-truncate">
              {playerClub?.name}
            </div>
            <div className="plm-text-[11px] plm-text-warm-500 plm-truncate">
              {manager?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="plm-flex-1 plm-py-2 plm-relative">
        {/* Sliding right-edge indicator — follows the active tab */}
        <div
          aria-hidden="true"
          className={`plm-absolute plm-right-0 plm-w-0.5 plm-bg-charcoal plm-rounded-l-full plm-pointer-events-none ${
            indicator.ready ? 'plm-transition-all plm-duration-300 plm-ease-out plm-opacity-100' : 'plm-opacity-0'
          }`}
          style={{ top: indicator.top, height: indicator.height }}
        />
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[idx] = el; }}
              onClick={() => !tab.disabled && onNavigate(tab.id)}
              disabled={tab.disabled}
              aria-current={isActive ? 'page' : undefined}
              className={`plm-w-full plm-text-left plm-px-4 plm-py-3 plm-text-sm plm-font-body plm-transition-all plm-duration-200 ${
                tab.disabled
                  ? 'plm-opacity-30 plm-cursor-not-allowed plm-text-warm-400'
                  : isActive
                    ? 'plm-bg-warm-100 plm-text-charcoal plm-font-semibold plm-pl-5'
                    : 'plm-text-warm-600 hover:plm-bg-warm-50 hover:plm-text-charcoal hover:plm-pl-5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Save slots link */}
      <div className="plm-p-4 plm-border-t plm-border-warm-200">
        <button
          onClick={onBack}
          className="plm-text-xs plm-text-warm-500 hover:plm-text-warm-700 plm-transition-colors"
        >
          &larr; Save Slots
        </button>
      </div>
    </aside>
  );
}
