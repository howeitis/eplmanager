import type { StateCreator } from 'zustand';
import type { GameState } from '@/types/store';
import type {
  ManagerProfile,
  ManagerAccomplishment,
  BoardExpectation,
  SeasonHistory,
  SaveMetadata,
  BinderCard,
} from '@/types/entities';

export interface MetaSlice {
  manager: ManagerProfile | null;
  boardExpectation: BoardExpectation | null;
  seasonHistories: SeasonHistory[];
  saveSlot: number | null;
  saveMetadata: SaveMetadata | null;
  /**
   * Phase B: tactic-card collection. Every id here is one the manager has
   * unlocked (via starter grant, season-end mint, etc.). Today this only
   * tracks Instruction cards — Shape/Tempo are universal at career start.
   */
  ownedTacticCards: string[];
  /**
   * Phase B: the manager's currently-equipped Instruction card id, or null
   * when the slot is empty. Persists across sessions so the loadout is
   * sticky between matches.
   */
  activeInstructionCardId: string | null;

  setManager: (profile: ManagerProfile) => void;
  updateReputation: (delta: number) => void;
  setBoardExpectation: (expectation: BoardExpectation) => void;
  addSeasonHistory: (history: SeasonHistory) => void;
  setSaveSlot: (slot: number) => void;
  setSaveMetadata: (metadata: SaveMetadata) => void;
  addAccomplishment: (accomplishment: ManagerAccomplishment) => void;
  updateCurrentTenure: (updates: Partial<{ gamesManaged: number; leagueTitles: number; faCups: number; bestLeagueFinish: number }>) => void;
  incrementManagerAge: () => void;
  endCurrentTenure: (endSeason: number) => void;
  startNewTenure: (clubId: string, startSeason: number) => void;
  /**
   * Mint one or more binder cards onto the manager's career collection.
   * Dedupes by card id — calling twice with the same id is a no-op,
   * so retry/replay-safe at every call site.
   */
  addBinderCards: (cards: BinderCard[]) => void;
  /**
   * Remove a single binder card by id. Used by the binder's per-card
   * delete affordance — the card is gone permanently from this save,
   * which is the desired UX (no undo). No-op if the id isn't present.
   */
  removeBinderCard: (cardId: string) => void;
  /**
   * Phase B: grant tactic card(s) to the manager. Dedupes by id (calling
   * twice with the same id is a no-op), so retry/replay-safe.
   */
  addOwnedTacticCards: (ids: string[]) => void;
  /** Phase B: equip an instruction card, or unequip with null. */
  setActiveInstructionCardId: (id: string | null) => void;
  /** Phase B: wipe the tactic collection (used by new-game / load flows). */
  resetTacticCollection: (ownedIds: string[], activeInstruction: string | null) => void;
}

export const createMetaSlice: StateCreator<GameState, [], [], MetaSlice> = (set) => ({
  manager: null,
  boardExpectation: null,
  seasonHistories: [],
  saveSlot: null,
  saveMetadata: null,
  ownedTacticCards: [],
  activeInstructionCardId: null,

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

  addAccomplishment: (accomplishment) => {
    set((state) => {
      if (!state.manager) return {};
      return {
        manager: {
          ...state.manager,
          accomplishments: [...state.manager.accomplishments, accomplishment],
        },
      };
    });
  },

  updateCurrentTenure: (updates) => {
    set((state) => {
      if (!state.manager || state.manager.tenures.length === 0) return {};
      const tenures = [...state.manager.tenures];
      const current = { ...tenures[tenures.length - 1] };
      if (updates.gamesManaged !== undefined) current.gamesManaged = updates.gamesManaged;
      if (updates.leagueTitles !== undefined) current.leagueTitles = updates.leagueTitles;
      if (updates.faCups !== undefined) current.faCups = updates.faCups;
      if (updates.bestLeagueFinish !== undefined) {
        current.bestLeagueFinish = Math.min(current.bestLeagueFinish, updates.bestLeagueFinish);
      }
      tenures[tenures.length - 1] = current;
      return { manager: { ...state.manager, tenures } };
    });
  },

  incrementManagerAge: () => {
    set((state) => {
      if (!state.manager) return {};
      return { manager: { ...state.manager, age: state.manager.age + 1 } };
    });
  },

  endCurrentTenure: (endSeason) => {
    set((state) => {
      if (!state.manager || state.manager.tenures.length === 0) return {};
      const tenures = [...state.manager.tenures];
      const current = tenures[tenures.length - 1];
      if (current.endSeason) return {};
      tenures[tenures.length - 1] = { ...current, endSeason };
      return { manager: { ...state.manager, tenures } };
    });
  },

  startNewTenure: (clubId, startSeason) => {
    set((state) => {
      if (!state.manager) return {};
      const newTenure = {
        clubId,
        startSeason,
        gamesManaged: 0,
        leagueTitles: 0,
        faCups: 0,
        bestLeagueFinish: 20,
      };
      return {
        manager: {
          ...state.manager,
          clubId,
          tenures: [...state.manager.tenures, newTenure],
        },
      };
    });
  },

  addBinderCards: (cards) => {
    if (cards.length === 0) return;
    set((state) => {
      if (!state.manager) return {};
      const existing = state.manager.binder ?? [];
      const seen = new Set(existing.map((c) => c.id));
      const fresh: BinderCard[] = [];
      for (const card of cards) {
        if (seen.has(card.id)) continue;
        seen.add(card.id);
        fresh.push(card);
      }
      if (fresh.length === 0) return {};
      return { manager: { ...state.manager, binder: [...existing, ...fresh] } };
    });
  },

  removeBinderCard: (cardId) => {
    set((state) => {
      if (!state.manager?.binder) return {};
      const next = state.manager.binder.filter((c) => c.id !== cardId);
      if (next.length === state.manager.binder.length) return {};
      return { manager: { ...state.manager, binder: next } };
    });
  },

  addOwnedTacticCards: (ids) => {
    if (ids.length === 0) return;
    set((state) => {
      const owned = new Set(state.ownedTacticCards);
      const fresh: string[] = [];
      for (const id of ids) {
        if (owned.has(id)) continue;
        owned.add(id);
        fresh.push(id);
      }
      if (fresh.length === 0) return {};
      return { ownedTacticCards: [...state.ownedTacticCards, ...fresh] };
    });
  },

  setActiveInstructionCardId: (id) => {
    set({ activeInstructionCardId: id });
  },

  resetTacticCollection: (ownedIds, activeInstruction) => {
    set({
      ownedTacticCards: [...ownedIds],
      activeInstructionCardId: activeInstruction,
    });
  },
});
