import { useGameStore } from '@/store/gameStore';

export type NavTab = 'hub' | 'squad' | 'transfers' | 'history' | 'manager';

interface BottomNavProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  const currentPhase = useGameStore((s) => s.currentPhase);
  const isTransferWindow =
    currentPhase === 'summer_window' || currentPhase === 'july_advance'
    || currentPhase === 'august_deadline' || currentPhase === 'january_window'
    || currentPhase === 'january_deadline';

  const tabs: { id: NavTab; label: string; icon: string; disabled?: boolean }[] = [
    { id: 'hub', label: 'Hub', icon: '⌂' },
    { id: 'squad', label: 'Squad', icon: '⫶' },
    { id: 'transfers', label: 'Transfers', icon: '⇄', disabled: !isTransferWindow },
    { id: 'history', label: 'History', icon: '☆' },
    { id: 'manager', label: 'Manager', icon: '👤' },
  ];

  // Indicator slides between tab positions instead of snapping. Each tab is
  // 1/tabs.length wide so we translate a same-width slider container.
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const sliderWidth = 100 / tabs.length;

  return (
    <nav aria-label="Main navigation" className="plm-fixed plm-bottom-0 plm-left-0 plm-right-0 plm-bg-white plm-border-t plm-border-warm-200 plm-z-50 md:plm-hidden">
      <div className="plm-relative plm-flex plm-justify-around plm-items-center plm-h-14" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              aria-disabled={tab.disabled}
              onClick={() => !tab.disabled && onNavigate(tab.id)}
              disabled={tab.disabled}
              className={`plm-flex plm-flex-col plm-items-center plm-justify-center plm-flex-1 plm-h-full plm-min-w-[44px] plm-transition-colors plm-relative plm-overflow-visible active:plm-scale-95 plm-duration-150 ${
                tab.disabled
                  ? 'plm-opacity-30 plm-cursor-not-allowed'
                  : isActive
                    ? 'plm-text-charcoal'
                    : 'plm-text-warm-500 hover:plm-text-warm-700'
              }`}
            >
              <span
                className={`plm-text-lg plm-leading-none plm-transition-transform plm-duration-200 plm-ease-out ${
                  isActive ? 'plm-scale-110 -plm-translate-y-0.5' : ''
                }`}
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              <span className={`plm-text-[10px] plm-mt-0.5 plm-font-medium plm-transition-all plm-duration-200 ${
                isActive ? 'plm-font-bold' : ''
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
        {/* Single sliding indicator — slides between active tab positions */}
        <div
          aria-hidden="true"
          className="plm-absolute plm-bottom-0 plm-h-0.5 plm-transition-transform plm-duration-300 plm-ease-out plm-pointer-events-none"
          style={{
            width: `${sliderWidth}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            left: 0,
          }}
        >
          <div className="plm-h-full plm-w-8 plm-mx-auto plm-bg-charcoal plm-rounded-full" />
        </div>
      </div>
    </nav>
  );
}
