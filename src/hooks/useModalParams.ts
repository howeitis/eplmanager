import { useState, useEffect, useCallback } from 'react';

interface ModalParams {
  playerId: string | null;
  clubId: string | null;
}

interface UseModalParamsReturn extends ModalParams {
  openModal: (playerId: string, clubId: string, browseList?: string[]) => void;
  closeModal: () => void;
  isOpen: boolean;
}

const MODAL_CHANGE_EVENT = 'modalparamschange';
const BROWSE_LIST_CHANGE_EVENT = 'modalbrowselistchange';

// Ephemeral browse-list context. When openModal is called from a list surface
// (e.g. squad screen, shortlist), the caller passes the ordered playerIds so
// the modal can support hard-swipe navigation between them. Cleared on
// closeModal or when openModal is called without a list. Lists with fewer
// than 2 entries are treated as no-list (nothing to navigate to).
let cachedBrowseList: string[] | null = null;

function getParamsFromURL(): ModalParams {
  const params = new URLSearchParams(window.location.search);
  return {
    playerId: params.get('playerId'),
    clubId: params.get('clubId'),
  };
}

function setBrowseList(list: string[] | null) {
  cachedBrowseList = list && list.length > 1 ? list : null;
  window.dispatchEvent(new Event(BROWSE_LIST_CHANGE_EVENT));
}

export function useModalParams(): UseModalParamsReturn {
  const [params, setParams] = useState<ModalParams>(getParamsFromURL);

  useEffect(() => {
    const sync = () => setParams(getParamsFromURL());

    // Sync on browser back/forward
    window.addEventListener('popstate', sync);
    // Sync on our own custom event (fired by openModal)
    window.addEventListener(MODAL_CHANGE_EVENT, sync);

    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(MODAL_CHANGE_EVENT, sync);
    };
  }, []);

  const openModal = useCallback((playerId: string, clubId: string, browseList?: string[]) => {
    setBrowseList(browseList ?? null);
    const url = new URL(window.location.href);
    url.searchParams.set('playerId', playerId);
    url.searchParams.set('clubId', clubId);
    window.history.pushState({}, '', url.toString());
    // Notify all hook instances (including the modal) to re-read the URL
    window.dispatchEvent(new Event(MODAL_CHANGE_EVENT));
  }, []);

  const closeModal = useCallback(() => {
    setBrowseList(null);
    const current = getParamsFromURL();
    if (current.playerId) {
      window.history.back();
      // State will update via popstate listener
    }
  }, []);

  return {
    ...params,
    openModal,
    closeModal,
    isOpen: params.playerId !== null,
  };
}

/**
 * Returns the active browse list (ordered playerIds) for the open modal, or
 * null if the modal was opened without a list context. List surfaces pass
 * this via the third argument to openModal.
 */
export function useModalBrowseList(): string[] | null {
  const [list, setList] = useState<string[] | null>(cachedBrowseList);

  useEffect(() => {
    const sync = () => setList(cachedBrowseList);
    window.addEventListener(BROWSE_LIST_CHANGE_EVENT, sync);
    return () => window.removeEventListener(BROWSE_LIST_CHANGE_EVENT, sync);
  }, []);

  return list;
}

/**
 * Swap the modal's player without touching the browse-list context. Used by
 * the modal when the user hard-swipes to the next/previous card so the URL
 * updates in place rather than pushing a new history entry.
 */
export function navigateModalTo(playerId: string, clubId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('playerId', playerId);
  url.searchParams.set('clubId', clubId);
  window.history.replaceState({}, '', url.toString());
  window.dispatchEvent(new Event(MODAL_CHANGE_EVENT));
}
