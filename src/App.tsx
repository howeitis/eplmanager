import { useState, useCallback, useMemo } from 'react';
import './index.css';
import { SaveSlotSelect } from './components/shared/SaveSlotSelect';
import { ClubSelect } from './components/shared/ClubSelect';
import { TransferCenter } from './components/transfers/TransferCenter';
import { GameHub } from './components/hub/GameHub';
import { SquadScreen } from './components/squad/SquadScreen';
import { ClubSquadScreen } from './components/squad/ClubSquadScreen';
import { MatchResults } from './components/match/MatchResults';
import { SeasonEnd } from './components/season/SeasonEnd';
import { SeasonHistoryScreen } from './components/history/SeasonHistory';
import { BottomNav, type NavTab } from './components/shared/BottomNav';
import { DesktopSidebar } from './components/shared/DesktopSidebar';
import { PlayerDetailModal } from './components/shared/PlayerDetailModal';
import { NavigationContext } from './hooks/useNavigation';
import { useGameStore } from './store/gameStore';
import { CLUBS } from './data/clubs';
import { generateAllSquads } from './engine/playerGen';
import { saveGame, loadGame } from './utils/save';
import { SeededRNG, seasonSeed as deriveSeasonSeed } from './utils/rng';
import {
  generateFixtures,
  getMonthFixtures,
  simulateMatch,
  selectAIFormation,
  selectAIMentality,
  processInjuries,
  healInjuries,
  updatePlayerForm,
  generateSeasonFortunes,
  getLeaguePosition,
  type Formation,
  type Mentality,
  type ClubFortune,
} from './engine/matchSim';
import {
  autoSelectXI,
  autoSwapInjuredPlayers,
  validateXI,
  type XISwap,
} from './engine/startingXI';
import { generateMonthlyEvents } from './engine/events';
import { simulateFACup } from './engine/faCup';
import { processLeagueAging } from './engine/aging';
import {
  calculateSeasonReputationChange,
  calculateSeasonEndBudget,
  calculateBoardExpectation,
} from './engine/reputation';
import type {
  ClubData,
  SaveMetadata,
  GamePhase,
  Fixture,
  SeasonEvent,
  SeasonPlayerStats,
} from './types/entities';

type Screen = 'save_select' | 'club_select' | 'game';
type GameView = 'hub' | 'squad' | 'transfers' | 'history' | 'match_results' | 'season_end' | 'club_squad';

const PHASE_ORDER: GamePhase[] = [
  'summer_window', 'august', 'september', 'october', 'november', 'december',
  'january_window', 'january', 'february', 'march', 'april', 'may', 'season_end',
];

const MONTH_LABELS: Record<GamePhase, string> = {
  summer_window: 'Summer Transfer Window',
  august: 'August',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December',
  january_window: 'January Transfer Window',
  january: 'January',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  season_end: 'Season End',
};

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

