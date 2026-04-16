import { useState, useCallback, useMemo } from 'react';
import './index.css';
import { SaveSlotSelect } from './components/shared/SaveSlotSelect';
import { ClubSelect } from './components/shared/ClubSelect';
import { ManagerCreation, type ManagerCreationData } from './components/shared/ManagerCreation';
import { TransferCenter } from './components/transfers/TransferCenter';
import { GameHub } from './components/hub/GameHub';
import { SquadScreen } from './components/squad/SquadScreen';
import { ClubSquadScreen } from './components/squad/ClubSquadScreen';
import { MatchResults } from './components/match/MatchResults';
import { SeasonEnd } from './components/season/SeasonEnd';
import { BoardMeeting } from './components/season/BoardMeeting';
import { SeasonHistoryScreen } from './components/history/SeasonHistory';
import { ManagerProfileScreen } from './components/manager/ManagerProfileScreen';
import { TitleScreen } from './components/shared/TitleScreen';
import { BottomNav, type NavTab } from './components/shared/BottomNav';
import { DesktopSidebar } from './components/shared/DesktopSidebar';
import { PlayerDetailModal } from './components/shared/PlayerDetailModal';
import { PackOpening } from './components/shared/PackOpening';
import { NavigationContext } from './hooks/useNavigation';
import { useGameStore } from './store/gameStore';
import { CLUBS } from './data/clubs';
import { generateAllSquads, generatePhilosophyBonusPlayer } from './engine/playerGen';
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
import { processLeagueAging, replenishSquad, annualYouthIntake, type AgingResult } from './engine/aging';
import {
  calculateSeasonReputationChange,
  calculateSeasonEndBudget,
  calculateBoardExpectation,
} from './engine/reputation';
import type {
  Club,
  ClubData,
  SaveMetadata,
  GamePhase,
  Fixture,
  SeasonEvent,
  SeasonPlayerStats,
} from './types/entities';

type Screen = 'title' | 'save_select' | 'club_select' | 'manager_creation' | 'game';
type GameView = 'hub' | 'squad' | 'transfers' | 'history' | 'manager' | 'match_results' | 'season_end' | 'club_squad' | 'board_meeting';

const PHASE_ORDER: GamePhase[] = [
  'summer_window', 'july_advance', 'august', 'august_deadline',
  'september', 'october', 'november', 'december',
  'january_window', 'january', 'january_deadline',
  'february', 'march', 'april', 'may', 'season_end',
];

const MONTH_LABELS: Record<GamePhase, string> = {
  summer_window: 'Summer Transfer Window',
  july_advance: 'July',
  august: 'August',
  august_deadline: 'Transfer Deadline Day',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December',
  january_window: 'January Transfer Window',
  january: 'January',
  january_deadline: 'Transfer Deadline Day',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  season_end: 'Season End',
};

/** Starting calendar year for season 1 (2026 = World Cup year) */
const BASE_YEAR = 2026;

function getCalendarYear(seasonNumber: number): number {
  return BASE_YEAR + (seasonNumber - 1);
}

/** Determine what summer tournament (if any) takes place this year */
function getSummerTournament(calendarYear: number): 'world_cup' | 'euros' | null {
  if (calendarYear % 4 === 2) return 'world_cup'; // 2026, 2030, 2034...
  if (calendarYear % 4 === 0) return 'euros';      // 2028, 2032, 2036...
  return null;
}

/** Fixed hosts for known World Cups and Euros */
const WORLD_CUP_HOSTS: Record<number, string> = {
  2026: 'USA, Mexico & Canada',
  2030: 'Morocco, Portugal & Spain',
  2034: 'Saudi Arabia',
};

const EURO_HOSTS: Record<number, string> = {
  2028: 'the United Kingdom',
  2032: 'Italy & Turkey',
};

const RANDOM_WORLD_CUP_HOSTS = [
  'Australia & New Zealand', 'Japan & South Korea', 'Brazil', 'Argentina',
  'Egypt & South Africa', 'India & Pakistan', 'Canada', 'China',
];

