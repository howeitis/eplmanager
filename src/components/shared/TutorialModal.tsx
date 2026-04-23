import { useEffect, useState } from 'react';

export type TutorialTab = 'hub' | 'squad' | 'transfers' | 'history' | 'manager' | 'overview';

interface TutorialCopy {
  title: string;
  sections: { title: string; body: string }[];
}

const TUTORIALS: Record<TutorialTab, TutorialCopy> = {
  hub: {
    title: 'Game Hub',
    sections: [
      {
        title: 'Your command center',
        body: 'The Hub is where the season moves forward. The big "Advance" button plays the current month — press it when you\'re ready to see this month\'s results.',
      },
      {
        title: 'What you\'ll see here',
        body: 'The league table, your upcoming fixtures, top scorers, and the board\'s current mood. Check these before every advance to spot trouble early.',
      },
      {
        title: 'Between months',
        body: 'Pop over to Squad to tune formation and mentality, or Transfers if a window is open. Then come back to the Hub and advance.',
      },
    ],
  },
  squad: {
    title: 'Squad',
    sections: [
      {
        title: 'Your 16+ players',
        body: 'Six positions (GK, CB, FB, MF, WG, ST). Rarer golds and prospects sit alongside the squad core — tap any card to flip it and see honours.',
      },
      {
        title: 'Formation & mentality',
        body: 'Lock in your shape (4-4-2, 4-3-3, etc.) and how attacking you want to be before each month. Both feed directly into Team Strength.',
      },
      {
        title: 'Starting XI & captain',
        body: 'Pick a starting XI — missing positions auto-fill. Choose a captain for a small TSS boost. Injuries create temporary fill-ins that expire automatically.',
      },
    ],
  },
  transfers: {
    title: 'Transfer Center',
    sections: [
      {
        title: 'Two windows a year',
        body: 'Summer (bigger moves) and January (gap-filling). Between windows the market is closed — plan ahead.',
      },
      {
        title: 'Shortlist, offer, negotiate',
        body: 'Star players you like to your Shortlist, then bid. Rival clubs will make offers on your stars too — you can accept, counter, or reject.',
      },
      {
        title: 'Value & budget',
        body: 'Market value is driven by ability, age, and trait (not form). Your budget refreshes each season based on league position and board mood.',
      },
    ],
  },
  history: {
    title: 'History',
    sections: [
      {
        title: 'Every season, archived',
        body: 'Final tables, top scorers, your finish, and the transfer log — one row per completed season.',
      },
      {
        title: 'Trophy cabinet & records',
        body: 'League titles you\'ve won appear in the cabinet. All-time records track the biggest goal hauls and points totals across your career.',
      },
      {
        title: 'Need a refresher?',
        body: 'The "New here?" button at the top of this tab opens every tutorial — you can revisit any tab\'s guide any time.',
      },
    ],
  },
  manager: {
    title: 'Manager',
    sections: [
      {
        title: 'Your profile',
        body: 'Your manager card shows reputation, nationality, philosophy, and a career bio. Reputation drives board expectations and job offers.',
      },
      {
        title: 'Tenures & accomplishments',
        body: 'Every club you\'ve managed is logged with games, league titles, FA Cups, and best finish. Milestones and trophies are listed below.',
      },
      {
        title: 'Moving on',
        body: 'You can resign and take charge of a different club. The new board will set fresh expectations — reputation carries across.',
      },
    ],
  },
  overview: {
    title: 'How the game works',
    sections: [
      {
        title: 'The season',
        body: 'August–May, advanced one month at a time from the Hub. Set formation and mentality in Squad before each month.',
      },
      {
        title: 'Squad & captain',
        body: '16+ players across six positions. Pick a captain for a TSS boost. Injuries create temporary fill-ins that auto-expire.',
      },
      {
        title: 'Matches',
        body: 'Results come from Team Strength (stats × formation × mentality + home advantage + form). You see each month\'s results and top scorers.',
      },
      {
        title: 'Transfers',
        body: 'Two windows — summer and January. Browse, shortlist, bid, and handle incoming offers. Form doesn\'t affect value.',
      },
      {
        title: 'Board',
        body: 'The board sets a minimum finish. Beat it → reputation and budget rise. Miss it → the opposite. Reputation at 0 = sack.',
      },
      {
        title: 'Season end',
        body: 'Aging kicks in: 33+ may retire, 36+ often do. Retirees are replaced by regens. You also get annual youth intake.',
      },
      {
        title: 'Career',
        body: 'Trophies, accomplishments, and tenures are tracked across clubs. Resign from the Manager tab to take a new job.',
      },
    ],
  },
};

