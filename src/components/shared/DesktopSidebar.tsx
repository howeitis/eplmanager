import { useGameStore } from '../../store/gameStore';
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

  return (
    <aside className="plm-hidden md:plm-flex plm-flex-col plm-w-56 plm-min-h-screen plm-bg-white plm-border-r plm-border-warm-200 plm-flex-shrink-0">
      {/* Club header */}
      <div className="plm-p-4 plm-border-b plm-border-warm-200">
        <div className="plm-flex plm-items-center plm-gap-2.5">
          {playerClub && (
            <div
              className="plm-w-8 plm-h-8 plm-rounded-full plm-flex-shrink-0 plm-border-2"
              style={{
                backgroundColor: playerClub.colors.primary,
                borderColor: playerClub.colors.secondary,
              }}
            />
          )}
          <div className="plm-min-w-0">
            <div className="plm-font-display plm-font-bold plm-text-sm plm-text-charcoal plm-truncate">
              {playerClub?.name}
            </div>
            <div className="plm-text-[11px] plm-text-warm-500">
              {manager?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="plm-flex-1 plm-py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onNavigate(tab.id)}
            disabled={tab.disabled}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            className={`plm-w-full plm-text-left plm-px-4 plm-py-3 plm-text-sm plm-font-body plm-transition-colors ${
              tab.disabled
                ? 'plm-opacity-30 plm-cursor-not-allowed plm-text-warm-400'
                : activeTab === tab.id
                  ? 'plm-bg-warm-100 plm-text-charcoal plm-font-semibold plm-border-r-2 plm-border-charcoal'
                  : 'plm-text-warm-600 hover:plm-bg-warm-50 hover:plm-text-charcoal'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