function App() {
  const [screen, setScreen] = useState<Screen>('save_select');
  const [gameView, setGameView] = useState<GameView>('hub');
  const [viewingClubId, setViewingClubId] = useState<string | null>(null);
  const [_viewHistory, setViewHistory] = useState<GameView[]>([]);
  const [formation, setFormation] = useState<Formation>('4-4-2');
  const [mentality, setMentality] = useState<Mentality>('balanced');
  const [monthFixtures, setMonthFixtures] = useState<Fixture[]>([]);
  const [monthEvents, setMonthEvents] = useState<SeasonEvent[]>([]);
  const [fortunes, setFortunes] = useState<ClubFortune[]>([]);
  const [faCupWinner, setFaCupWinner] = useState<string | null>(null);
  const [xiNotifications, setXiNotifications] = useState<XISwap[]>([]);
  const store = useGameStore;
  const managerClubId = useGameStore((s) => s.manager?.clubId);

  // ─── Save/Load handlers ───

  const handleSelectSlot = useCallback(async (slot: number, isExisting: boolean) => {
    if (isExisting) {
      const data = await loadGame(slot);
      if (data) {
        const state = store.getState();
        store.setState({
          clubs: data.clubs as typeof state.clubs,
          fixtures: data.fixtures as typeof state.fixtures,
          leagueTable: data.leagueTable as typeof state.leagueTable,
          budgets: data.budgets,
          transferHistory: data.transferHistory as typeof state.transferHistory,
          currentPhase: data.currentPhase as typeof state.currentPhase,
          seasonNumber: data.seasonNumber,
          gameSeed: data.gameSeed,
          events: data.events as typeof state.events,
          activeModifiers: data.activeModifiers as typeof state.activeModifiers,
          manager: data.manager as typeof state.manager,
          boardExpectation: data.boardExpectation as typeof state.boardExpectation,
          seasonHistories: data.seasonHistories as typeof state.seasonHistories,
          saveSlot: data.saveSlot,
          saveMetadata: data.saveMetadata,
          startingXI: data.startingXI || {},
          startingXIHistory: (data.startingXIHistory || []) as typeof state.startingXIHistory,
          tempFillIns: [],
          transferOffers: [],
          marketListings: [],
          tickerMessages: [],
          shortlist: (data as Record<string, unknown>).shortlist as string[] || [],
          shortlistNotifications: [],
        });
        setScreen('game');
        setGameView('hub');
      }
    } else {
      store.getState().setSaveSlot(slot);
      setScreen('club_select');
    }
  }, [store]);

  const handleSelectClub = useCallback(async (club: ClubData) => {
    const state = store.getState();
    const slot = state.saveSlot!;

    const gameSeed = `plm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    state.setGameSeed(gameSeed);

    const squads = generateAllSquads(gameSeed, CLUBS);
    state.initializeClubs(CLUBS, squads);

    const budgets: Record<string, number> = {};
    for (const c of CLUBS) {
      budgets[c.id] = c.budget;
    }
    state.initializeBudgets(budgets);
    state.initializeLeagueTable(CLUBS.map((c) => c.id));

    state.setManager({ name: 'Manager', clubId: club.id, reputation: 50 });

    const expectations: Record<number, { minPosition: number; description: string }> = {
      1: { minPosition: 4, description: 'Top 4 finish' },
      2: { minPosition: 8, description: 'Top half finish' },
      3: { minPosition: 12, description: 'Mid-table stability' },
      4: { minPosition: 16, description: 'Avoid relegation zone' },
      5: { minPosition: 18, description: 'Survive relegation' },
    };
    state.setBoardExpectation(expectations[club.tier]);

    const metadata: SaveMetadata = {
      slot,
      clubId: club.id,
      clubName: club.name,
      seasonNumber: 1,
      leaguePosition: 0,
      lastSaved: new Date().toISOString(),
    };
    state.setSaveMetadata(metadata);

    // Generate fixtures for the first season
    const sSeed = deriveSeasonSeed(gameSeed, 1);
    const rng = new SeededRNG(sSeed);
    const fixtures = generateFixtures(rng, CLUBS.map((c) => c.id));
    state.initializeFixtures(fixtures);

    // Generate fortunes
    const seasonFortunes = generateSeasonFortunes(
      rng,
      CLUBS.map((c) => ({ id: c.id, tier: c.tier })),
    );
    setFortunes(seasonFortunes);

    await saveGame(slot, store.getState());

    setScreen('game');
    setGameView('hub');
  }, [store]);

  // ─── Game advance logic ───

  const handleAdvance = useCallback(async () => {
    const state = store.getState();
    const { currentPhase, gameSeed, seasonNumber, manager, clubs } = state;
    const playerClubId = manager!.clubId;
    const sSeed = deriveSeasonSeed(gameSeed, seasonNumber);

    if (currentPhase === 'summer_window' || currentPhase === 'january_window') {
      // --- Offer expiry: clear all pending offers at window close ---
      const pendingOffers = state.transferOffers;
      const pendingOutgoing = pendingOffers.filter((o) => o.direction === 'outgoing' && (o.status === 'pending' || o.status === 'countered'));
      const pendingIncoming = pendingOffers.filter((o) => o.direction === 'incoming' && o.status === 'pending');

      if (pendingOutgoing.length > 0) {
        state.addTickerMessage(`Window closed — ${pendingOutgoing.length} pending bid${pendingOutgoing.length !== 1 ? 's' : ''} withdrawn.`);
      }
      if (pendingIncoming.length > 0) {
        state.addTickerMessage(`Window closed — ${pendingIncoming.length} incoming bid${pendingIncoming.length !== 1 ? 's' : ''} withdrawn.`);
      }
      state.clearTransferOffers();
      state.clearMarketListings();
      state.setFeaturedSlots([]);
      state.setFeaturedRefillIndex(0);
      state.resetMarketFilters();

      if (currentPhase === 'summer_window') {
        // Advance past summer window to August
        state.setPhase('august');
        // Generate fixtures if not already
        if (state.fixtures.length === 0) {
          const rng = new SeededRNG(sSeed);
          const fixtures = generateFixtures(rng, clubs.map((c) => c.id));
          state.initializeFixtures(fixtures);
        }
        // Generate fortunes if empty
        if (fortunes.length === 0) {
          const rng = new SeededRNG(sSeed);
          const seasonFortunes = generateSeasonFortunes(
            rng,
            clubs.map((c) => ({ id: c.id, tier: c.tier })),
          );
          setFortunes(seasonFortunes);
        }
        // Auto-populate Starting XI on first entry to season
        const playerClub = clubs.find((c) => c.id === playerClubId);
        if (playerClub && Object.keys(state.startingXI).length === 0) {
          const xi = autoSelectXI(formation, playerClub.roster);
          state.setStartingXI(xi);
        }
      } else {
        // january_window → january matches
        state.setPhase('january');
      }

      await saveGame(state.saveSlot!, store.getState());
      setGameView('hub');
      return;
    }

    if (currentPhase === 'season_end') {
      // Process season end
      handleSeasonEnd();
      return;
    }

    // Monthly phase: Starting XI management before simulation
    const playerClub = clubs.find((c) => c.id === playerClubId);
    if (playerClub) {
      // Auto-populate if XI is empty (first entry to this month)
      let currentXI = state.startingXI;
      if (Object.keys(currentXI).length === 0) {
        currentXI = autoSelectXI(formation, playerClub.roster);
        state.setStartingXI(currentXI);
      }

      // Auto-swap injured starters (silent notification, not blocking)
      const swapResult = autoSwapInjuredPlayers(currentXI, formation, playerClub.roster);
      if (swapResult.swaps.length > 0) {
        state.setStartingXI(swapResult.newXI);
        setXiNotifications(swapResult.swaps);
        currentXI = swapResult.newXI;
      }

      // Validate XI — block if < 11 players
      const validation = validateXI(currentXI, formation, playerClub.roster);
      if (!validation.valid) {
        // Can't advance — stay on hub, user sees the error through SquadScreen
        return;
      }

      // Lock XI to history (immutable snapshot for this month)
      state.lockStartingXI(currentPhase, formation);
    }

    // Monthly phase: simulate matches
    simulateMonth(currentPhase, sSeed, playerClubId);
  }, [store, fortunes, formation]);

  const simulateMonth = useCallback((phase: GamePhase, sSeed: string, playerClubId: string) => {
    const state = store.getState();
    const { clubs, fixtures, leagueTable } = state;
    const monthRng = new SeededRNG(`${sSeed}-month-${phase}`);

    const fortuneMap = new Map<string, number>();
    for (const f of fortunes) {
      fortuneMap.set(f.clubId, f.fortune);
    }

    // Get month's fixtures
    const monthFixs = getMonthFixtures(fixtures, phase);
    const results: import('./types/entities').MatchResult[] = [];

    for (const fixture of monthFixs) {
      if (fixture.played) continue;

      const homeClub = clubs.find((c) => c.id === fixture.homeClubId)!;
      const awayClub = clubs.find((c) => c.id === fixture.awayClubId)!;

      // Player's team uses their formation/mentality, AI uses auto-selected
      const isPlayerHome = homeClub.id === playerClubId;
      const isPlayerAway = awayClub.id === playerClubId;

      const homePos = getLeaguePosition(leagueTable, homeClub.id) || 10;
      const awayPos = getLeaguePosition(leagueTable, awayClub.id) || 10;

      const homeFormation = isPlayerHome ? formation : selectAIFormation(monthRng, homeClub.tier);
      const awayFormation = isPlayerAway ? formation : selectAIFormation(monthRng, awayClub.tier);
      const homeMentality = isPlayerHome ? mentality : selectAIMentality(monthRng, homeClub.tier, homePos, 20);
      const awayMentality = isPlayerAway ? mentality : selectAIMentality(monthRng, awayClub.tier, awayPos, 20);

      // Starting XI: player's team uses stored XI, AI teams auto-select
      const homeXI = isPlayerHome ? store.getState().startingXI : undefined;
      const awayXI = isPlayerAway ? store.getState().startingXI : undefined;

      const result = simulateMatch({
        homeClub,
        awayClub,
        fixture,
        homeFormation,
        awayFormation,
        homeMentality,
        awayMentality,
        homeFortune: fortuneMap.get(homeClub.id) || 0,
        awayFortune: fortuneMap.get(awayClub.id) || 0,
        homeReputation: isPlayerHome ? state.manager!.reputation : undefined,
        awayReputation: isPlayerAway ? state.manager!.reputation : undefined,
        homeStartingXI: homeXI,
        awayStartingXI: awayXI,
        seasonSeed: sSeed,
      });

      results.push(result);
      state.recordResult(fixture.id, result);

      // Update player goal/assist stats
      for (const scorer of result.scorers) {
        const club = scorer.isHome ? homeClub : awayClub;
        const player = club.roster.find((p) => p.id === scorer.playerId);
        if (player) {
          state.updatePlayer(club.id, player.id, { goals: player.goals + 1 });
        }
      }
      for (const assister of result.assisters) {
        const club = assister.isHome ? homeClub : awayClub;
        const player = club.roster.find((p) => p.id === assister.playerId);
        if (player) {
          state.updatePlayer(club.id, player.id, { assists: player.assists + 1 });
        }
      }
      // Clean sheets
      if (result.awayGoals === 0) {
        for (const p of homeClub.roster) {
          if (['GK', 'CB', 'FB'].includes(p.position) && !p.injured) {
            state.updatePlayer(homeClub.id, p.id, { cleanSheets: p.cleanSheets + 1 });
          }
        }
      }
      if (result.homeGoals === 0) {
        for (const p of awayClub.roster) {
          if (['GK', 'CB', 'FB'].includes(p.position) && !p.injured) {
            state.updatePlayer(awayClub.id, p.id, { cleanSheets: p.cleanSheets + 1 });
          }
        }
      }
    }

    // Process injuries
    for (const club of clubs) {
      const injuryRng = new SeededRNG(`${sSeed}-injuries-${phase}-${club.id}`);
      healInjuries(club.roster);
      const newInjuries = processInjuries(injuryRng, club.roster, club.id);
      for (const injury of newInjuries) {
        state.updatePlayer(club.id, injury.playerId, {
          injured: true,
          injuryWeeks: injury.weeksOut,
        });
      }
    }

    // Update form
    for (const club of clubs) {
      const formRng = new SeededRNG(`${sSeed}-form-${phase}-${club.id}`);
      for (const player of club.roster) {
        if (!player.isTemporary) {
          const newForm = updatePlayerForm(formRng, player);
          state.updatePlayer(club.id, player.id, { form: newForm });
        }
      }
    }

    // Generate events
    const eventRng = new SeededRNG(`${sSeed}-events-${phase}`);
    const eventBatch = generateMonthlyEvents(eventRng, {
      playerClubId,
      clubs: store.getState().clubs,
      phase,
      seasonNumber: store.getState().seasonNumber,
      managerReputation: state.manager!.reputation,
      recentResults: [],
      firedThisSeason: new Map(),
      seasonSeed: sSeed,
    });

    for (const event of eventBatch.events) {
      state.addEvent(event);
    }
    for (const mod of eventBatch.modifiers) {
      state.addModifier(mod);
    }
    if (eventBatch.reputationDelta) {
      state.updateReputation(eventBatch.reputationDelta);
    }

    // Advance to next phase
    const phaseIdx = PHASE_ORDER.indexOf(phase);
    const nextPhase = PHASE_ORDER[phaseIdx + 1];
    state.setPhase(nextPhase);

    // Store month data for results display
    setMonthFixtures(monthFixs.map((f) => {
      const result = results.find((r) => r.fixtureId === f.id);
      return result ? { ...f, played: true, result } : f;
    }));
    setMonthEvents(eventBatch.events);

    // Show match results
    setGameView('match_results');
  }, [store, formation, mentality, fortunes]);

  const handleSeasonEnd = useCallback(async () => {
    const state = store.getState();
    const { clubs, leagueTable, manager, boardExpectation, seasonNumber, gameSeed, events, budgets } = state;
    const playerClubId = manager!.clubId;
    const sSeed = deriveSeasonSeed(gameSeed, seasonNumber);

    // Sort table
    const sorted = [...leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    const playerPosition = sorted.findIndex((r) => r.clubId === playerClubId) + 1;

    // FA Cup
    const cupRng = new SeededRNG(`${sSeed}-facup`);
    const fortuneMap = new Map<string, number>();
    for (const f of fortunes) fortuneMap.set(f.clubId, f.fortune);
    const cupResult = simulateFACup(cupRng, clubs, sorted, fortuneMap, sSeed);
    setFaCupWinner(cupResult.winner);

    // Reputation change
    const repResult = calculateSeasonReputationChange(
      playerPosition,
      boardExpectation!.minPosition,
      clubDataMap.get(playerClubId)!.tier,
      manager!.reputation,
    );
    state.updateReputation(repResult.delta);

    // Collect player stats for season history
    const playerStats: SeasonPlayerStats[] = [];
    for (const club of clubs) {
      for (const player of club.roster) {
        if (!player.isTemporary && (player.goals > 0 || player.assists > 0 || player.cleanSheets > 0)) {
          playerStats.push({
            playerId: player.id,
            playerName: player.name,
            clubId: club.id,
            position: player.position,
            goals: player.goals,
            assists: player.assists,
            cleanSheets: player.cleanSheets,
            avgForm: player.form,
            overall: player.overall,
          });
        }
      }
    }

    // Save season history
    state.addSeasonHistory({
      seasonNumber,
      finalTable: sorted,
      playerStats,
      transferLog: state.transferHistory.filter((t) => t.season === seasonNumber),
      events,
    });

    // Process aging
    const agingRng = new SeededRNG(`${sSeed}-aging`);
    const agingResults = processLeagueAging(agingRng, clubs, seasonNumber);
    // Apply aging results to store
    for (const result of agingResults) {
      const club = clubs.find((c) => c.id === result.clubId);
      if (club) {
        // Re-set the club with mutated roster (aging mutates in place)
        state.initializeClubs(
          CLUBS,
          new Map(clubs.map((c) => [c.id, c.roster])),
        );
        break; // initializeClubs updates all at once
      }
    }

    // Remove retired players from shortlist
    const retiredIds = new Set(
      agingResults.flatMap((r) => r.retired.map((ret) => ret.player.id)),
    );
    const currentShortlist = state.shortlist;
    if (currentShortlist.some((id) => retiredIds.has(id))) {
      for (const id of currentShortlist) {
        if (retiredIds.has(id)) {
          state.removeFromShortlist(id);
        }
      }
    }

    // Budget replenishment
    for (const club of clubs) {
      const position = sorted.findIndex((r) => r.clubId === club.id) + 1;
      const currentBudget = budgets[club.id] || 0;
      const clubTier = clubDataMap.get(club.id)?.tier || 3;
      const budgetMod = club.id === playerClubId ? repResult.budgetModifier : 0;
      const newBudget = calculateSeasonEndBudget(currentBudget, position, clubTier, budgetMod);
      state.setBudget(club.id, newBudget);
    }

    // Reset season stats
    state.resetSeasonStats();

    // Board expectation for next season
    const updatedManager = store.getState().manager!;
    const consecutiveOver = store.getState().seasonHistories.filter((h) => {
      const s = [...h.finalTable].sort((a, b) => b.points - a.points);
      const pos = s.findIndex((r) => r.clubId === playerClubId) + 1;
      return pos <= boardExpectation!.minPosition;
    }).length;
    const newExpectation = calculateBoardExpectation(
      clubDataMap.get(playerClubId)!.tier,
      updatedManager.reputation,
      consecutiveOver,
    );
    state.setBoardExpectation({ minPosition: newExpectation.minPosition, description: newExpectation.description });

    // Show season end screen
    setGameView('season_end');
  }, [store, fortunes]);

  const handleContinueToOffSeason = useCallback(async () => {
    const state = store.getState();

    // Advance to next season
    state.advanceSeason();

    // Generate new fixtures
    const newSeasonNumber = store.getState().seasonNumber;
    const sSeed = deriveSeasonSeed(state.gameSeed, newSeasonNumber);
    const rng = new SeededRNG(sSeed);
    const clubs = store.getState().clubs;
    const fixtures = generateFixtures(rng, clubs.map((c) => c.id));
    store.getState().initializeFixtures(fixtures);
    store.getState().initializeLeagueTable(clubs.map((c) => c.id));

    // Generate new fortunes
    const seasonFortunes = generateSeasonFortunes(
      rng,
      clubs.map((c) => ({ id: c.id, tier: c.tier })),
      fortunes,
    );
    setFortunes(seasonFortunes);

    // Update save metadata
    const manager = store.getState().manager!;
    store.getState().setSaveMetadata({
      slot: store.getState().saveSlot!,
      clubId: manager.clubId,
      clubName: clubDataMap.get(manager.clubId)?.name || '',
      seasonNumber: newSeasonNumber,
      leaguePosition: 0,
      lastSaved: new Date().toISOString(),
    });

    await saveGame(store.getState().saveSlot!, store.getState());

    setFaCupWinner(null);
    setMonthFixtures([]);
    setMonthEvents([]);
    setXiNotifications([]);
    // Clear Starting XI for new season (will be auto-populated when first month starts)
    store.getState().clearStartingXI();
    store.getState().clearStartingXIHistory();
    setGameView('hub');
  }, [store, fortunes]);

  // ─── Navigation ───

  const handleNavigate = useCallback((tab: NavTab) => {
    setViewHistory([]);
    setViewingClubId(null);
    setGameView(tab);
  }, []);

  const navigateToClub = useCallback((clubId: string) => {
    if (clubId === managerClubId) {
      handleNavigate('squad');
    } else {
      setViewHistory((prev) => [...prev, gameView]);
      setViewingClubId(clubId);
      setGameView('club_squad');
    }
  }, [managerClubId, gameView, handleNavigate]);

  const navigateBack = useCallback(() => {
    setViewHistory((prev) => {
      const copy = [...prev];
      const last = copy.pop();
      if (last) {
        setGameView(last);
      } else {
        setGameView('hub');
      }
      return copy;
    });
    setViewingClubId(null);
  }, []);

  const navigationContextValue = useMemo(() => ({
    navigateToClub,
    navigateBack,
  }), [navigateToClub, navigateBack]);

  const handleMatchResultsContinue = useCallback(async () => {
    const state = store.getState();
    // Save after viewing results
    await saveGame(state.saveSlot!, store.getState());

    // Update save metadata with current position
    const sorted = [...state.leagueTable].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
    const pos = sorted.findIndex((r) => r.clubId === state.manager?.clubId) + 1;
    state.setSaveMetadata({
      ...state.saveMetadata!,
      leaguePosition: pos,
      lastSaved: new Date().toISOString(),
    });

    setGameView('hub');
  }, [store]);

  // ─── Advance button label ───

  const currentPhaseForLabel = useGameStore((s) => s.currentPhase);
  const advanceLabel = useMemo(() => {
    if (currentPhaseForLabel === 'summer_window') return 'Close Transfer Window & Start Season';
    if (currentPhaseForLabel === 'january_window') return 'Close Transfer Window';
    if (currentPhaseForLabel === 'season_end') return 'Process Season End';
    return `Play ${MONTH_LABELS[currentPhaseForLabel] || currentPhaseForLabel}`;
  }, [currentPhaseForLabel]);

  // ─── Render ───

  if (screen === 'save_select') {
    return <SaveSlotSelect onSelectSlot={handleSelectSlot} />;
  }

  if (screen === 'club_select') {
    return (
      <ClubSelect
        onSelectClub={handleSelectClub}
        onBack={() => setScreen('save_select')}
      />
    );
  }

  // Game screen with navigation
  const activeNavTab: NavTab = (['hub', 'squad', 'transfers', 'history'] as NavTab[]).includes(gameView as NavTab)
    ? (gameView as NavTab)
    : 'hub';

  return (
    <NavigationContext.Provider value={navigationContextValue}>
      <div className="plm-flex plm-min-h-screen plm-bg-cream plm-font-body">
        <DesktopSidebar
          activeTab={activeNavTab}
          onNavigate={handleNavigate}
          onBack={() => setScreen('save_select')}
        />

        <main className="plm-flex-1 plm-min-w-0 plm-px-4 plm-py-4 md:plm-px-6 md:plm-py-6 plm-pb-20 md:plm-pb-6">
          <div className="plm-max-w-5xl plm-mx-auto">
            {gameView === 'hub' && (
              <GameHub
                onNavigate={handleNavigate}
                onAdvance={handleAdvance}
                advanceLabel={advanceLabel}
              />
            )}
            {gameView === 'squad' && (
              <SquadScreen
                formation={formation}
                mentality={mentality}
                onFormationChange={(f) => {
                  setFormation(f);
                  // Re-auto-populate XI when formation changes
                  const playerClub = store.getState().clubs.find((c) => c.id === managerClubId);
                  if (playerClub) {
                    const xi = autoSelectXI(f, playerClub.roster);
                    store.getState().setStartingXI(xi);
                  }
                }}
                onMentalityChange={setMentality}
                xiNotifications={xiNotifications}
                onDismissNotifications={() => setXiNotifications([])}
              />
            )}
            {gameView === 'club_squad' && viewingClubId && (
              <ClubSquadScreen clubId={viewingClubId} />
            )}
            {gameView === 'transfers' && (
              <TransferCenter onClose={() => setGameView('hub')} />
            )}
            {gameView === 'history' && (
              <SeasonHistoryScreen />
            )}
            {gameView === 'match_results' && (
              <MatchResults
                monthLabel={MONTH_LABELS[PHASE_ORDER[PHASE_ORDER.indexOf(store.getState().currentPhase) - 1]] || ''}
                fixtures={monthFixtures}
                events={monthEvents}
                onContinue={handleMatchResultsContinue}
              />
            )}
            {gameView === 'season_end' && (
              <SeasonEnd
                onContinue={handleContinueToOffSeason}
                faCupWinner={faCupWinner}
              />
            )}
          </div>
        </main>

        <BottomNav activeTab={activeNavTab} onNavigate={handleNavigate} />
        <PlayerDetailModal />
      </div>
    </NavigationContext.Provider>
  );
}

export default App;
