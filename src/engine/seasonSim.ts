import type {
  Club,
  MatchResult,
  LeagueTableRow,
  GamePhase,
  SeasonEvent,
  ActiveModifier,
} from '@/types/entities';
import { SeededRNG } from '@/utils/rng';
import { seasonSeed as deriveSeasonSeed } from '@/utils/rng';
import {
  type Formation,
  type Mentality,
  type ClubFortune,
  type InjuryReport,
  generateFixtures,
  getMonthFixtures,
  getInSeasonPhases,
  simulateMatch,
  createEmptyTable,
  updateTable,
  sortTable,
  getLeaguePosition,
  selectAIFormation,
  selectAIMentality,
  generateSeasonFortunes,
  processInjuries,
  healInjuries,
  updatePlayerForm,
} from './matchSim';
import { generateMonthlyEvents } from './events';
import { processLeagueAging, type AgingResult } from './aging';
// Reputation functions available for future use:
// import { calculateSeasonReputationChange, calculateSeasonEndBudget, calculateBoardExpectation, type ReputationResult } from './reputation';

// ─── Season Simulation Types ───

export interface MonthResult {
  phase: GamePhase;
  results: MatchResult[];
  injuries: InjuryReport[];
  tableSnapshot: LeagueTableRow[];
  events: SeasonEvent[];
  modifiers: ActiveModifier[];
}

export interface SeasonResult {
  seasonNumber: number;
  finalTable: LeagueTableRow[];
  monthResults: MonthResult[];
  topScorer: { playerId: string; clubId: string; goals: number } | null;
  allPlayerGoals: Map<string, { clubId: string; goals: number; name: string }>;
  faCupWinner: string | null;
  agingResults: AgingResult[];
  allEvents: SeasonEvent[];
}

export interface ClubSeasonConfig {
  clubId: string;
  formation: Formation;
  mentality: Mentality;
}

// ─── Headless Full Season Simulation ───

/**
 * Simulate an entire season headlessly. Used for balance testing.
 * All 20 teams are AI-controlled (formations/mentality chosen automatically).
 */
