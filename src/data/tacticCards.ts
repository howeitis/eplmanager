import type { Formation, Mentality } from '@/engine/matchSim';
import type { TacticCard } from '@/types/tactics';
import { BALANCE } from './balance';

/**
 * Phase A tactic-card pool.
 *
 * Modifier values are derived from BALANCE.formationModifiers / mentalityModifiers
 * so the deck is a re-skin of the existing math — no balance drift possible.
 * Names and flavour text are bespoke; everything else is downstream of balance.ts.
 */

const SHAPE_META: Record<Formation, { name: string; description: string }> = {
  '4-4-2': {
    name: 'The Classic',
    description: 'Two banks of four, a striker pairing. Familiar shape, no surprises.',
  },
  '4-3-3': {
    name: 'Wide Attack',
    description: 'Three forwards stretch the back line. Width creates the chances.',
  },
  '3-5-2': {
    name: 'Midfield Control',
    description: 'Wing-backs push high. Win the middle of the park, win the game.',
  },
  '4-2-3-1': {
    name: 'Creative Tip',
    description: 'A number ten roams between the lines behind a lone striker.',
  },
  '5-3-2': {
    name: 'Defensive Block',
    description: 'Five at the back. Ask them to break us down.',
  },
  '3-4-3': {
    name: 'All-Out Press',
    description: 'High line, three forwards, no fear. Score more than they do.',
  },
};

const TEMPO_META: Record<Mentality, { name: string; description: string }> = {
  defensive: {
    name: 'Sit Deep',
    description: 'Absorb pressure. Hit them on the counter when they over-commit.',
  },
  balanced: {
    name: 'Measured',
    description: 'Control the rhythm. React to the game as it unfolds.',
  },
  attacking: {
    name: 'On the Front Foot',
    description: 'Push numbers forward. Hunt the next goal at all costs.',
  },
};

export const SHAPE_CARDS: TacticCard[] = (Object.entries(BALANCE.formationModifiers) as [Formation, { atk: number; def: number }][])
  .map(([formation, mods]) => ({
    id: `shape-${formation}`,
    slot: 'shape' as const,
    name: SHAPE_META[formation].name,
    description: SHAPE_META[formation].description,
    tier: 'bronze' as const,
    atkMod: mods.atk,
    defMod: mods.def,
    formation,
  }));

export const TEMPO_CARDS: TacticCard[] = (Object.entries(BALANCE.mentalityModifiers) as [Mentality, { atk: number; def: number }][])
  .map(([mentality, mods]) => ({
    id: `tempo-${mentality}`,
    slot: 'tempo' as const,
    name: TEMPO_META[mentality].name,
    description: TEMPO_META[mentality].description,
    tier: 'bronze' as const,
    atkMod: mods.atk,
    defMod: mods.def,
    mentality,
  }));

export const ALL_TACTIC_CARDS: TacticCard[] = [...SHAPE_CARDS, ...TEMPO_CARDS];

export function getShapeCardForFormation(formation: Formation): TacticCard {
  return SHAPE_CARDS.find((c) => c.formation === formation) ?? SHAPE_CARDS[0];
}

export function getTempoCardForMentality(mentality: Mentality): TacticCard {
  return TEMPO_CARDS.find((c) => c.mentality === mentality) ?? TEMPO_CARDS[0];
}
