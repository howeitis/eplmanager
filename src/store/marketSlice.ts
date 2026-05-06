import type { StateCreator } from 'zustand';
import type { GameState } from '../types/store';
import type { TransferOffer, TransferRecord, MarketListing, Position } from '../types/entities';

export interface MarketFilters {
  positions: Position[];
  ageMin: number;
  ageMax: number;
  overallMin: number;
  overallMax: number;
  statThresholds: { ATK: number; DEF: number; MOV: number; PWR: number; MEN: number; SKL: number };
  maxPrice: number | null; // null = no limit (use budget)
  nameSearch: string;
}

export const DEFAULT_MARKET_FILTERS: MarketFilters = {
  positions: [],
  ageMin: 17,
  ageMax: 35,
  overallMin: 0,
  overallMax: 99,
  statThresholds: { ATK: 0, DEF: 0, MOV: 0, PWR: 0, MEN: 0, SKL: 0 },
  maxPrice: null,
  nameSearch: '',
};

export interface FeaturedSlot {
  playerId: string;
  archetype: 'star' | 'prospect' | 'bargain' | 'trending';
}

export interface MarketSlice {
  budgets: Record<string, number>;
  transferOffers: TransferOffer[];
  transferHistory: TransferRecord[];
  marketListings: MarketListing[];
  tickerMessages: string[];
  shortlist: string[];
  shortlistNotifications: string[];
  marketFilters: MarketFilters;
  featuredSlots: FeaturedSlot[];
  featuredRefillIndex: number;

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
  clearShortlist: () => void;
  addShortlistNotification: (message: string) => void;
  clearShortlistNotifications: () => void;
  setMarketFilters: (filters: Partial<MarketFilters>) => void;
  resetMarketFilters: () => void;
  setFeaturedSlots: (slots: FeaturedSlot[]) => void;
  setFeaturedRefillIndex: (index: number) => void;
}

export const createMarketSlice: StateCreator<GameState, [], [], MarketSlice> = (set, get) => ({
  budgets: {},
  transferOffers: [],
  transferHistory: [],
  marketListings: [],
  tickerMessages: [],
  shortlist: [],
  shortlistNotifications: [],
  marketFilters: { ...DEFAULT_MARKET_FILTERS },
  featuredSlots: [],
  featuredRefillIndex: 0,

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
    set((state) => {
      // Dedupe: if the same buyer (toClubId) is bidding on the same player
      // they're already pending/countered on, treat the new offer as a
      // re-bid. Replace the prior open offer instead of stacking — keeps
      // the inbox tidy and matches how a real club would handle a higher
      // counter rather than seeing two parallel bids from the same suitor.
      const isOpen = (status: TransferOffer['status']) =>
        status === 'pending' || status === 'countered';
      const existingIdx = state.transferOffers.findIndex(
        (o) =>
          isOpen(o.status) &&
          o.direction === offer.direction &&
          o.playerId === offer.playerId &&
          o.fromClubId === offer.fromClubId &&
          o.toClubId === offer.toClubId,
      );
      if (existingIdx === -1) {
        return { transferOffers: [...state.transferOffers, offer] };
      }
      const existing = state.transferOffers[existingIdx];
      // Only replace if the new bid is at least as high — incidental
      // duplicate calls (e.g. retry) shouldn't downgrade an active offer.
      if (offer.fee < existing.fee) {
        return state;
      }
      const next = state.transferOffers.slice();
      next[existingIdx] = { ...offer, id: existing.id };
      return { transferOffers: next };
    });
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

  clearShortlist: () => {
    set({ shortlist: [] });
  },

  addShortlistNotification: (message) => {
    set((state) => ({
      shortlistNotifications: [...state.shortlistNotifications, message],
    }));
  },

  clearShortlistNotifications: () => {
    set({ shortlistNotifications: [] });
  },

  setMarketFilters: (filters) => {
    set((state) => ({
      marketFilters: { ...state.marketFilters, ...filters },
    }));
  },

  resetMarketFilters: () => {
    set({ marketFilters: { ...DEFAULT_MARKET_FILTERS } });
  },

  setFeaturedSlots: (slots) => {
    set({ featuredSlots: slots });
  },

  setFeaturedRefillIndex: (index) => {
    set({ featuredRefillIndex: index });
  },
});
