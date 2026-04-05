import { useGameStore } from '../../store/gameStore';

export type NavTab = 'hub' | 'squad' | 'transfers' | 'history';

interface BottomNavProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  const currentPhase = useGameStore((s) => s.currentPhase);
  const isTransferWindow =
    currentPhase === 'summer_window' || currentPhase === 'january_window';

  const tabs: { id: NavTab; label: string; icon: string; disabled?: boolean }[] = [
    { id: 'hub', label: 'Hub', icon: '⌂' },
    { id: 'squad', label: 'Squad', icon: '⫶' },
    { id: 'transfers', label: 'Transfers', icon: '⇄', disabled: !isTransferWindow },
    { id: 'history', label: 'History', icon: '☆' },
  ];

  return (
    <nav aria-label="Main navigation" className="plm-fixed plm-bottom-0 plm-left-0 plm-right-0 plm-bg-white plm-border-t plm-border-warm-200 plm-z-50 md:plm-hidden">
      <div className="plm-flex plm-justify-around plm-items-center plm-h-14" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-label={tab.label}
            aria-disabled={tab.disabled}
            onClick={() => !tab.disabled && onNavigate(tab.id)}
            disabled={tab.disabled}
            className={`plm-flex plm-flex-col plm-items-center plm-justify-center plm-flex-1 plm-h-full plm-min-w-[44px] plm-transition-colors plm-relative ${
              tab.disabled
                ? 'plm-opacity-30 plm-cursor-not-allowed'
                : activeTab === tab.id
                  ? 'plm-text-charcoal'
                  : 'plm-text-warm-500 hover:plm-text-warm-700'
            }`}
          >
            <span className="plm-text-lg plm-leading-none" aria-hidden="true">{tab.icon}</span>
            <span className={`plm-text-[10px] plm-mt-0.5 plm-font-medium ${
              activeTab === tab.id ? 'plm-font-bold' : ''
            }`}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <div className="plm-absolute plm-bottom-0 plm-h-0.5 plm-w-8 plm-bg-charcoal plm-rounded-full" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
