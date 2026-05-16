import { useEffect, useState } from 'react';
import type { TutorialTab } from '@/components/shared/TutorialModal';

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
    const parsed: unknown = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
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
