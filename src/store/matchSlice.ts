import type { StateCreator } from 'zustand';
import type { GameState } from '../types/store';
import type { Fixture, MatchResult, LeagueTableRow } from '../types/entities';

export interface MatchSlice {
  fixtures: Fixture[];
  leagueTable: LeagueTableRow[];

  initializeFixtures: (fixtures: Fixture[]) => void;
  initializeLeagueTable: (clubIds: string[]) => void;
  recordResult: (fixtureId: string, result: MatchResult) => void;
  getFixturesForGameweek: (gameweek: number) => Fixture[];
  resetMatchData: () => void;
}

function updateTableWithResult(
  table: LeagueTableRow[],
  result: MatchResult,
): LeagueTableRow[] {
  return table.map((row) => {
    if (row.clubId === result.homeClubId) {
      const won = result.homeGoals > result.awayGoals;
      const drawn = result.homeGoals === result.awayGoals;
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (won ? 1 : 0),
        drawn: row.drawn + (drawn ? 1 : 0),
        lost: row.lost + (!won && !drawn ? 1 : 0),
        goalsFor: row.goalsFor + result.homeGoals,
        goalsAgainst: row.goalsAgainst + result.awayGoals,
        goalDifference: row.goalDifference + result.homeGoals - result.awayGoals,
        points: row.points + (won ? 3 : drawn ? 1 : 0),
      };
    }
    if (row.clubId === result.awayClubId) {
      const won = result.awayGoals > result.homeGoals;
      const drawn = result.homeGoals === result.awayGoals;
      return {
        ...row,
        played: row.played + 1,
        won: row.won + (won ? 1 : 0),
        drawn: row.drawn + (drawn ? 1 : 0),
        lost: row.lost + (!won && !drawn ? 1 : 0),
        goalsFor: row.goalsFor + result.awayGoals,
        goalsAgainst: row.goalsAgainst + result.homeGoals,
        goalDifference: row.goalDifference + result.awayGoals - result.homeGoals,
        points: row.points + (won ? 3 : drawn ? 1 : 0),
      };
    }
    return row;
  });
}

function sortTable(table: LeagueTableRow[]): LeagueTableRow[] {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

export const createMatchSlice: StateCreator<GameState, [], [], MatchSlice> = (set, get) => ({
  fixtures: [],
  leagueTable: [],

  initializeFixtures: (fixtures) => {
    set({ fixtures });
  },

  initializeLeagueTable: (clubIds) => {
    const table: LeagueTableRow[] = clubIds.map((clubId) => ({
      clubId,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));
    set({ leagueTable: table });
  },

  recordResult: (fixtureId, result) => {
    set((state) => {
      const fixtures = state.fixtures.map((f) =>
        f.id === fixtureId ? { ...f, played: true, result } : f,
      );
      const leagueTable = sortTable(updateTableWithResult(state.leagueTable, result));
      return { fixtures, leagueTable };
    });
  },

  getFixturesForGameweek: (gameweek) => {
    return get().fixtures.filter((f) => f.gameweek === gameweek);
  },

  resetMatchData: () => {
    set({ fixtures: [], leagueTable: [] });
  },
});
