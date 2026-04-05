import type { StateCreator } from 'zustand';
import type { GameState } from '../types/store';
import type { Player, Club, ClubData, GamePhase, StartingXIMap } from '../types/entities';
import type { Formation } from '../engine/matchSim';
import type { MonthlyXIRecord } from '../engine/startingXI';

export interface TeamSlice {
  clubs: Club[];
  tempFillIns: Player[];
  startingXI: StartingXIMap;
  startingXIHistory: MonthlyXIRecord[];

  initializeClubs: (clubsData: ClubData[], squads: Map<string, Player[]>) => void;
  getClub: (clubId: string) => Club | undefined;
  getRoster: (clubId: string) => Player[];
  updatePlayer: (clubId: string, playerId: string, updates: Partial<Player>) => void;
  addPlayerToClub: (clubId: string, player: Player) => void;
  removePlayerFromClub: (clubId: string, playerId: string) => void;
  addTempFillIn: (fillIn: Player) => void;
  clearTempFillIns: () => void;
  resetSeasonStats: () => void;
  setStartingXI: (xi: StartingXIMap) => void;
  assignToSlot: (slot: string, playerId: string) => void;
  removeFromSlot: (slot: string) => void;
  lockStartingXI: (phase: GamePhase, formation: Formation) => void;
  clearStartingXI: () => void;
  clearStartingXIHistory: () => void;
}

export const createTeamSlice: StateCreator<GameState, [], [], TeamSlice> = (set, get) => ({
  clubs: [],
  tempFillIns: [],
  startingXI: {},
  startingXIHistory: [],

  initializeClubs: (clubsData, squads) => {
    const clubs: Club[] = clubsData.map((data) => ({
      ...data,
      roster: squads.get(data.id) || [],
    }));
    set({ clubs });
  },

  getClub: (clubId) => {
    return get().clubs.find((c) => c.id === clubId);
  },

  getRoster: (clubId) => {
    const club = get().clubs.find((c) => c.id === clubId);
    return club ? club.roster : [];
  },

  updatePlayer: (clubId, playerId, updates) => {
    set((state) => ({
      clubs: state.clubs.map((club) =>
        club.id === clubId
          ? {
              ...club,
              roster: club.roster.map((p) =>
                p.id === playerId ? { ...p, ...updates } : p,
              ),
            }
          : club,
      ),
    }));
  },

  addPlayerToClub: (clubId, player) => {
    set((state) => ({
      clubs: state.clubs.map((club) =>
        club.id === clubId
          ? { ...club, roster: [...club.roster, player] }
          : club,
      ),
    }));
  },

  removePlayerFromClub: (clubId, playerId) => {
    set((state) => ({
      clubs: state.clubs.map((club) =>
        club.id === clubId
          ? { ...club, roster: club.roster.filter((p) => p.id !== playerId) }
          : club,
      ),
    }));
  },

  addTempFillIn: (fillIn) => {
    set((state) => ({ tempFillIns: [...state.tempFillIns, fillIn] }));
  },

  clearTempFillIns: () => {
    set({ tempFillIns: [] });
  },

  resetSeasonStats: () => {
    set((state) => ({
      clubs: state.clubs.map((club) => ({
        ...club,
        roster: club.roster.map((p) => ({
          ...p,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
        })),
      })),
    }));
  },

  setStartingXI: (xi) => {
    set({ startingXI: xi });
  },

  assignToSlot: (slot, playerId) => {
    set((state) => ({
      startingXI: { ...state.startingXI, [slot]: playerId },
    }));
  },

  removeFromSlot: (slot) => {
    set((state) => {
      const newXI = { ...state.startingXI };
      delete newXI[slot];
      return { startingXI: newXI };
    });
  },

  lockStartingXI: (phase, formation) => {
    set((state) => ({
      startingXIHistory: [
        ...state.startingXIHistory,
        { phase, formation, xi: { ...state.startingXI } },
      ],
    }));
  },

  clearStartingXI: () => {
    set({ startingXI: {} });
  },

  clearStartingXIHistory: () => {
    set({ startingXIHistory: [] });
  },
});