export function simulateFullSeason(
  gameSeed: string,
  seasonNumber: number,
  clubs: Club[],
  previousFortunes?: ClubFortune[],
): SeasonResult {
  const sSeed = deriveSeasonSeed(gameSeed, seasonNumber);
  const rng = new SeededRNG(sSeed);

  // Generate fixtures
  const clubIds = clubs.map((c) => c.id);
  const fixtures = generateFixtures(rng, clubIds);

  // Generate season fortunes
  const fortunes = generateSeasonFortunes(
    rng,
    clubs.map((c) => ({ id: c.id, tier: c.tier })),
    previousFortunes,
  );

  // Initialize league table
  let table = createEmptyTable(clubIds);

  // Track goals per player across the season
  const playerGoals = new Map<string, { clubId: string; goals: number; name: string }>();
  const playerAssists = new Map<string, { clubId: string; assists: number; name: string }>();

  // Deep clone clubs so mutations don't leak
  const seasonClubs = clubs.map((c) => ({
    ...c,
    roster: c.roster.map((p) => ({ ...p })),
  }));

  const clubMap = new Map<string, Club>();
  for (const club of seasonClubs) {
    clubMap.set(club.id, club);
  }

  const fortuneMap = new Map<string, number>();
  for (const f of fortunes) {
    fortuneMap.set(f.clubId, f.fortune);
  }

  const monthResults: MonthResult[] = [];
  const allEvents: SeasonEvent[] = [];
  const firedThisSeason = new Map<string, number>();
  const phases = getInSeasonPhases();

  // Track recent results for event conditions
  const recentResultsMap = new Map<string, { wins: number; losses: number; total: number }>();

  // ─── Monthly Phase Loop ───
  for (const phase of phases) {
    const monthFixtures = getMonthFixtures(fixtures, phase);
    const monthRng = new SeededRNG(`${sSeed}-month-${phase}`);

    // AI selects formation/mentality for each club
    const aiDecisions = new Map<string, { formation: Formation; mentality: Mentality }>();
    for (const club of seasonClubs) {
      const pos = getLeaguePosition(table, club.id);
      const formation = selectAIFormation(monthRng, club.tier);
      const mentality = selectAIMentality(monthRng, club.tier, pos || 10, 20);
      aiDecisions.set(club.id, { formation, mentality });
    }

    // Simulate each match
    const results: MatchResult[] = [];
    for (const fixture of monthFixtures) {
      const homeClub = clubMap.get(fixture.homeClubId)!;
      const awayClub = clubMap.get(fixture.awayClubId)!;
      const homeDecision = aiDecisions.get(homeClub.id)!;
      const awayDecision = aiDecisions.get(awayClub.id)!;

      const result = simulateMatch({
        homeClub,
        awayClub,
        fixture,
        homeFormation: homeDecision.formation,
        awayFormation: awayDecision.formation,
        homeMentality: homeDecision.mentality,
        awayMentality: awayDecision.mentality,
        homeFortune: fortuneMap.get(homeClub.id) || 0,
        awayFortune: fortuneMap.get(awayClub.id) || 0,
        seasonSeed: sSeed,
      });

      results.push(result);

      // Update table
      table = updateTable(table, result);

      // Track goals and assists
      for (const scorer of result.scorers) {
        const existing = playerGoals.get(scorer.playerId);
        if (existing) {
          existing.goals++;
        } else {
          const club = scorer.isHome ? homeClub : awayClub;
          const player = club.roster.find((p) => p.id === scorer.playerId);
          playerGoals.set(scorer.playerId, {
            clubId: club.id,
            goals: 1,
            name: player?.name || 'Unknown',
          });
        }
        // Also update the player object directly for ongoing tracking
        const club = scorer.isHome ? homeClub : awayClub;
        const player = club.roster.find((p) => p.id === scorer.playerId);
        if (player) player.goals++;
      }

      for (const assister of result.assisters) {
        const existing = playerAssists.get(assister.playerId);
        if (existing) {
          existing.assists++;
        } else {
          const club = assister.isHome ? homeClub : awayClub;
          const player = club.roster.find((p) => p.id === assister.playerId);
          playerAssists.set(assister.playerId, {
            clubId: club.id,
            assists: 1,
            name: player?.name || 'Unknown',
          });
        }
        const club = assister.isHome ? homeClub : awayClub;
        const player = club.roster.find((p) => p.id === assister.playerId);
        if (player) player.assists++;
      }

      // Clean sheets
      if (result.awayGoals === 0) {
        for (const p of homeClub.roster) {
          if (['GK', 'CB', 'FB'].includes(p.position) && !p.injured) {
            p.cleanSheets++;
          }
        }
      }
      if (result.homeGoals === 0) {
        for (const p of awayClub.roster) {
          if (['GK', 'CB', 'FB'].includes(p.position) && !p.injured) {
            p.cleanSheets++;
          }
        }
      }
    }

    // Process injuries for each club
    const allInjuries: InjuryReport[] = [];
    for (const club of seasonClubs) {
      const injuryRng = new SeededRNG(`${sSeed}-injuries-${phase}-${club.id}`);

      // Heal existing injuries first
      healInjuries(club.roster);

      // Process new injuries
      const newInjuries = processInjuries(injuryRng, club.roster, club.id);
      for (const injury of newInjuries) {
        const player = club.roster.find((p) => p.id === injury.playerId);
        if (player) {
          player.injured = true;
          player.injuryWeeks = injury.weeksOut;
        }
      }
      allInjuries.push(...newInjuries);
    }

    // Update form for all players
    for (const club of seasonClubs) {
      const formRng = new SeededRNG(`${sSeed}-form-${phase}-${club.id}`);
      for (const player of club.roster) {
        if (!player.isTemporary) {
          player.form = updatePlayerForm(formRng, player);
        }
      }
    }

    // Update recent results for event conditions
    for (const result of results) {
      for (const cid of [result.homeClubId, result.awayClubId]) {
        const existing = recentResultsMap.get(cid) || { wins: 0, losses: 0, total: 0 };
        const isHome = cid === result.homeClubId;
        const won = isHome
          ? result.homeGoals > result.awayGoals
          : result.awayGoals > result.homeGoals;
        const lost = isHome
          ? result.homeGoals < result.awayGoals
          : result.awayGoals < result.homeGoals;
        existing.wins += won ? 1 : 0;
        existing.losses += lost ? 1 : 0;
        existing.total++;
        recentResultsMap.set(cid, existing);
      }
    }

    // Generate events for the player's club (first club as proxy in headless sim)
    const eventRng = new SeededRNG(`${sSeed}-events-${phase}`);
    const eventBatch = generateMonthlyEvents(eventRng, {
      playerClubId: seasonClubs[0].id,
      clubs: seasonClubs,
      phase,
      seasonNumber,
      managerReputation: 50,
      recentResults: Array.from(recentResultsMap.entries()).map(([clubId, r]) => ({ clubId, ...r })),
      firedThisSeason,
      seasonSeed: sSeed,
    });

    allEvents.push(...eventBatch.events);

    table = sortTable(table);

    monthResults.push({
      phase,
      results,
      injuries: allInjuries,
      tableSnapshot: [...table],
      events: eventBatch.events,
      modifiers: eventBatch.modifiers,
    });
  }

  // Process aging at season end
  const agingRng = new SeededRNG(`${sSeed}-aging`);
  const agingResults = processLeagueAging(agingRng, seasonClubs, seasonNumber);

  // Find top scorer
  let topScorer: { playerId: string; clubId: string; goals: number } | null = null;
  for (const [playerId, data] of playerGoals) {
    if (!topScorer || data.goals > topScorer.goals) {
      topScorer = { playerId, clubId: data.clubId, goals: data.goals };
    }
  }

  return {
    seasonNumber,
    finalTable: sortTable(table),
    monthResults,
    topScorer,
    allPlayerGoals: playerGoals,
    faCupWinner: null, // Will be set by FA Cup integration
    agingResults,
    allEvents,
  };
}

