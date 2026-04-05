import type { StateCreator } from 'zustand';
import type { GameState } from '../types/store';
import type { GamePhase, SeasonEvent, ActiveModifier } from '../types/entities';

export interface SeasonSlice {
  currentPhase: GamePhase;
  seasonNumber: number;
  gameSeed: string;
  events: SeasonEvent[];
  activeModifiers: ActiveModifier[];

  setPhase: (phase: GamePhase) => void;
  advanceSeason: () => void;
  setGameSeed: (seed: string) => void;
  addEvent: (event: SeasonEvent) => void;
  clearEvents: () => void;
  addModifier: (modifier: ActiveModifier) => void;
  removeModifier: (modifierId: string) => void;
  clearExpiredModifiers: (currentPhase: GamePhase) => void;
}

export const createSeasonSlice: StateCreator<GameState, [], [], SeasonSlice> = (set) => ({
  currentPhase: 'summer_window',
  seasonNumber: 1,
  gameSeed: '',
  events: [],
  activeModifiers: [],

  setPhase: (phase) => {
    set({ currentPhase: phase });
  },

  advanceSeason: () => {
    set((state) => ({
      seasonNumber: state.seasonNumber + 1,
      currentPhase: 'summer_window' as GamePhase,
      events: [],
      activeModifiers: [],
    }));
  },

  setGameSeed: (seed) => {
    set({ gameSeed: seed });
  },

  addEvent: (event) => {
    set((state) => ({ events: [...state.events, event] }));
  },

  clearEvents: () => {
    set({ events: [] });
  },

  addModifier: (modifier) => {
    set((state) => ({
      activeModifiers: [...state.activeModifiers, modifier],
    }));
  },

  removeModifier: (modifierId) => {
    set((state) => ({
      activeModifiers: state.activeModifiers.filter((m) => m.id !== modifierId),
    }));
  },

  clearExpiredModifiers: (currentPhase) => {
    set((state) => ({
      activeModifiers: state.activeModifiers.filter(
        (m) => m.expiresAt !== currentPhase,
      ),
    }));
  },
});
