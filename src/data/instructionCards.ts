import type { LegendaryUnlockContext, ManagerSchool, TacticCard } from '@/types/tactics';
import { SeededRNG } from '@/utils/rng';
import { LEGENDARY_CARDS, getLegendaryCard, findUnlockedLegendaries } from './legendaryCards';

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
    schools: ['gegenpress', 'total-football'],
    family: 'press-from-front',
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
    schools: ['catenaccio'],
    family: 'compact-lines',
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
    schools: ['tiki-taka', 'direct'],
    family: 'win-second-balls',
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
    schools: ['tiki-taka'],
    family: 'stay-patient',
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
    schools: ['gegenpress', 'direct'],
    family: 'quick-transitions',
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
    schools: ['gegenpress', 'direct'],
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
    schools: ['catenaccio'],
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
    schools: ['catenaccio'],
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
    schools: ['gegenpress'],
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
    schools: ['tiki-taka', 'total-football'],
    family: 'derby-day',
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
    schools: ['direct'],
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
    schools: ['tiki-taka'],
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
    schools: ['gegenpress'],
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
    schools: ['total-football'],
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
    schools: ['direct'],
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
    schools: ['catenaccio'],
  },
];

/**
 * Phase D: silver and gold tier variants for six popular families. Same
 * `family` as their bronze; stronger effects; gated at mint time by
 * manager reputation (silver from rep 50+, gold from rep 75+). The
 * engine's INSTRUCTION_TSS_CAP still clamps net (atk+def)/2 contribution
 * at ±2, so the variants gain value through stat spread (form,
 * complementary def) rather than raw TSS escalation.
 */
const TIER_VARIANT_CARDS: TacticCard[] = [
  // — press-from-front family —
  {
    id: 'instr-press-from-front-silver',
    slot: 'instruction',
    name: 'Press From The Front',
    description: 'Choreographed pressing traps. Cut the passing lanes before they form.',
    tier: 'silver',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 2, defMod: 0, formMod: 0 },
    schools: ['gegenpress', 'total-football'],
    family: 'press-from-front',
  },
  {
    id: 'instr-press-from-front-gold',
    slot: 'instruction',
    name: 'Press From The Front',
    description: 'A red-line trigger every defender knows by heart. Suffocation as a system.',
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 3, defMod: 0, formMod: 1 },
    schools: ['gegenpress', 'total-football'],
    family: 'press-from-front',
  },
  // — compact-lines family —
  {
    id: 'instr-compact-lines-silver',
    slot: 'instruction',
    name: 'Compact Lines',
    description: 'Shape rehearsed until it bores them. They run out of ideas first.',
    tier: 'silver',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 0, defMod: 2, formMod: 0 },
    schools: ['catenaccio'],
    family: 'compact-lines',
  },
  {
    id: 'instr-compact-lines-gold',
    slot: 'instruction',
    name: 'Compact Lines',
    description: 'A masterclass in geometry. Eight on the ball, eleven off it.',
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 0, defMod: 3, formMod: 1 },
    schools: ['catenaccio'],
    family: 'compact-lines',
  },
  // — win-second-balls family —
  {
    id: 'instr-win-second-balls-silver',
    slot: 'instruction',
    name: 'Win The Second Balls',
    description: 'Headers won; legs reaching the rebound. Territory by attrition.',
    tier: 'silver',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 2, defMod: 1, formMod: 0 },
    schools: ['tiki-taka', 'direct'],
    family: 'win-second-balls',
  },
  {
    id: 'instr-win-second-balls-gold',
    slot: 'instruction',
    name: 'Win The Second Balls',
    description: 'The unglamorous game won early and won often. Every loose ball ours.',
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 2, defMod: 2, formMod: 0 },
    schools: ['tiki-taka', 'direct'],
    family: 'win-second-balls',
  },
  // — stay-patient family —
  {
    id: 'instr-stay-patient-silver',
    slot: 'instruction',
    name: 'Stay Patient',
    description: 'Composure rehearsed. We pass through pressure rather than around it.',
    tier: 'silver',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 0, defMod: 0, formMod: 3 },
    schools: ['tiki-taka'],
    family: 'stay-patient',
  },
  {
    id: 'instr-stay-patient-gold',
    slot: 'instruction',
    name: 'Stay Patient',
    description: 'The opposition tires of chasing shadows. The chance arrives well-prepared.',
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 1, defMod: 0, formMod: 3 },
    schools: ['tiki-taka'],
    family: 'stay-patient',
  },
  // — quick-transitions family —
  {
    id: 'instr-quick-transitions-silver',
    slot: 'instruction',
    name: 'Quick Transitions',
    description: 'Three passes from defence to attack. The cleanest break in the league.',
    tier: 'silver',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 2, defMod: -1, formMod: 0 },
    schools: ['gegenpress', 'direct'],
    family: 'quick-transitions',
  },
  {
    id: 'instr-quick-transitions-gold',
    slot: 'instruction',
    name: 'Quick Transitions',
    description: 'Counter-attack as art form. The opponent never gets a chance to set.',
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: { atkMod: 3, defMod: -1, formMod: 0 },
    schools: ['gegenpress', 'direct'],
    family: 'quick-transitions',
  },
  // — derby-day family (conditional, scales the always-on side) —
  {
    id: 'instr-derby-day-silver',
    slot: 'instruction',
    name: 'Derby Day',
    description: 'Old rivals, prepared rehearsal. We arrive with a plan they cannot read.',
    tier: 'silver',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 2,
      defMod: 1,
      formMod: 1,
      condition: (c) => c.isDerby,
      conditionLabel: 'Derby fixtures only',
    },
    schools: ['tiki-taka', 'total-football'],
    family: 'derby-day',
  },
  {
    id: 'instr-derby-day-gold',
    slot: 'instruction',
    name: 'Derby Day',
    description: 'A derby week of preparation, three points before kickoff.',
    tier: 'gold',
    atkMod: 0,
    defMod: 0,
    effect: {
      atkMod: 2,
      defMod: 2,
      formMod: 1,
      condition: (c) => c.isDerby,
      conditionLabel: 'Derby fixtures only',
    },
    schools: ['tiki-taka', 'total-football'],
    family: 'derby-day',
  },
];

