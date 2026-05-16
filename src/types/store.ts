import type { TeamSlice } from '@/store/teamSlice';
import type { MatchSlice } from '@/store/matchSlice';
import type { MarketSlice } from '@/store/marketSlice';
import type { SeasonSlice } from '@/store/seasonSlice';
import type { MetaSlice } from '@/store/metaSlice';

export interface GameState
  extends TeamSlice,
    MatchSlice,
    MarketSlice,
    SeasonSlice,
    MetaSlice {}