const RANDOM_EURO_HOSTS = [
  'France', 'Germany', 'Spain', 'Netherlands & Belgium',
  'Poland & Ukraine', 'Scandinavia', 'Greece & Turkey', 'Austria & Switzerland',
];

/** Generate a July narrative based on tournament year or preseason */
function generateJulyNarrative(rng: import('./utils/rng').SeededRNG, calendarYear: number): string {
  const tournament = getSummerTournament(calendarYear);

  if (tournament === 'world_cup') {
    const host =
      WORLD_CUP_HOSTS[calendarYear] ||
      RANDOM_WORLD_CUP_HOSTS[rng.randomInt(0, RANDOM_WORLD_CUP_HOSTS.length - 1)];
    const winners = [
      'Brazil', 'Argentina', 'France', 'Germany', 'Spain',
      'England', 'Italy', 'Netherlands', 'Portugal', 'Belgium',
    ];
    const winner = winners[rng.randomInt(0, winners.length - 1)];
    const dramas = [
      `${winner} lifted the World Cup trophy in ${host} after a dramatic final.`,
      `A golden generation delivered as ${winner} won the ${calendarYear} World Cup in ${host}.`,
      `${winner} are World Cup champions! The tournament in ${host} will be remembered for years.`,
    ];
    return dramas[rng.randomInt(0, dramas.length - 1)];
  }

  if (tournament === 'euros') {
    const host =
      EURO_HOSTS[calendarYear] ||
      RANDOM_EURO_HOSTS[rng.randomInt(0, RANDOM_EURO_HOSTS.length - 1)];
    const winners = [
      'Spain', 'France', 'Germany', 'Italy', 'England',
      'Netherlands', 'Portugal', 'Belgium', 'Denmark', 'Croatia',
    ];
    const winner = winners[rng.randomInt(0, winners.length - 1)];
    const dramas = [
      `${winner} won Euro ${calendarYear} hosted by ${host} after a thrilling summer of football.`,
      `Euro ${calendarYear} in ${host} is over — ${winner} are the new champions of Europe!`,
      `${winner} crowned European champions in ${host}! Their players return to their clubs on a high.`,
    ];
    return dramas[rng.randomInt(0, dramas.length - 1)];
  }

  // No major tournament — fun preseason stories
  const stories = [
    'Pre-season is in full swing. Managers are putting their squads through gruelling fitness regimes under the summer sun.',
    'The pre-season friendlies are done. Time to finalise the squad before the window closes.',
    'Clubs are jetting off on lucrative pre-season tours. The marketing teams are happy, the physios less so.',
    'A viral video of a goalkeeper scoring an overhead kick in a pre-season friendly has the internet buzzing.',
    'Several stars have returned from holiday looking suspiciously unfit. Nutritionists across the league are in crisis mode.',
    'The new kits have dropped. Fan opinions range from "instant classic" to "designed by a toddler."',
    'A manager was spotted at an airport with a mysterious briefcase. Transfer Twitter is in meltdown.',
    'Pre-season training camps are wrapping up. The squad is looking sharp — the real business starts soon.',
  ];
  return stories[rng.randomInt(0, stories.length - 1)];
}

const clubDataMap = new Map(CLUBS.map((c) => [c.id, c]));

