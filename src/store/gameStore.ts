import { create } from 'zustand';
import type { GameState } from '../types/store';
import { createTeamSlice } from './teamSlice';
import { createMatchSlice } from './matchSlice';
import { createMarketSlice } from './marketSlice';
import { createSeasonSlice } from './seasonSlice';
import { createMetaSlice } from './metaSlice';

export const useGameStore = create<GameState>((...a) => ({
  ...createTeamSlice(...a),
  ...createMatchSlice(...a),
  ...createMarketSlice(...a),
  ...createSeasonSlice(...a),
  ...createMetaSlice(...a),
}));