export const INSTRUCTION_CARDS: TacticCard[] = [
  ...FLAT_CARDS,
  ...CONDITIONAL_CARDS,
  ...TIER_VARIANT_CARDS,
  ...LEGENDARY_CARDS,
];

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
  return INSTRUCTION_CARDS.find((c) => c.id === id) ?? getLegendaryCard(id);
}

/**
 * Phase D: reputation-gated tier eligibility for regular drops. Legendaries
 * are excluded from this pool entirely — they mint only through their
 * unlock conditions.
 *
 * - rep < 50: bronze-only
 * - rep 50–74: bronze + silver
 * - rep 75–89: bronze + silver + gold
 * - rep 90+: all non-legendary tiers (silver/gold/elite eligible)
 */
export function allowedTiersForReputation(rep: number): Set<string> {
  if (rep < 50) return new Set(['bronze']);
  if (rep < 75) return new Set(['bronze', 'silver']);
  if (rep < 90) return new Set(['bronze', 'silver', 'gold']);
  return new Set(['bronze', 'silver', 'gold', 'elite']);
}

/**
 * Pick the next instruction card to mint for a manager, given their owned
 * set. Returns null if every card is already owned. RNG-seeded for replay
 * safety.
 *
 * Phase C: when `opts.school` is supplied, drops are biased toward cards
 * tagged with that school using `SCHOOL_BIAS_IN_SCHOOL` / `SCHOOL_BIAS_OUT`
 * weights via `rng.weightedPick`. Neutral cards (no `schools` tag) count
 * as in-school for every manager so they're always eligible.
 *
 * Phase D: legendaries are filtered out of the regular pool. When
 * `opts.reputation` is supplied, the candidate pool is also filtered to
 * tiers permitted by `allowedTiersForReputation` so low-rep managers
 * never roll silver/gold/elite cards.
 *
 * The legacy uniform path is preserved when `opts.school` and `opts.rng`
 * are both undefined — call sites that don't yet know about schools (tests,
 * mid-season ad-hoc grants) keep their deterministic behaviour.
 */
export function pickNextInstructionToMint(
  ownedIds: string[],
  pickIndex: (max: number) => number,
  opts?: { school?: ManagerSchool; rng?: SeededRNG; reputation?: number },
): TacticCard | null {
  const owned = new Set(ownedIds);
  // Legendaries never mint through the regular pool.
  const allowedTiers = opts?.reputation !== undefined
    ? allowedTiersForReputation(opts.reputation)
    : null;
  const remaining = INSTRUCTION_CARDS.filter((c) => {
    if (owned.has(c.id)) return false;
    if (c.legendary) return false;
    if (allowedTiers && !allowedTiers.has(c.tier)) return false;
    return true;
  });
  if (remaining.length === 0) return null;

  if (!opts?.school || !opts.rng) {
    return remaining[pickIndex(remaining.length)];
  }

  const school = opts.school;
  const inSchool: TacticCard[] = [];
  const outSchool: TacticCard[] = [];
  for (const c of remaining) {
    const tagged = c.schools && c.schools.length > 0;
    const matches = !tagged || (c.schools as ManagerSchool[]).includes(school);
    if (matches) inSchool.push(c);
    else outSchool.push(c);
  }

  // Degenerate fallbacks: if one bucket is empty, fall back to the other.
  if (inSchool.length === 0) return outSchool[pickIndex(outSchool.length)];
  if (outSchool.length === 0) return inSchool[pickIndex(inSchool.length)];

  // Per-card weight so that the in-school bucket's combined weight is
  // SCHOOL_BIAS_IN_SCHOOL and the out-school bucket's is SCHOOL_BIAS_OUT.
  // The weightedPick API takes a flat items[] / weights[], so we build
  // them in parallel.
  const items: TacticCard[] = [];
  const weights: number[] = [];
  const inW = SCHOOL_BIAS_IN_SCHOOL / inSchool.length;
  const outW = SCHOOL_BIAS_OUT / outSchool.length;
  for (const c of inSchool) {
    items.push(c);
    weights.push(inW);
  }
  for (const c of outSchool) {
    items.push(c);
    weights.push(outW);
  }
  return opts.rng.weightedPick(items, weights);
}

