import type { TacticCard } from '@/types/tactics';

/**
 * Phase B instruction-card pool.
 *
 * Each card declares an effect: flat modifiers (atkMod / defMod / formMod)
 * that apply when equipped, plus an optional condition that gates the whole
 * effect. The engine caps each card's net TSS contribution at ±2 — see
 * INSTRUCTION_TSS_CAP in matchSim.ts.
 *
 * Balance philosophy:
 *   - Flat cards: small, always-on tweaks. Mostly +1 in one stat.
 *   - Trade-off cards: gain ATK at the cost of DEF or form (and vice versa).
 *   - Conditional cards: bigger numbers, but they only fire in specific
 *     situations. Force the player to swap cards between matches.
 *
 * When adding new cards, run engine/__tests__/instructionEffect.test.ts +
 * fullBalanceCheck.test.ts. The cap is enforced in the engine, but big
 * stat swings can still distort match-by-match feel.
 */

/** Hard cap on a single instruction's net (atk+def)/2 contribution to TSS. */
export const INSTRUCTION_TSS_CAP = 2;

const FLAT_CARDS: TacticCard[] = [
  {
    id: 'instr-press-from-front',
    slot: 'instruction',
    name: 'Press From The Front',
    description: 'Forwards close down the keeper. Win it high, score quick.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 1, defMod: 0, formMod: 0 },
  },
  {
    id: 'instr-compact-lines',
    slot: 'instruction',
    name: 'Compact Lines',
    description: 'Two banks of disciplined shape. Hard to play through.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 0, defMod: 1, formMod: 0 },
  },
  {
    id: 'instr-win-second-balls',
    slot: 'instruction',
    name: 'Win The Second Balls',
    description: 'Aerial duels are 50/50; we make them 60/40.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 1, defMod: 1, formMod: 0 },
  },
  {
    id: 'instr-stay-patient',
    slot: 'instruction',
    name: 'Stay Patient',
    description: "No rash decisions. The chance will come if we don't force it.",
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 0, defMod: 0, formMod: 2 },
  },
  {
    id: 'instr-quick-transitions',
    slot: 'instruction',
    name: 'Quick Transitions',
    description: "Counter the moment we win it. Don't let them reset.",
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 1, defMod: -1, formMod: 0 },
  },
  {
    id: 'instr-tempo-quickens',
    slot: 'instruction',
    name: 'Tempo Quickens',
    description: 'One-touch football. Drag them into a track meet.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 2, defMod: 0, formMod: -1 },
  },
  {
    id: 'instr-hold-the-line',
    slot: 'instruction',
    name: 'Hold The Line',
    description: 'Step up together. Sprung the offside trap a hundred times.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 0, defMod: 2, formMod: -1 },
  },
  {
    id: 'instr-time-wasting',
    slot: 'instruction',
    name: 'Time Wasting',
    description: 'The ref will book us. The crowd will boo. We take the win.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 0, defMod: 2, formMod: -1 },
  },
];

const CONDITIONAL_CARDS: TacticCard[] = [
  {
    id: 'instr-underdog-bite',
    slot: 'instruction',
    name: "Underdog's Bite",
    description: 'When nobody picks us. We play freer than the favourites.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 2,
      defMod: 0,
      formMod: 0,
      condition: (c) => c.opponentBaseRating - c.selfBaseRating >= 4,
      conditionLabel: 'Underdog matches (opp +4 rating)',
    },
  },
  {
    id: 'instr-derby-day',
    slot: 'instruction',
    name: 'Derby Day',
    description: 'Three points and bragging rights. They mean it more.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 1,
      defMod: 1,
      formMod: 1,
      condition: (c) => c.isDerby,
      conditionLabel: 'Derby fixtures only',
    },
  },
  {
    id: 'instr-away-days',
    slot: 'instruction',
    name: 'Away Days',
    description: 'Travelling support behind us. We feed off it.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 1,
      defMod: 0,
      formMod: 1,
      condition: (c) => !c.isHome,
      conditionLabel: 'Away matches only',
    },
  },
  {
    id: 'instr-home-comforts',
    slot: 'instruction',
    name: 'Home Comforts',
    description: 'Our crowd, our pitch, our rules.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 1,
      defMod: 1,
      formMod: 0,
      condition: (c) => c.isHome,
      conditionLabel: 'Home matches only',
    },
  },
  {
    id: 'instr-cup-tied',
    slot: 'instruction',
    name: 'Cup Tied',
    description: 'Knockout football is a different sport. We adjust.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 2,
      defMod: 0,
      formMod: 0,
      condition: (c) => c.isCup,
      conditionLabel: 'FA Cup ties only',
    },
  },
  {
    id: 'instr-big-game',
    slot: 'instruction',
    name: 'Big Game Mentality',
    description: 'The stage is huge. The shirts feel lighter.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 2,
      defMod: 0,
      formMod: 0,
      condition: (c) => c.opponentTier <= 2,
      conditionLabel: 'Vs Tier 1 or 2 opponents',
    },
  },
  {
    id: 'instr-bully-pulpit',
    slot: 'instruction',
    name: 'Bully Pulpit',
    description: "On the front foot from the whistle. Don't let them settle.",
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 2,
      defMod: -1,
      formMod: 0,
      condition: (c) => c.opponentTier >= 4,
      conditionLabel: 'Vs Tier 4 or 5 opponents',
    },
  },
  {
    id: 'instr-park-the-bus',
    slot: 'instruction',
    name: 'Park The Bus',
    description: 'Everyone behind the ball. We are not here to entertain.',
    tier: 'bronze',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 0,
      defMod: 3,
      formMod: -1,
      condition: (c) => c.opponentBaseRating - c.selfBaseRating >= 4,
      conditionLabel: 'Underdog matches (opp +4 rating)',
    },
  },
];

export const INSTRUCTION_CARDS: TacticCard[] = [...FLAT_CARDS, ...CONDITIONAL_CARDS];

/**
 * Cards granted automatically to every new manager and to any save being
 * migrated from v4 → v5. We seed with a small thoughtful starting hand so
 * the Instruction slot is immediately usable; remaining cards mint at
 * season-end over subsequent seasons.
 */
export const STARTER_INSTRUCTION_CARD_IDS: string[] = [
  'instr-press-from-front',
  'instr-compact-lines',
  'instr-win-second-balls',
  'instr-stay-patient',
];

export function getInstructionCard(id: string): TacticCard | undefined {
  return INSTRUCTION_CARDS.find((c) => c.id === id);
}

/**
 * Pick the next instruction card to mint for a manager, given their owned
 * set. Returns null if every card is already owned. RNG-seeded for replay
 * safety.
 */
export function pickNextInstructionToMint(
  ownedIds: string[],
  pickIndex: (max: number) => number,
): TacticCard | null {
  const owned = new Set(ownedIds);
  const remaining = INSTRUCTION_CARDS.filter((c) => !owned.has(c.id));
  if (remaining.length === 0) return null;
  return remaining[pickIndex(remaining.length)];
}
