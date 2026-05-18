import type { LegendaryUnlockContext, TacticCard } from '@/types/tactics';

/**
 * Phase D legendary instruction cards.
 *
 * Six hand-authored cards with named identities. Each declares an
 * `unlockCondition` that's evaluated against a `LegendaryUnlockContext`
 * at season-end. Cards mint exactly once per career: if the condition
 * fires and the card isn't already owned, it drops in that season's
 * pack (consuming one of the cap-3 drop budget).
 *
 * Effects still respect the engine's INSTRUCTION_TSS_CAP (±2 net
 * (atk+def)/2), so legendaries gain value through stat spread and
 * narrative framing rather than raw TSS escalation. The chase is the
 * unlock, not the power.
 */
export const LEGENDARY_CARDS: TacticCard[] = [
  {
    id: 'instr-legend-invincibles-wing-play',
    slot: 'instruction',
    name: "The Invincibles' Wing Play",
    description: 'Wide trios that switch and overlap, then vanish. Title-winning football.',
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 2,
      defMod: 1,
      formMod: 1,
      condition: (c) => c.isHome,
      conditionLabel: 'Home matches only',
    },
    schools: ['gegenpress', 'total-football'],
    family: 'legend-invincibles-wing-play',
    legendary: true,
    unlockCondition: (ctx) => ctx.wonLeague,
    unlockLabel: 'Won a Premier League title',
  },
  {
    id: 'instr-legend-cloughie-two-banks',
    slot: 'instruction',
    name: "Cloughie's Two Banks",
    description: 'Discipline carved into the grass. The bigger they are, the more they trip.',
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 1,
      defMod: 3,
      formMod: 0,
      condition: (c) => c.opponentTier <= 2,
      conditionLabel: 'Vs Tier 1 or 2 opponents',
    },
    schools: ['catenaccio'],
    family: 'legend-cloughie-two-banks',
    legendary: true,
    unlockCondition: (ctx) => ctx.beatTier1InCup,
    unlockLabel: 'Beat a Tier-1 club in the FA Cup',
  },
  {
    id: 'instr-legend-sacchi-pressing-trap',
    slot: 'instruction',
    name: "Sacchi's Pressing Trap",
    description: "Eleven players, four lines, one mind. They don't pass — they run into walls.",
    tier: 'elite',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 2,
      defMod: 2,
      formMod: 1,
      condition: (c) => c.isHome,
      conditionLabel: 'Home matches only',
    },
    schools: ['gegenpress'],
    family: 'legend-sacchi-pressing-trap',
    legendary: true,
    unlockCondition: (ctx) => ctx.crossed75,
    unlockLabel: 'Crossed Manager Reputation 75',
  },
  {
    id: 'instr-legend-total-football-74',
    slot: 'instruction',
    name: "Total Football '74",
    description: 'Every player a midfielder. Every midfielder everything. Cruyff approves.',
    tier: 'elite',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 2, defMod: 2, formMod: 2 },
    schools: ['total-football'],
    family: 'legend-total-football-74',
    legendary: true,
    unlockCondition: (ctx) => ctx.crossed90,
    unlockLabel: 'Reached Iconic status (rep 90+)',
  },
  {
    id: 'instr-legend-survival-instinct',
    slot: 'instruction',
    name: 'Survival Instinct',
    description: "The Houdini act. They write us off; we write the comeback.",
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 1,
      defMod: 2,
      formMod: 1,
      condition: (c) => c.opponentBaseRating - c.selfBaseRating >= 4,
      conditionLabel: 'Underdog matches (opp +4 rating)',
    },
    schools: ['catenaccio', 'direct'],
    family: 'legend-survival-instinct',
    legendary: true,
    unlockCondition: (ctx) => ctx.survivedRelegation,
    unlockLabel: 'Survived against a relegation expectation',
  },
  {
    id: 'instr-legend-cup-final-march',
    slot: 'instruction',
    name: 'The Cup Final March',
    description: 'Wembley silver in the cabinet. Knockout football, perfected.',
    tier: 'elite',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 3,
      defMod: 1,
      formMod: 1,
      condition: (c) => c.isCup,
      conditionLabel: 'FA Cup ties only',
    },
    schools: ['direct', 'gegenpress'],
    family: 'legend-cup-final-march',
    legendary: true,
    unlockCondition: (ctx) => ctx.wonCup,
    unlockLabel: 'Won the FA Cup',
  },
];

export function getLegendaryCard(id: string): TacticCard | undefined {
  return LEGENDARY_CARDS.find((c) => c.id === id);
}

/**
 * Returns every legendary whose unlock condition is met by the given
 * context AND that the manager doesn't already own. Order is stable
 * (matches `LEGENDARY_CARDS` order) so the season-end mint flow can
 * deterministically pick the first eligible card.
 */
export function findUnlockedLegendaries(
  ctx: LegendaryUnlockContext,
  ownedIds: string[],
): TacticCard[] {
  const owned = new Set(ownedIds);
  return LEGENDARY_CARDS.filter((c) => {
    if (owned.has(c.id)) return false;
    if (!c.unlockCondition) return false;
    return c.unlockCondition(ctx);
  });
}