function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [gameView, setGameView] = useState<GameView>('hub');
  const [viewingClubId, setViewingClubId] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<ClubData | null>(null);
  const [_viewHistory, setViewHistory] = useState<GameView[]>([]);
  const [formation, setFormation] = useState<Formation>('4-4-2');
  const [mentality, setMentality] = useState<Mentality>('balanced');
  const [monthFixtures, setMonthFixtures] = useState<Fixture[]>([]);
  const [monthEvents, setMonthEvents] = useState<SeasonEvent[]>([]);
  const [fortunes, setFortunes] = useState<ClubFortune[]>([]);
  const [faCupWinner, setFaCupWinner] = useState<string | null>(null);
  const [agingResults, setAgingResults] = useState<AgingResult[]>([]);
  const [xiNotifications, setXiNotifications] = useState<XISwap[]>([]);
  const [julyNarrative, setJulyNarrative] = useState<string | null>(null);
  const [packPlayers, setPackPlayers] = useState<import('./types/entities').Player[]>([]);
  const [packConfig, setPackConfig] = useState<{ title: string; subtitle?: string; onComplete?: () => void } | null>(null);
  const [youthIntakePlayers, setYouthIntakePlayers] = useState<import('./types/entities').Player[]>([]);
  const store = useGameStore;
  const managerClubId = useGameStore((s) => s.manager?.clubId);

  // ─── Save/Load handlers ───

  const handleSelectSlot = useCallback(async (slot: number, isExisting: boolean) => {
    if (isExisting) {
      const data = await loadGame(slot);
      if (data) {
        // Migrate old saves: ensure all players have progression fields
        const migratedClubs = (data.clubs as Club[]).map((club) => ({
          ...club,
          roster: club.roster.map((p) => ({
            ...p,
            nationality: p.nationality ?? 'English',
            formHistory: p.formHistory ?? [],
            monthlyGoals: p.monthlyGoals ?? [],
            monthlyAssists: p.monthlyAssists ?? [],
            statsSnapshotSeasonStart: p.statsSnapshotSeasonStart ?? { ...p.stats },
          })),
        }));
        // Migrate old manager profiles: backfill new fields
        const rawManager = data.manager as Record<string, unknown> | null;
        let migratedManager = data.manager as import('./types/entities').ManagerProfile | null;
        if (rawManager && !rawManager.avatar) {
          migratedManager = {
            ...(rawManager as unknown as import('./types/entities').ManagerProfile),
            nationality: (rawManager.nationality as string) || 'English',
            age: (rawManager.age as number) || 40,
            playingBackground: (rawManager.playingBackground as import('./types/entities').PlayingBackground) || 'former-pro',
            preferredFormation: (rawManager.preferredFormation as string) || '4-4-2',
            philosophy: (rawManager.philosophy as import('./types/entities').ManagerPhilosophy) || 'pragmatic',
            avatar: '😎',
            bio: '',
            createdAt: Date.now(),
            tenures: [{
              clubId: rawManager.clubId as string,
              startSeason: 1,
              gamesManaged: 0,
              leagueTitles: 0,
              faCups: 0,
              bestLeagueFinish: 20,
            }],
            accomplishments: [],
            totalGamesManaged: 0,
            totalLeagueTitles: 0,
            totalFaCups: 0,
          };
        }

        const state = store.getState();
        store.setState({
          clubs: migratedClubs as typeof state.clubs,
          fixtures: data.fixtures as typeof state.fixtures,
          leagueTable: data.leagueTable as typeof state.leagueTable,
          budgets: data.budgets,
          transferHistory: data.transferHistory as typeof state.transferHistory,
          currentPhase: data.currentPhase as typeof state.currentPhase,
          seasonNumber: data.seasonNumber,
          gameSeed: data.gameSeed,
          events: data.events as typeof state.events,
          activeModifiers: data.activeModifiers as typeof state.activeModifiers,
          manager: migratedManager,
          boardExpectation: data.boardExpectation as typeof state.boardExpectation,
          seasonHistories: data.seasonHistories as typeof state.seasonHistories,
          saveSlot: data.saveSlot,
          saveMetadata: data.saveMetadata,
          startingXI: data.startingXI || {},
          startingXIHistory: (data.startingXIHistory || []) as typeof state.startingXIHistory,
          captainId: (data as unknown as Record<string, unknown>).captainId as string | null || null,
          tempFillIns: [],
          transferOffers: [],
          marketListings: [],
          tickerMessages: [],
          shortlist: (data as unknown as Record<string, unknown>).shortlist as string[] || [],
          shortlistNotifications: [],
          boardMeetingPending: (data as unknown as Record<string, unknown>).boardMeetingPending as boolean || false,
        });
        // Restore formation from manager's preferred formation
        if (migratedManager?.preferredFormation) {
          setFormation(migratedManager.preferredFormation as Formation);
        }
        setScreen('game');
        const isBoardMeetingPending = (data as unknown as Record<string, unknown>).boardMeetingPending as boolean || false;
        setGameView(isBoardMeetingPending ? 'board_meeting' : 'hub');
      }
    } else {
      store.getState().setSaveSlot(slot);
      setScreen('club_select');
    }
  }, [store]);

  const handleSelectClub = useCallback((club: ClubData) => {
    setSelectedClub(club);
    setScreen('manager_creation');
  }, []);

  const handleManagerCreated = useCallback(async (data: ManagerCreationData) => {
    const club = selectedClub!;
    const state = store.getState();
    const slot = state.saveSlot!;

    const gameSeed = `plm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    state.setGameSeed(gameSeed);

    const squads = generateAllSquads(gameSeed, CLUBS);

    // Philosophy bonus: add an extra 17th player to the user's squad
    const userSquad = squads.get(club.id)!;
    const bonusRng = new SeededRNG(`${gameSeed}-philosophy-${club.id}`);
    const bonusPlayer = generatePhilosophyBonusPlayer(bonusRng, club, data.philosophy, userSquad.length);
    userSquad.push(bonusPlayer);

    state.initializeClubs(CLUBS, squads);

    const budgets: Record<string, number> = {};
    for (const c of CLUBS) {
      budgets[c.id] = c.budget;
    }
    state.initializeBudgets(budgets);
    state.initializeLeagueTable(CLUBS.map((c) => c.id));

    // Create full manager profile
    const managerProfile: import('./types/entities').ManagerProfile = {
      name: data.name,
      clubId: club.id,
      reputation: 50,
      nationality: data.nationality,
      age: data.age,
      playingBackground: data.playingBackground,
      preferredFormation: data.preferredFormation,
      philosophy: data.philosophy,
      avatar: data.avatar,
      bio: data.bio,
      createdAt: Date.now(),
      tenures: [{
        clubId: club.id,
        startSeason: 1,
        gamesManaged: 0,
        leagueTitles: 0,
        faCups: 0,
        bestLeagueFinish: 20,
      }],
      accomplishments: [{
        id: `acc-hired-${Date.now()}`,
        season: 1,
        clubId: club.id,
        type: 'club-hired',
        headline: `Took charge at ${club.name}`,
      }],
      totalGamesManaged: 0,
      totalLeagueTitles: 0,
      totalFaCups: 0,
    };
    state.setManager(managerProfile);

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
      managerName: data.name,
      managerAvatar: data.avatar,
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

    // Trigger board meeting before first summer window
    store.getState().setBoardMeetingPending(true);

    await saveGame(slot, store.getState());

    // Default formation to manager's preferred formation
    setFormation(data.preferredFormation as Formation);

    setScreen('game');
    setGameView('board_meeting');
  }, [store, selectedClub]);

  // ─── Game advance logic ───

  const handleAdvance = useCallback(async () => {
    const state = store.getState();
    const { currentPhase, gameSeed, seasonNumber, manager, clubs } = state;
    const playerClubId = manager!.clubId;
    const sSeed = deriveSeasonSeed(gameSeed, seasonNumber);

    // ─── Transfer deadline days (august_deadline / january_deadline) ───
    // These close the respective transfer window, then advance.
    if (currentPhase === 'august_deadline' || currentPhase === 'january_deadline') {
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

      // Replenish AI squads after window closes
      const windowRng = new SeededRNG(`${sSeed}-window-replenish-${currentPhase}`);
      for (const club of clubs) {
        if (club.id === playerClubId) continue;
        const nonTemp = club.roster.filter((p) => !p.isTemporary);
        if (nonTemp.length < 16) {
          replenishSquad(windowRng, club, seasonNumber);
        }
      }

      // august_deadline → september, january_deadline → february
      const phaseIdx = PHASE_ORDER.indexOf(currentPhase);
      state.setPhase(PHASE_ORDER[phaseIdx + 1]);

      await saveGame(state.saveSlot!, store.getState());
      setGameView('hub');
      return;
    }

    // ─── Summer window → July advance (window stays open) ───
    if (currentPhase === 'summer_window') {
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

      // Generate July narrative
      const calendarYear = getCalendarYear(seasonNumber);
      const julyRng = new SeededRNG(`${sSeed}-july-narrative`);
      setJulyNarrative(generateJulyNarrative(julyRng, calendarYear));

      state.setPhase('july_advance');
      await saveGame(state.saveSlot!, store.getState());
      setGameView('hub');
      return;
    }

    // ─── July advance → August (play matches, window still open) ───
    if (currentPhase === 'july_advance') {
      // Auto-populate Starting XI on first entry to season
      const playerClub = clubs.find((c) => c.id === playerClubId);
      if (playerClub && Object.keys(state.startingXI).length === 0) {
        const xi = autoSelectXI(formation, playerClub.roster);
        state.setStartingXI(xi);
      }

      // Fall through to monthly match simulation for august
      state.setPhase('august');
    }

    // ─── January window → January (play matches, window still open) ───
    if (currentPhase === 'january_window') {
      state.setPhase('january');
    }

    // Re-read phase after potential changes above
    const activePhase = store.getState().currentPhase;

    if (activePhase === 'season_end') {
      handleSeasonEnd();
      return;
    }

    // Monthly phase: Starting XI management before simulation
    const playerClub = clubs.find((c) => c.id === playerClubId);
    if (playerClub) {
      let currentXI = state.startingXI;
      if (Object.keys(currentXI).length === 0) {
        currentXI = autoSelectXI(formation, playerClub.roster);
        state.setStartingXI(currentXI);
      }

      const swapResult = autoSwapInjuredPlayers(currentXI, formation, playerClub.roster);
      if (swapResult.swaps.length > 0) {
        state.setStartingXI(swapResult.newXI);
        setXiNotifications(swapResult.swaps);
        currentXI = swapResult.newXI;
      }

      const validation = validateXI(currentXI, formation, playerClub.roster);
      if (!validation.valid) {
        return;
      }

      state.lockStartingXI(activePhase, formation);
    }

    // Monthly phase: simulate matches
    simulateMonth(activePhase, sSeed, playerClubId);
  }, [store, fortunes, formation]);

  const simulateMonth = useCallback((phase: GamePhase, sSeed: string, playerClubId: string) => {
    const state = store.getState();
    const { clubs, fixtures, leagueTable } = state;
    const monthRng = new SeededRNG(`${sSeed}-month-${phase}`);

    // Snapshot pre-month goals/assists for monthly delta tracking
    const preMonthGoals = new Map<string, Map<string, number>>();
    const preMonthAssists = new Map<string, Map<string, number>>();
    for (const club of clubs) {
      const gMap = new Map<string, number>();
      const aMap = new Map<string, number>();
      for (const p of club.roster) {
        if (!p.isTemporary) {
          gMap.set(p.id, p.goals);
          aMap.set(p.id, p.assists);
        }
      }
      preMonthGoals.set(club.id, gMap);
      preMonthAssists.set(club.id, aMap);
    }

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
        homePreferredFormation: isPlayerHome ? state.manager!.preferredFormation : undefined,
        awayPreferredFormation: isPlayerAway ? state.manager!.preferredFormation : undefined,
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

    // Add event-generated new players to roster
    for (const { clubId, player } of eventBatch.newPlayers) {
      state.addPlayerToClub(clubId, player);
    }

    // Record monthly progression data (formHistory, monthlyGoals, monthlyAssists)
    const updatedClubs = store.getState().clubs;
    for (const club of updatedClubs) {
      for (const player of club.roster) {
        if (player.isTemporary) continue;
        const preGoals = preMonthGoals.get(club.id)?.get(player.id) ?? 0;
        const preAssists = preMonthAssists.get(club.id)?.get(player.id) ?? 0;
        const monthGoals = player.goals - preGoals;
        const monthAssists = player.assists - preAssists;
        state.updatePlayer(club.id, player.id, {
          formHistory: [...player.formHistory.slice(0, 9), player.form],
          monthlyGoals: [...player.monthlyGoals.slice(0, 9), monthGoals],
          monthlyAssists: [...player.monthlyAssists.slice(0, 9), monthAssists],
        });
      }
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
    window.scrollTo(0, 0);
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

    // Log accomplishments
    if (playerPosition === 1) {
      state.addAccomplishment({
        id: `acc-title-s${seasonNumber}`,
        season: seasonNumber,
        clubId: playerClubId,
        type: 'league-title',
        headline: `Won the Premier League with ${clubDataMap.get(playerClubId)?.name}`,
      });
      state.updateCurrentTenure({ leagueTitles: (manager!.tenures?.at(-1)?.leagueTitles || 0) + 1 });
      // Mark trophy on player roster
      const championClub = store.getState().clubs.find((c) => c.id === playerClubId);
      if (championClub) {
        for (const p of championClub.roster) {
          if (!p.isTemporary) {
            state.updatePlayer(playerClubId, p.id, {
              trophiesWon: [...(p.trophiesWon || []), { season: seasonNumber, type: 'league' }],
            });
          }
        }
      }
    }
    if (cupResult.winner === playerClubId) {
      state.addAccomplishment({
        id: `acc-facup-s${seasonNumber}`,
        season: seasonNumber,
        clubId: playerClubId,
        type: 'fa-cup',
        headline: `Won the FA Cup with ${clubDataMap.get(playerClubId)?.name}`,
      });
      state.updateCurrentTenure({ faCups: (manager!.tenures?.at(-1)?.faCups || 0) + 1 });
      // Mark cup trophy on player roster
      const cupClub = store.getState().clubs.find((c) => c.id === playerClubId);
      if (cupClub) {
        for (const p of cupClub.roster) {
          if (!p.isTemporary) {
            state.updatePlayer(playerClubId, p.id, {
              trophiesWon: [...(p.trophiesWon || []), { season: seasonNumber, type: 'cup' }],
            });
          }
        }
      }
    }
    // Update tenure stats
    const gamesThisSeason = sorted.find((r) => r.clubId === playerClubId)?.played || 0;
    state.updateCurrentTenure({
      gamesManaged: (manager!.tenures?.at(-1)?.gamesManaged || 0) + gamesThisSeason,
      bestLeagueFinish: playerPosition,
    });

    // Update career totals
    const updatedMgr = store.getState().manager!;
    state.setManager({
      ...updatedMgr,
      totalGamesManaged: updatedMgr.tenures.reduce((sum, t) => sum + t.gamesManaged, 0),
      totalLeagueTitles: updatedMgr.tenures.reduce((sum, t) => sum + t.leagueTitles, 0),
      totalFaCups: updatedMgr.tenures.reduce((sum, t) => sum + t.faCups, 0),
    });

    // Check milestone games
    const totalGames = store.getState().manager!.totalGamesManaged;
    for (const milestone of [50, 100, 250, 500, 1000]) {
      if (totalGames >= milestone && (totalGames - gamesThisSeason) < milestone) {
        state.addAccomplishment({
          id: `acc-milestone-${milestone}-s${seasonNumber}`,
          season: seasonNumber,
          clubId: playerClubId,
          type: 'milestone-games',
          headline: `${milestone} career games managed`,
        });
      }
    }

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
    const agingResults_ = processLeagueAging(agingRng, clubs, seasonNumber);
    setAgingResults(agingResults_);
    // Apply aging results to store
    for (const result of agingResults_) {
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

    // Annual youth intake: each club promotes 1-2 academy graduates
    let playerYouthIntake: import('./types/entities').Player[] = [];
    for (const club of clubs) {
      const youthRng = new SeededRNG(`${sSeed}-youth-${club.id}`);
      const youthPlayers = annualYouthIntake(youthRng, club, seasonNumber);
      if (club.id === playerClubId) {
        playerYouthIntake = youthPlayers;
      }
    }

    // Replenish all squads to 16 players (fills gaps from retirements + transfers)
    for (const club of clubs) {
      const replenishRng = new SeededRNG(`${sSeed}-replenish-${club.id}`);
      replenishSquad(replenishRng, club, seasonNumber);
    }

    // Remove retired players from shortlist
    const retiredIds = new Set(
      agingResults_.flatMap((r) => r.retired.map((ret) => ret.player.id)),
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

    // Season-boundary progression culling (asymmetric):
    // formHistory: keep last 2 entries (momentum continuity)
    // monthlyGoals/monthlyAssists: clear (season-bounded counting stats)
    // statsSnapshotSeasonStart: update to post-aging stats
    const postAgingClubs = store.getState().clubs;
    for (const club of postAgingClubs) {
      for (const player of club.roster) {
        if (player.isTemporary) continue;
        state.updatePlayer(club.id, player.id, {
          formHistory: player.formHistory.slice(-2),
          monthlyGoals: [],
          monthlyAssists: [],
          statsSnapshotSeasonStart: { ...player.stats },
        });
      }
    }

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

    // Save youth intake players for the pack reveal
    setYouthIntakePlayers(playerYouthIntake);

    // Show season end screen
    setGameView('season_end');
    window.scrollTo(0, 0);
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

    // Increment manager age at new season
    store.getState().incrementManagerAge();

    // Update save metadata
    const manager = store.getState().manager!;
    store.getState().setSaveMetadata({
      slot: store.getState().saveSlot!,
      clubId: manager.clubId,
      clubName: clubDataMap.get(manager.clubId)?.name || '',
      seasonNumber: newSeasonNumber,
      leaguePosition: 0,
      lastSaved: new Date().toISOString(),
      managerName: manager.name,
      managerAvatar: manager.avatar,
    });

    await saveGame(store.getState().saveSlot!, store.getState());

    setFaCupWinner(null);
    setMonthFixtures([]);
    setMonthEvents([]);
    setXiNotifications([]);
    setJulyNarrative(null);
    // Clear Starting XI for new season (will be auto-populated when first month starts)
    store.getState().clearStartingXI();
    store.getState().clearStartingXIHistory();

    // Trigger board meeting before new season
    store.getState().setBoardMeetingPending(true);
    setGameView('board_meeting');
  }, [store, fortunes]);

  // ─── Navigation ───

  const handleNavigate = useCallback((tab: NavTab) => {
    setViewHistory([]);
    setViewingClubId(null);
    setGameView(tab);
    window.scrollTo(0, 0);
  }, []);

  const navigateToClub = useCallback((clubId: string) => {
    if (clubId === managerClubId) {
      handleNavigate('squad');
    } else {
      setViewHistory((prev) => [...prev, gameView]);
      setViewingClubId(clubId);
      setGameView('club_squad');
      window.scrollTo(0, 0);
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
    window.scrollTo(0, 0);
  }, []);

  const navigationContextValue = useMemo(() => ({
    navigateToClub,
    navigateBack,
  }), [navigateToClub, navigateBack]);

  const handleBoardMeetingContinue = useCallback(async () => {
    const state = store.getState();
    state.setBoardMeetingPending(false);
    await saveGame(state.saveSlot!, store.getState());

    // On first season, show starter pack with the starting squad
    if (state.seasonNumber === 1 && state.manager) {
      const playerClub = state.clubs.find((c) => c.id === state.manager?.clubId);
      if (playerClub) {
        // Sort by overall (best first) and take the top 11
        const starters = [...playerClub.roster]
          .filter((p) => !p.isTemporary)
          .sort((a, b) => b.overall - a.overall)
          .slice(0, 11);
        setPackPlayers(starters);
        setPackConfig({ title: 'Starter Pack', subtitle: playerClub.name });
        return;
      }
    }
    setGameView('hub');
  }, [store]);

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
      managerName: state.manager?.name,
      managerAvatar: state.manager?.avatar,
    });

    // In final month (before season_end), go back to hub; otherwise squad for tactics
    const nextPhase = store.getState().currentPhase;
    setGameView(nextPhase === 'season_end' ? 'hub' : 'squad');
    window.scrollTo(0, 0);
  }, [store]);

  // ─── Advance button label ───

  const currentPhaseForLabel = useGameStore((s) => s.currentPhase);
  const advanceLabel = useMemo(() => {
    if (currentPhaseForLabel === 'summer_window') return 'Advance to July';
    if (currentPhaseForLabel === 'july_advance') return 'Play August';
    if (currentPhaseForLabel === 'august_deadline') return 'Close Transfer Window';
    if (currentPhaseForLabel === 'january_window') return 'Play January';
    if (currentPhaseForLabel === 'january_deadline') return 'Close Transfer Window';
    if (currentPhaseForLabel === 'season_end') return 'Process Season End';
    return `Play ${MONTH_LABELS[currentPhaseForLabel] || currentPhaseForLabel}`;
  }, [currentPhaseForLabel]);

  // ─── Render ───

  if (screen === 'title') {
    return <TitleScreen onStart={() => setScreen('save_select')} />;
  }

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

  if (screen === 'manager_creation' && selectedClub) {
    return (
      <ManagerCreation
        clubName={selectedClub.name}
        onSubmit={handleManagerCreated}
        onBack={() => setScreen('club_select')}
      />
    );
  }

  // Game screen with navigation
  const activeNavTab: NavTab = (['hub', 'squad', 'transfers', 'history', 'manager'] as NavTab[]).includes(gameView as NavTab)
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
                julyNarrative={julyNarrative}
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
                onAdvance={handleAdvance}
                advanceLabel={advanceLabel}
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
            {gameView === 'manager' && (
              <ManagerProfileScreen />
            )}
            {gameView === 'match_results' && (
              <MatchResults
                monthLabel={MONTH_LABELS[PHASE_ORDER[PHASE_ORDER.indexOf(store.getState().currentPhase) - 1]] || ''}
                fixtures={monthFixtures}
                events={monthEvents}
                onContinue={handleMatchResultsContinue}
              />
            )}
            {gameView === 'board_meeting' && (
              <BoardMeeting onContinue={handleBoardMeetingContinue} />
            )}
            {gameView === 'season_end' && (
              <SeasonEnd
                onContinue={() => {
                  // If there are youth intake players, show youth pack first
                  if (youthIntakePlayers.length > 0) {
                    const state = store.getState();
                    const playerClub = state.clubs.find((c) => c.id === state.manager?.clubId);
                    setPackPlayers(youthIntakePlayers);
                    setPackConfig({
                      title: 'Youth Academy',
                      subtitle: `${playerClub?.name || 'Club'} Graduates`,
                      onComplete: handleContinueToOffSeason,
                    });
                    setYouthIntakePlayers([]);
                    return;
                  }
                  handleContinueToOffSeason();
                }}
                faCupWinner={faCupWinner}
                agingResults={agingResults}
              />
            )}
          </div>
        </main>

        <BottomNav activeTab={activeNavTab} onNavigate={handleNavigate} />
        <PlayerDetailModal />

        {/* Pack Opening overlay */}
        {packConfig && packPlayers.length > 0 && (() => {
          const state = store.getState();
          const playerClub = state.clubs.find((c) => c.id === state.manager?.clubId);
          const customOnComplete = packConfig.onComplete;
          return (
            <PackOpening
              players={packPlayers}
              clubName={playerClub?.name || ''}
              clubId={playerClub?.id}
              clubColors={playerClub?.colors || { primary: '#1A1A1A', secondary: '#333' }}
              packTitle={packConfig.title}
              packSubtitle={packConfig.subtitle}
              onComplete={() => {
                setPackPlayers([]);
                setPackConfig(null);
                if (customOnComplete) {
                  customOnComplete();
                } else {
                  setGameView('hub');
                }
              }}
            />
          );
        })()}
      </div>
    </NavigationContext.Provider>
  );
}

export default App;
