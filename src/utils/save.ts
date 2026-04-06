import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import type { SaveMetadata } from '../types/entities';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SaveableState = Record<string, any>;

const SAVE_KEY_PREFIX = 'epl-manager-save-';
const METADATA_KEY = 'epl-manager-save-metadata';

export interface SaveData {
  clubs: unknown[];
  fixtures: unknown[];
  leagueTable: unknown[];
  budgets: Record<string, number>;
  transferHistory: unknown[];
  currentPhase: string;
  seasonNumber: number;
  gameSeed: string;
  events: unknown[];
  activeModifiers: unknown[];
  manager: unknown;
  boardExpectation: unknown;
  seasonHistories: unknown[];
  saveSlot: number;
  saveMetadata: SaveMetadata;
  startingXI: Record<string, string>;
  startingXIHistory: unknown[];
  shortlist: string[];
}

function getSaveKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

/** Extract saveable state from the game store (excludes tempFillIns and transferOffers) */
export function extractSaveData(state: SaveableState): SaveData {
  return {
    clubs: state.clubs as unknown[],
    fixtures: state.fixtures as unknown[],
    leagueTable: state.leagueTable as unknown[],
    budgets: state.budgets as Record<string, number>,
    transferHistory: state.transferHistory as unknown[],
    currentPhase: state.currentPhase as string,
    seasonNumber: state.seasonNumber as number,
    gameSeed: state.gameSeed as string,
    events: state.events as unknown[],
    activeModifiers: state.activeModifiers as unknown[],
    manager: state.manager,
    boardExpectation: state.boardExpectation,
    seasonHistories: state.seasonHistories as unknown[],
    saveSlot: state.saveSlot as number,
    saveMetadata: state.saveMetadata as SaveMetadata,
    startingXI: (state.startingXI || {}) as Record<string, string>,
    startingXIHistory: (state.startingXIHistory || []) as unknown[],
    shortlist: (state.shortlist || []) as string[],
  };
}

export async function saveGame(slot: number, state: SaveableState): Promise<void> {
  const data = extractSaveData(state);
  await idbSet(getSaveKey(slot), data);

  // Update metadata index
  const allMetadata = await getAllSaveMetadata();
  allMetadata[slot] = data.saveMetadata;
  await idbSet(METADATA_KEY, allMetadata);
}

export async function loadGame(slot: number): Promise<SaveData | null> {
  const data = await idbGet<SaveData>(getSaveKey(slot));
  return data || null;
}

export async function deleteSave(slot: number): Promise<void> {
  await idbDel(getSaveKey(slot));

  const allMetadata = await getAllSaveMetadata();
  delete allMetadata[slot];
  await idbSet(METADATA_KEY, allMetadata);
}

export async function getAllSaveMetadata(): Promise<Record<number, SaveMetadata>> {
  const metadata = await idbGet<Record<number, SaveMetadata>>(METADATA_KEY);
  return metadata || {};
}

/** Cull season data for archival — strip match-level detail, keep aggregates */
export function cullSeasonData(seasonHistory: {
  finalTable: unknown[];
  playerStats: unknown[];
  transferLog: unknown[];
  events: unknown[];
}): typeof seasonHistory {
  // The season history format already stores only aggregates.
  // This function is called at season end to ensure no match-level data leaks in.
  return {
    finalTable: seasonHistory.finalTable,
    playerStats: seasonHistory.playerStats,
    transferLog: seasonHistory.transferLog,
    events: seasonHistory.events,
  };
}
