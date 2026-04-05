import type { StateCreator } from 'zustand';
import type { GameState } from '../types/store';
import type {
  ManagerProfile,
  BoardExpectation,
  SeasonHistory,
  SaveMetadata,
} from '../types/entities';

export interface MetaSlice {
  manager: ManagerProfile | null;
  boardExpectation: BoardExpectation | null;
  seasonHistories: SeasonHistory[];
  saveSlot: number | null;
  saveMetadata: SaveMetadata | null;

  setManager: (profile: ManagerProfile) => void;
  updateReputation: (delta: number) => void;
  setBoardExpectation: (expectation: BoardExpectation) => void;
  addSeasonHistory: (history: SeasonHistory) => void;
  setSaveSlot: (slot: number) => void;
  setSaveMetadata: (metadata: SaveMetadata) => void;
}

export const createMetaSlice: StateCreator<GameState, [], [], MetaSlice> = (set) => ({
  manager: null,
  boardExpectation: null,
  seasonHistories: [],
  saveSlot: null,
  saveMetadata: null,

  setManager: (profile) => {
    set({ manager: profile });
  },

  updateReputation: (delta) => {
    set((state) => {
      if (!state.manager) return {};
      const newRep = Math.max(0, Math.min(100, state.manager.reputation + delta));
      return { manager: { ...state.manager, reputation: newRep } };
    });
  },

  setBoardExpectation: (expectation) => {
    set({ boardExpectation: expectation });
  },

  addSeasonHistory: (history) => {
    set((state) => ({
      seasonHistories: [...state.seasonHistories, history],
    }));
  },

  setSaveSlot: (slot) => {
    set({ saveSlot: slot });
  },

  setSaveMetadata: (metadata) => {
    set({ saveMetadata: metadata });
  },
});