interface TutorialModalProps {
  onClose: () => void;
  /** Which tab's tutorial to show. Defaults to the broad overview. */
  tab?: TutorialTab;
}

export function TutorialModal({ onClose, tab = 'overview' }: TutorialModalProps) {
  const copy = TUTORIALS[tab];

  return (
    <div
      className="plm-fixed plm-inset-0 plm-z-[100] plm-flex plm-items-center plm-justify-center plm-p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div
        className="plm-bg-white plm-rounded-lg plm-border plm-border-warm-200 plm-max-w-lg plm-w-full plm-shadow-xl plm-overflow-hidden plm-max-h-[85vh] plm-flex plm-flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="plm-flex plm-items-center plm-justify-between plm-px-5 plm-py-3 plm-border-b plm-border-warm-200">
          <h3 id="tutorial-title" className="plm-font-display plm-font-bold plm-text-lg plm-text-charcoal">
            {copy.title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close tutorial"
            className="plm-text-warm-500 hover:plm-text-charcoal plm-text-xl plm-leading-none"
          >
            ×
          </button>
        </div>
        <div className="plm-overflow-y-auto plm-px-5 plm-py-4 plm-space-y-4 plm-text-sm plm-text-charcoal">
          {copy.sections.map((s) => (
            <div key={s.title}>
              <h4 className="plm-font-display plm-font-bold plm-text-sm plm-text-charcoal plm-mb-1">
                {s.title}
              </h4>
              <p className="plm-text-sm plm-text-warm-600 plm-leading-relaxed">{s.body}</p>
            </div>
          ))}
          {tab !== 'history' && tab !== 'overview' && (
            <p className="plm-text-xs plm-text-warm-500 plm-italic plm-pt-1 plm-border-t plm-border-warm-100">
              You can review every tutorial again from the History tab — tap "New here?" at the top.
            </p>
          )}
        </div>
        <div className="plm-px-5 plm-py-3 plm-border-t plm-border-warm-200 plm-bg-warm-50">
          <button
            onClick={onClose}
            className="plm-w-full plm-py-2.5 plm-rounded plm-bg-charcoal plm-text-white plm-text-sm plm-font-semibold hover:plm-bg-charcoal-light"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── First-visit hook ──────────────────────────────────────────────────────
// Shows the per-tab tutorial the first time the player opens that tab on a
// given save slot. Persisted in localStorage so it survives reboots and
// reloads but is scoped per save so each new game re-introduces itself.

const SEEN_STORAGE_PREFIX = 'plm-tutorial-seen';

function getSeenKey(saveSlot: number | null): string {
  return `${SEEN_STORAGE_PREFIX}-${saveSlot ?? 'anon'}`;
}

function readSeen(saveSlot: number | null): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(getSeenKey(saveSlot));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeen(saveSlot: number | null, seen: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getSeenKey(saveSlot), JSON.stringify([...seen]));
  } catch {
    // Swallow quota/serialization issues — the tutorial simply re-shows next time.
  }
}

export function useFirstVisitTutorial(
  tab: Exclude<TutorialTab, 'overview'>,
  saveSlot: number | null,
  enabled: boolean = true,
): { show: boolean; onClose: () => void } {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const seen = readSeen(saveSlot);
    if (!seen.has(tab)) {
      setShow(true);
    }
  }, [tab, saveSlot, enabled]);

  const onClose = () => {
    const seen = readSeen(saveSlot);
    seen.add(tab);
    writeSeen(saveSlot, seen);
    setShow(false);
  };

  return { show, onClose };
}
