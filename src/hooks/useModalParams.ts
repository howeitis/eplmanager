import { useState, useEffect, useCallback } from 'react';

interface ModalParams {
  playerId: string | null;
  clubId: string | null;
}

interface UseModalParamsReturn extends ModalParams {
  openModal: (playerId: string, clubId: string) => void;
  closeModal: () => void;
  isOpen: boolean;
}

const MODAL_CHANGE_EVENT = 'modalparamschange';

function getParamsFromURL(): ModalParams {
  const params = new URLSearchParams(window.location.search);
  return {
    playerId: params.get('playerId'),
    clubId: params.get('clubId'),
  };
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

  const openModal = useCallback((playerId: string, clubId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('playerId', playerId);
    url.searchParams.set('clubId', clubId);
    window.history.pushState({}, '', url.toString());
    // Notify all hook instances (including the modal) to re-read the URL
    window.dispatchEvent(new Event(MODAL_CHANGE_EVENT));
  }, []);

  const closeModal = useCallback(() => {
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
