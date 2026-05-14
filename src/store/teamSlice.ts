import type { StateCreator } from 'zustand';
import type { GameState } from '../types/store';
import type { LeagueTableRow, Player, Club, ClubData, GamePhase, StartingXIMap } from '../types/entities';
import type { Formation } from '../engine/matchSim';
import type { MonthlyXIRecord } from '../engine/startingXI';
import {
  STARTING_REP_BY_TIER,
  recomputeClubReputations,
  tierFromReputation,
} from '../engine/clubReputation';

export interface TeamSlice {
  clubs: Club[];
  tempFillIns: Player[];
  startingXI: StartingXIMap;
  startingXIHistory: MonthlyXIRecord[];
  captainId: string | null;
  /**
   * Dynamic club reputation (0–100) by club id. Drifts up/down based on
   * season-end finish vs. expected band. Drives effective tier, which in
   * turn affects regen quality, AI buying targets, fortune ranges, and
   * bidding floors.
   */
  clubReputation: Record<string, number>;

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
  setCaptain: (playerId: string | null) => void;
  /**
   * Apply a season's final table to club reputations, then update each
   * club's `tier` to match its new reputation band. Call once at season end.
   */
  applyClubReputationsForSeason: (finalTable: LeagueTableRow[]) => void;
  /**
   * Clear the `acquiredThisWindow` flag on every player across every club.
   * Used at the season transition so the "recently signed" cooldown
   * expires roughly one year after the signing.
   */
  clearAllAcquiredFlags: () => void;
}

export const createTeamSlice: StateCreator<GameState, [], [], TeamSlice> = (set, get) => ({
  clubs: [],
  tempFillIns: [],
  startingXI: {},
  startingXIHistory: [],
  captainId: null,
  clubReputation: {},

  initializeClubs: (clubsData, squads) => {
    const clubs: Club[] = clubsData.map((data) => ({
      ...data,
      roster: squads.get(data.id) || [],
    }));
    // Seed reputation from each club's starting tier so the feature is
    // immediately consistent on game creation.
    const clubReputation: Record<string, number> = {};
    for (const data of clubsData) {
      clubReputation[data.id] = STARTING_REP_BY_TIER[data.tier] ?? 50;
    }
    set({ clubs, clubReputation });
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

  setCaptain: (playerId) => {
    set({ captainId: playerId });
  },

  applyClubReputationsForSeason: (finalTable) => {
    set((state) => {
      const currentTiers: Record<string, number> = {};
      for (const c of state.clubs) currentTiers[c.id] = c.tier;
      const nextRep = recomputeClubReputations(finalTable, currentTiers, state.clubReputation);
      const clubs = state.clubs.map((c) => ({
        ...c,
        tier: tierFromReputation(nextRep[c.id] ?? 50),
      }));
      return { clubs, clubReputation: nextRep };
    });
  },

  clearAllAcquiredFlags: () => {
    set((state) => ({
      clubs: state.clubs.map((c) => ({
        ...c,
        roster: c.roster.map((p) =>
          p.acquiredThisWindow ? { ...p, acquiredThisWindow: false } : p,
        ),
      })),
    }));
  },
});