/** Phase C: 60/40 in-school vs out-of-school weight split for pack drops. */
export const SCHOOL_BIAS_IN_SCHOOL = 60;
export const SCHOOL_BIAS_OUT = 40;

/**
 * Phase B.5 season-end mint helper. Computes how many instruction cards a
 * manager earns this season (base + trophy + reputation milestone bonuses,
 * capped at 3) and which specific cards they receive. Deterministic for a
 * given seed — replays produce the same drops.
 *
 * Bonus rules (per spec):
 *   - +1 base (always).
 *   - +1 if league title OR FA Cup won.
 *   - +1 if reputation crossed 50 or 75 *this season* (previousReputation
 *     was below the threshold, current is at or above it).
 *   - Cap total at 3.
 *
 * Returns an empty array when every card is already owned. A short array
 * (less than requested) is returned when the pool is partially exhausted.
 */
export const MAX_SEASON_END_DROPS = 3;

export interface InstructionDropArgs {
  wonLeague: boolean;
  wonCup: boolean;
  repNow: number;
  repPrev: number;
  ownedIds: string[];
  seed: string;
  school?: ManagerSchool;
  /** Phase D legendary context. Optional for back-compat with tests. */
  beatTier1InCup?: boolean;
  survivedRelegation?: boolean;
}

export function computeInstructionDropCount(args: Pick<InstructionDropArgs, 'wonLeague' | 'wonCup' | 'repNow' | 'repPrev'>): number {
  let count = 1; // base
  if (args.wonLeague || args.wonCup) count++;
  const crossed50 = args.repPrev < 50 && args.repNow >= 50;
  const crossed75 = args.repPrev < 75 && args.repNow >= 75;
  if (crossed50 || crossed75) count++;
  return Math.min(MAX_SEASON_END_DROPS, count);
}

/**
 * Build the LegendaryUnlockContext that drives the Phase D chase-card
 * unlocks. Pure data — same purity contract as InstructionContext.
 */
export function buildLegendaryContext(args: InstructionDropArgs): LegendaryUnlockContext {
  return {
    wonLeague: args.wonLeague,
    wonCup: args.wonCup,
    beatTier1InCup: args.beatTier1InCup ?? false,
    crossed75: args.repPrev < 75 && args.repNow >= 75,
    crossed90: args.repPrev < 90 && args.repNow >= 90,
    survivedRelegation: args.survivedRelegation ?? false,
    school: args.school,
    reputation: args.repNow,
  };
}

export function computeInstructionDrops(args: InstructionDropArgs): TacticCard[] {
  const count = computeInstructionDropCount(args);
  if (count === 0) return [];

  const rng = new SeededRNG(`${args.seed}-instruction-mint`);
  const pickIndex = (max: number) => rng.randomInt(0, max - 1);

  const runningOwned = new Set(args.ownedIds);
  const drops: TacticCard[] = [];

  // Phase D: legendary cards mint first when their unlock condition is
  // met AND they aren't owned. At most one legendary per season (chase
  // cards should feel rare). Consumes one of the cap-3 drop budget.
  const legendCtx = buildLegendaryContext(args);
  const unlocked = findUnlockedLegendaries(legendCtx, Array.from(runningOwned));
  if (unlocked.length > 0 && drops.length < count) {
    // Deterministic pick — use the seeded RNG so replays match.
    const idx = unlocked.length === 1 ? 0 : rng.randomInt(0, unlocked.length - 1);
    const legendary = unlocked[idx];
    runningOwned.add(legendary.id);
    drops.push(legendary);
  }

  // Fill remaining slots from the regular reputation-skewed pool.
  while (drops.length < count) {
    const next = pickNextInstructionToMint(Array.from(runningOwned), pickIndex, {
      school: args.school,
      rng,
      reputation: args.repNow,
    });
    if (!next) break; // pool exhausted
    runningOwned.add(next.id);
    drops.push(next);
  }
  return drops;
}
