import type { StateCreator } from 'zustand';
import type { GameState } from '../types/store';
import type { TransferOffer, TransferRecord, MarketListing } from '../types/entities';

export interface MarketSlice {
  budgets: Record<string, number>;
  transferOffers: TransferOffer[];
  transferHistory: TransferRecord[];
  marketListings: MarketListing[];
  tickerMessages: string[];
  shortlist: string[];

  initializeBudgets: (budgets: Record<string, number>) => void;
  setBudget: (clubId: string, amount: number) => void;
  adjustBudget: (clubId: string, delta: number) => void;
  addTransferOffer: (offer: TransferOffer) => void;
  updateTransferOffer: (offerId: string, status: TransferOffer['status'], counterFee?: number) => void;
  clearTransferOffers: () => void;
  recordTransfer: (record: TransferRecord) => void;
  getSeasonTransfers: (season: number) => TransferRecord[];
  setMarketListings: (listings: MarketListing[]) => void;
  addMarketListing: (listing: MarketListing) => void;
  removeMarketListing: (playerId: string) => void;
  clearMarketListings: () => void;
  setTickerMessages: (messages: string[]) => void;
  addTickerMessage: (message: string) => void;
  clearTickerMessages: () => void;
  addToShortlist: (playerId: string) => void;
  removeFromShortlist: (playerId: string) => void;
  toggleShortlist: (playerId: string) => void;
}

export const createMarketSlice: StateCreator<GameState, [], [], MarketSlice> = (set, get) => ({
  budgets: {},
  transferOffers: [],
  transferHistory: [],
  marketListings: [],
  tickerMessages: [],
  shortlist: [],

  initializeBudgets: (budgets) => {
    set({ budgets });
  },

  setBudget: (clubId, amount) => {
    set((state) => ({
      budgets: { ...state.budgets, [clubId]: amount },
    }));
  },

  adjustBudget: (clubId, delta) => {
    set((state) => ({
      budgets: {
        ...state.budgets,
        [clubId]: Math.round(((state.budgets[clubId] || 0) + delta) * 10) / 10,
      },
    }));
  },

  addTransferOffer: (offer) => {
    set((state) => ({
      transferOffers: [...state.transferOffers, offer],
    }));
  },

  updateTransferOffer: (offerId, status, counterFee) => {
    set((state) => ({
      transferOffers: state.transferOffers.map((o) =>
        o.id === offerId
          ? { ...o, status, ...(counterFee !== undefined ? { counterFee } : {}) }
          : o,
      ),
    }));
  },

  clearTransferOffers: () => {
    set({ transferOffers: [] });
  },

  recordTransfer: (record) => {
    set((state) => ({
      transferHistory: [...state.transferHistory, record],
    }));
  },

  getSeasonTransfers: (season) => {
    return get().transferHistory.filter((t) => t.season === season);
  },

  setMarketListings: (listings) => {
    set({ marketListings: listings });
  },

  addMarketListing: (listing) => {
    set((state) => ({
      marketListings: [...state.marketListings, listing],
    }));
  },

  removeMarketListing: (playerId) => {
    set((state) => ({
      marketListings: state.marketListings.filter((l) => l.playerId !== playerId),
    }));
  },

  clearMarketListings: () => {
    set({ marketListings: [] });
  },

  setTickerMessages: (messages) => {
    set({ tickerMessages: messages });
  },

  addTickerMessage: (message) => {
    set((state) => ({
      tickerMessages: [...state.tickerMessages, message],
    }));
  },

  clearTickerMessages: () => {
    set({ tickerMessages: [] });
  },

  addToShortlist: (playerId) => {
    set((state) => ({
      shortlist: state.shortlist.includes(playerId)
        ? state.shortlist
        : [...state.shortlist, playerId],
    }));
  },

  removeFromShortlist: (playerId) => {
    set((state) => ({
      shortlist: state.shortlist.filter((id) => id !== playerId),
    }));
  },

  toggleShortlist: (playerId) => {
    set((state) => ({
      shortlist: state.shortlist.includes(playerId)
        ? state.shortlist.filter((id) => id !== playerId)
        : [...state.shortlist, playerId],
    }));
  },
});