/**
 * Lightweight season sim that only returns the final table and key stats.
 * Used for the 100-season balance validation to avoid OOM.
 */
export interface LightweightSeasonResult {
  finalTable: LeagueTableRow[];
  topScorerGoals: number;
  fortunes: ClubFortune[];
}

export function simulateLightweightSeason(
  gameSeed: string,
  seasonNumber: number,
  clubs: Club[],
  previousFortunes?: ClubFortune[],
): LightweightSeasonResult {
  const sSeed = deriveSeasonSeed(gameSeed, seasonNumber);
  const rng = new SeededRNG(sSeed);

  const clubIds = clubs.map((c) => c.id);
  const fixtures = generateFixtures(rng, clubIds);

  const fortunes = generateSeasonFortunes(
    rng,
    clubs.map((c) => ({ id: c.id, tier: c.tier })),
    previousFortunes,
  );

  let table = createEmptyTable(clubIds);

  // Deep clone rosters for mutation
  const seasonClubs = clubs.map((c) => ({
    ...c,
    roster: c.roster.map((p) => ({ ...p })),
  }));

  const clubMap = new Map<string, Club>();
  for (const club of seasonClubs) {
    clubMap.set(club.id, club);
  }

  const fortuneMap = new Map<string, number>();
  for (const f of fortunes) {
    fortuneMap.set(f.clubId, f.fortune);
  }

  // Track top scorer only
  const playerGoalCounts = new Map<string, number>();

  const phases = getInSeasonPhases();

  for (const phase of phases) {
    const monthFixtures = getMonthFixtures(fixtures, phase);
    const monthRng = new SeededRNG(`${sSeed}-month-${phase}`);

    const aiDecisions = new Map<string, { formation: Formation; mentality: Mentality }>();
    for (const club of seasonClubs) {
      const pos = getLeaguePosition(table, club.id);
      const formation = selectAIFormation(monthRng, club.tier);
      const mentality = selectAIMentality(monthRng, club.tier, pos || 10, 20);
      aiDecisions.set(club.id, { formation, mentality });
    }

    for (const fixture of monthFixtures) {
      const homeClub = clubMap.get(fixture.homeClubId)!;
      const awayClub = clubMap.get(fixture.awayClubId)!;
      const homeDecision = aiDecisions.get(homeClub.id)!;
      const awayDecision = aiDecisions.get(awayClub.id)!;

      const result = simulateMatch({
        homeClub,
        awayClub,
        fixture,
        homeFormation: homeDecision.formation,
        awayFormation: awayDecision.formation,
        homeMentality: homeDecision.mentality,
        awayMentality: awayDecision.mentality,
        homeFortune: fortuneMap.get(homeClub.id) || 0,
        awayFortune: fortuneMap.get(awayClub.id) || 0,
        seasonSeed: sSeed,
      });

      table = updateTable(table, result);

      // Track goal counts
      for (const scorer of result.scorers) {
        playerGoalCounts.set(
          scorer.playerId,
          (playerGoalCounts.get(scorer.playerId) || 0) + 1,
        );
      }
    }

    // Process injuries and healing
    for (const club of seasonClubs) {
      const injuryRng = new SeededRNG(`${sSeed}-injuries-${phase}-${club.id}`);
      healInjuries(club.roster);
      const newInjuries = processInjuries(injuryRng, club.roster, club.id);
      for (const injury of newInjuries) {
        const player = club.roster.find((p) => p.id === injury.playerId);
        if (player) {
          player.injured = true;
          player.injuryWeeks = injury.weeksOut;
        }
      }
    }

    // Update form
    for (const club of seasonClubs) {
      const formRng = new SeededRNG(`${sSeed}-form-${phase}-${club.id}`);
      for (const player of club.roster) {
        if (!player.isTemporary) {
          player.form = updatePlayerForm(formRng, player);
        }
      }
    }

    table = sortTable(table);
  }

  // Find top scorer goals
  let topScorerGoals = 0;
  for (const goals of playerGoalCounts.values()) {
    if (goals > topScorerGoals) topScorerGoals = goals;
  }

  return {
    finalTable: sortTable(table),
    topScorerGoals,
    fortunes,
  };
}
