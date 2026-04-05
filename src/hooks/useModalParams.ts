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
    const handlePopState = () => {
      setParams(getParamsFromURL());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openModal = useCallback((playerId: string, clubId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('playerId', playerId);
    url.searchParams.set('clubId', clubId);
    window.history.pushState({}, '', url.toString());
    setParams({ playerId, clubId });
  }, []);

  const closeModal = useCallback(() => {
    const current = getParamsFromURL();
    if (current.playerId) {
      // Pop the modal state we pushed
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
