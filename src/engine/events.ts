import type {
  Player,
  Club,
  GamePhase,
  SeasonEvent,
  ActiveModifier,
  EventCategory,
  Position,
} from '../types/entities';
import { SeededRNG } from '../utils/rng';
import { generatePlayer, calculateMarketValue } from './playerGen';

// ─── Event Definition ───

interface EventTemplate {
  id: string;
  category: EventCategory;
  /** Returns description string if conditions are met, null otherwise */
  condition: (ctx: EventContext) => boolean;
  generate: (ctx: EventContext, rng: SeededRNG) => GeneratedEvent | null;
}

export interface GeneratedEvent {
  description: string;
  modifiers: ActiveModifier[];
  /** Budget delta for the player's club */
  budgetDelta?: number;
  /** New player to add to roster (youth prospect, returning academy player, etc.) */
  newPlayer?: Player;
  /** Reputation delta for the manager */
  reputationDelta?: number;
}

export interface EventContext {
  playerClubId: string;
  clubs: Club[];
  phase: GamePhase;
  seasonNumber: number;
  managerReputation: number;
  recentResults?: { clubId: string; wins: number; losses: number; total: number }[];
  firedThisSeason: Map<string, number>;
  seasonSeed: string;
}

// ─── Helper: next phase for modifier expiry ───

const PHASE_ORDER: GamePhase[] = [
  'summer_window', 'august', 'september', 'october', 'november',
  'december', 'january_window', 'january', 'february', 'march',
  'april', 'may', 'season_end',
];

function nextPhase(current: GamePhase): GamePhase {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return 'season_end';
  return PHASE_ORDER[idx + 1];
}

function phaseAfterN(current: GamePhase, n: number): GamePhase {
  let idx = PHASE_ORDER.indexOf(current);
  for (let i = 0; i < n; i++) {
    idx++;
    // Skip window phases when advancing
    while (idx < PHASE_ORDER.length && (PHASE_ORDER[idx] === 'summer_window' || PHASE_ORDER[idx] === 'january_window')) {
      idx++;
    }
    if (idx >= PHASE_ORDER.length) return 'season_end';
  }
  return PHASE_ORDER[idx] || 'season_end';
}

function isMonthlyPhase(phase: GamePhase): boolean {
  return !['summer_window', 'january_window', 'season_end'].includes(phase);
}

function isTransferPhase(phase: GamePhase): boolean {
  return phase === 'summer_window' || phase === 'january_window';
}

function getPlayerClub(clubs: Club[], clubId: string): Club | undefined {
  return clubs.find((c) => c.id === clubId);
}

function getRandomPlayer(rng: SeededRNG, roster: Player[], filter?: (p: Player) => boolean): Player | null {
  const candidates = filter ? roster.filter(filter) : roster;
  if (candidates.length === 0) return null;
  return candidates[rng.randomInt(0, candidates.length - 1)];
}

function getRandomClub(rng: SeededRNG, clubs: Club[], excludeId: string): Club {
  const others = clubs.filter((c) => c.id !== excludeId);
  return others[rng.randomInt(0, others.length - 1)];
}

function makeModifier(
  id: string,
  description: string,
  effect: Record<string, number>,
  expiresAt: GamePhase,
  targetPlayerId?: string,
  targetClubId?: string,
): ActiveModifier {
  return { id, description, effect, expiresAt, targetPlayerId, targetClubId };
}

// ─── Form Events (3-5 per month) ───

const FORM_EVENTS: EventTemplate[] = [
  {
    id: 'form_st_hot_streak',
    category: 'form',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.position === 'ST' && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} is in the form of his life. Goals are flowing.`,
        modifiers: [makeModifier(`form-st-hot-${ctx.phase}`, `${player.name} hot streak`, { ATK: 4 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'form_cb_shaky',
    category: 'form',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.position === 'CB' && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} looks shaky at the back. Costly errors creeping in.`,
        modifiers: [makeModifier(`form-cb-shaky-${ctx.phase}`, `${player.name} shaky`, { DEF: -3 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'form_mf_brilliant',
    category: 'form',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.position === 'MF' && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} has been quietly brilliant. Running the midfield.`,
        modifiers: [makeModifier(`form-mf-brill-${ctx.phase}`, `${player.name} brilliant`, { MEN: 3, SKL: 2 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'form_wg_knock',
    category: 'form',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => (p.position === 'WG' || p.position === 'MF') && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} picked up a knock in training. He'll play through it, but he's not 100%.`,
        modifiers: [makeModifier(`form-knock-${ctx.phase}`, `${player.name} knock`, { ATK: -2, DEF: -2, MOV: -2, PWR: -2, MEN: -2, SKL: -2 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'form_fb_marauding',
    category: 'form',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.position === 'FB' && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} has been marauding down the flank. Looks unplayable.`,
        modifiers: [makeModifier(`form-fb-maraud-${ctx.phase}`, `${player.name} marauding`, { MOV: 4, ATK: 2 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'form_gk_wall',
    category: 'form',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.position === 'GK' && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} hasn't been beaten in weeks. Wall-like form.`,
        modifiers: [makeModifier(`form-gk-wall-${ctx.phase}`, `${player.name} wall`, { DEF: 5 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'form_mf_slow_motion',
    category: 'form',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.position === 'MF' && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} looks like he's playing in slow motion. Lost his rhythm entirely.`,
        modifiers: [makeModifier(`form-mf-slow-${ctx.phase}`, `${player.name} slow`, { MOV: -3, MEN: -2 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'form_st_cant_score',
    category: 'form',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.position === 'ST' && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} can't buy a goal. Hitting the post, skying chances.`,
        modifiers: [makeModifier(`form-st-cold-${ctx.phase}`, `${player.name} cold streak`, { ATK: -4 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
];

// ─── Squad Events (1-2 per month) ───

const SQUAD_EVENTS: EventTemplate[] = [
  {
    id: 'squad_morale_high',
    category: 'squad',
    condition: (ctx) => {
      if (!isMonthlyPhase(ctx.phase) || !ctx.recentResults) return false;
      const r = ctx.recentResults.find((rr) => rr.clubId === ctx.playerClubId);
      return r ? r.total > 0 && r.wins / r.total >= 0.7 : false;
    },
    generate: (ctx) => ({
      description: 'Team morale is sky-high after a strong run of results.',
      modifiers: [makeModifier(`squad-morale-high-${ctx.phase}`, 'High morale', { TSS: 2 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'squad_morale_low',
    category: 'squad',
    condition: (ctx) => {
      if (!isMonthlyPhase(ctx.phase) || !ctx.recentResults) return false;
      const r = ctx.recentResults.find((rr) => rr.clubId === ctx.playerClubId);
      return r ? r.total > 0 && r.losses / r.total >= 0.7 : false;
    },
    generate: (ctx) => ({
      description: 'Dressing room unrest. Players unhappy with recent results.',
      modifiers: [makeModifier(`squad-morale-low-${ctx.phase}`, 'Low morale', { TSS: -2 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'squad_captain_rallies',
    category: 'squad',
    condition: (ctx) => {
      if (!isMonthlyPhase(ctx.phase)) return false;
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      return club ? club.roster.some((p) => p.trait === 'Leader' && !p.injured) : false;
    },
    generate: (ctx) => ({
      description: 'Your captain has rallied the squad before a crucial run of fixtures.',
      modifiers: [makeModifier(`squad-captain-${ctx.phase}`, 'Captain rally', { MEN: 1 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'squad_youth_prospect',
    category: 'squad',
    condition: (ctx) => {
      if (!isMonthlyPhase(ctx.phase)) return false;
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      return club ? club.roster.filter((p) => !p.isTemporary).length < 16 : false;
    },
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const positions: Position[] = ['MF', 'WG', 'ST', 'CB', 'FB'];
      const pos = positions[rng.randomInt(0, positions.length - 1)];
      const rating = rng.randomInt(55, 65);
      const newPlayer = generatePlayer(rng, pos, rating, club.namePool, `${club.id}-youth-${ctx.seasonNumber}-${ctx.phase}`);
      newPlayer.age = 17;
      newPlayer.trait = 'Prospect';
      newPlayer.highPotential = true;
      newPlayer.earlyPeaker = false;
      newPlayer.seasonsAtClub = 0;
      return {
        description: `A youth academy prospect has caught the eye in training. ${newPlayer.name} (${pos}, ${rating}) joins the squad.`,
        modifiers: [],
        newPlayer,
      };
    },
  },
  {
    id: 'squad_team_bonding',
    category: 'squad',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx) => ({
      description: 'The team has bonded over a team-building trip. Chemistry feels different.',
      modifiers: [makeModifier(`squad-bonding-${ctx.phase}`, 'Team bonding', { TSS: 1 }, phaseAfterN(ctx.phase, 2), undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'squad_mentoring',
    category: 'squad',
    condition: (ctx) => {
      if (!isMonthlyPhase(ctx.phase)) return false;
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return false;
      const seniors = club.roster.filter((p) => p.age >= 28 && !p.isTemporary);
      return seniors.length >= 3;
    },
    generate: (ctx) => ({
      description: 'Senior players are mentoring the younger squad members.',
      modifiers: [makeModifier(`squad-mentoring-${ctx.phase}`, 'Senior mentoring', { DEV_BONUS: 1 }, 'season_end', undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'squad_bust_up',
    category: 'squad',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const p1 = getRandomPlayer(rng, club.roster, (p) => !p.injured && !p.isTemporary);
      const p2 = getRandomPlayer(rng, club.roster, (p) => !p.injured && !p.isTemporary && p.id !== p1?.id);
      if (!p1 || !p2) return null;
      return {
        description: `Two players involved in a training ground bust-up. ${p1.name} and ${p2.name} both affected.`,
        modifiers: [
          makeModifier(`squad-bustup1-${ctx.phase}`, `${p1.name} bust-up`, { MEN: -2 }, nextPhase(ctx.phase), p1.id, ctx.playerClubId),
          makeModifier(`squad-bustup2-${ctx.phase}`, `${p2.name} bust-up`, { MEN: -2 }, nextPhase(ctx.phase), p2.id, ctx.playerClubId),
        ],
      };
    },
  },
  {
    id: 'squad_new_tactics',
    category: 'squad',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx) => ({
      description: 'New tactical system clicking. Players look sharp in training.',
      modifiers: [makeModifier(`squad-tactics-${ctx.phase}`, 'New tactics', { FORMATION_DOUBLE: 1 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
    }),
  },
];

// ─── Transfer Window Events (2-3 per window) ───

const TRANSFER_EVENTS: EventTemplate[] = [
  {
    id: 'transfer_rival_circling',
    category: 'transfer_window',
    condition: (ctx) => isTransferPhase(ctx.phase),
    generate: (ctx, _rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const star = club.roster.reduce((best, p) => (!p.isTemporary && p.overall > (best?.overall ?? 0) ? p : best), null as Player | null);
      if (!star) return null;
      return {
        description: `Rival club is circling your star player ${star.name}. Expect a big bid.`,
        modifiers: [],
      };
    },
  },
  {
    id: 'transfer_request',
    category: 'transfer_window',
    condition: (ctx) => {
      if (!isTransferPhase(ctx.phase)) return false;
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      return club ? club.roster.some((p) => p.trait === 'Ambitious' && p.seasonsAtClub >= 3 && !p.isTemporary) : false;
    },
    generate: (ctx, _rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const candidates = club.roster.filter((p) => p.trait === 'Ambitious' && p.seasonsAtClub >= 3 && !p.isTemporary);
      if (candidates.length === 0) return null;
      const player = candidates[_rng.randomInt(0, candidates.length - 1)];
      return {
        description: `${player.name} has handed in a transfer request. He's been at the club ${player.seasonsAtClub} seasons and wants a new challenge.`,
        modifiers: [makeModifier(`transfer-request-${ctx.phase}`, `${player.name} unhappy`, { MEN: -3 }, 'season_end', player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'transfer_surprise_funds',
    category: 'transfer_window',
    condition: (ctx) => isTransferPhase(ctx.phase),
    generate: (_ctx, rng) => {
      if (rng.random() > 0.05) return null; // 5% chance
      const boost = rng.randomFloat(0.10, 0.20);
      return {
        description: `Surprise funds! The board has approved additional transfer budget (+${Math.round(boost * 100)}%).`,
        modifiers: [],
        budgetDelta: boost, // Percentage — caller multiplies by current budget
      };
    },
  },
  {
    id: 'transfer_budget_cut',
    category: 'transfer_window',
    condition: (ctx) => isTransferPhase(ctx.phase),
    generate: (_ctx, rng) => {
      if (rng.random() > 0.05) return null; // 5% chance
      const cut = rng.randomFloat(-0.15, -0.10);
      return {
        description: `Financial constraints. The board has reduced your transfer budget (${Math.round(cut * 100)}%).`,
        modifiers: [],
        budgetDelta: cut,
      };
    },
  },
  {
    id: 'transfer_unsettled_star',
    category: 'transfer_window',
    condition: (ctx) => isTransferPhase(ctx.phase),
    generate: (ctx, rng) => {
      const rivalClub = getRandomClub(rng, ctx.clubs, ctx.playerClubId);
      const star = rivalClub.roster
        .filter((p) => !p.isTemporary && p.overall >= 72)
        .sort((a, b) => b.overall - a.overall)[0];
      if (!star) return null;
      return {
        description: `Agent whispers: ${star.name} (${star.position}, ${star.overall}) at ${rivalClub.shortName} is unsettled. Available at market value this window only.`,
        modifiers: [],
      };
    },
  },
  {
    id: 'transfer_foreign_interest_youth',
    category: 'transfer_window',
    condition: (ctx) => isTransferPhase(ctx.phase),
    generate: (ctx, _rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const youngStars = club.roster.filter((p) => p.age < 22 && !p.isTemporary).sort((a, b) => b.overall - a.overall);
      if (youngStars.length === 0) return null;
      const player = youngStars[0];
      return {
        description: `A foreign club is sniffing around your young talent ${player.name} (${player.overall}).`,
        modifiers: [],
      };
    },
  },
  {
    id: 'transfer_academy_return',
    category: 'transfer_window',
    condition: (ctx) => isTransferPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club || club.roster.filter((p) => !p.isTemporary).length >= 16) return null;
      const pos: Position = rng.weightedPick(['MF', 'CB', 'ST', 'FB', 'WG', 'GK'], [25, 20, 20, 15, 15, 5]);
      const rating = rng.randomInt(65, 72);
      const newPlayer = generatePlayer(rng, pos, rating, club.namePool, `${club.id}-academy-${ctx.seasonNumber}`);
      newPlayer.trait = 'Loyal';
      newPlayer.value = calculateMarketValue(newPlayer.overall, newPlayer.age, newPlayer.form) * 0.8;
      return {
        description: `Former academy player ${newPlayer.name} wants to come home. Available at a discount (${pos}, ${rating}).`,
        modifiers: [],
        newPlayer,
      };
    },
  },
  {
    id: 'transfer_marquee_signing',
    category: 'transfer_window',
    condition: (ctx) => isTransferPhase(ctx.phase),
    generate: (_ctx, rng) => {
      if (rng.random() > 0.15) return null;
      return {
        description: 'Board wants marquee signing to boost commercial revenue. +£15M budget bonus — but you must spend at least £10M this window or lose the bonus.',
        modifiers: [],
        budgetDelta: 15, // Flat £15M
      };
    },
  },
];

// ─── Season Narrative Events (2-3 per season) ───

const SEASON_NARRATIVE_EVENTS: EventTemplate[] = [
  {
    id: 'narrative_documentary',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'august',
    generate: () => ({
      description: 'A documentary crew is following the club this season. The cameras are rolling.',
      modifiers: [],
    }),
  },
  {
    id: 'narrative_training_facility',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'august',
    generate: (ctx) => ({
      description: 'New training facility opened. Young players will benefit from improved coaching.',
      modifiers: [makeModifier('narrative-training', 'Training facility', { DEV_BONUS: 1 }, 'season_end', undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'narrative_kit_sponsor',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'september',
    generate: () => ({
      description: 'Kit sponsor deal renewed at higher value. +£5M budget next season.',
      modifiers: [],
      budgetDelta: 5,
    }),
  },
  {
    id: 'narrative_ballon_dor',
    category: 'season_narrative',
    condition: (ctx) => {
      if (ctx.phase !== 'november') return false;
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      return club ? club.roster.some((p) => p.overall >= 85 && !p.isTemporary) : false;
    },
    generate: (ctx) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId)!;
      const star = club.roster.filter((p) => p.overall >= 85 && !p.isTemporary).sort((a, b) => b.overall - a.overall)[0];
      return {
        description: `${star.name} nominated for Ballon d'Or! The squad is buzzing.`,
        modifiers: [makeModifier('narrative-ballondor', 'Ballon d\'Or buzz', { MEN: 1 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'narrative_rivalry_interview',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'october',
    generate: (ctx) => ({
      description: 'Local rivalry intensified after controversial interview. Next derby will be fiery.',
      modifiers: [makeModifier('narrative-rivalry', 'Rivalry intensified', { DERBY_CHAOS: 2 }, 'season_end', undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'narrative_club_legend',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'august',
    generate: (ctx) => ({
      description: 'Club legend returns as assistant coach. His presence has lifted the dressing room.',
      modifiers: [makeModifier('narrative-legend', 'Club legend', { MEN: 1 }, 'season_end', undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'narrative_new_ownership',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'september',
    generate: (_ctx, rng) => {
      const isPositive = rng.random() < 0.6;
      return {
        description: isPositive
          ? 'New ownership group takes over. They\'re investing heavily. +£10M budget boost.'
          : 'New ownership group takes over. Restructuring costs bite. -£5M budget.',
        modifiers: [],
        budgetDelta: isPositive ? 10 : -5,
      };
    },
  },
  {
    id: 'narrative_prestigious_friendly',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'august',
    generate: () => ({
      description: 'Club awarded hosting rights for a prestigious friendly. International exposure.',
      modifiers: [],
      reputationDelta: 2,
    }),
  },
  {
    id: 'narrative_stadium_expansion',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'october',
    generate: (ctx) => ({
      description: 'Stadium expansion announced. The atmosphere will be electric next season.',
      modifiers: [makeModifier('narrative-stadium', 'Stadium buzz', { TSS_HOME: 1 }, 'season_end', undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'narrative_academy_overhaul',
    category: 'season_narrative',
    condition: (ctx) => ctx.phase === 'november',
    generate: (ctx) => ({
      description: 'Academy overhaul completed. Youth products will be stronger for the next few seasons.',
      modifiers: [makeModifier('narrative-academy', 'Academy overhaul', { YOUTH_BOOST: 3 }, 'season_end', undefined, ctx.playerClubId)],
    }),
  },
];

// ─── Managerial Events (0-2 per season) ───

const MANAGERIAL_EVENTS: EventTemplate[] = [
  {
    id: 'manager_pundits_question',
    category: 'managerial',
    condition: (ctx) => isMonthlyPhase(ctx.phase) && ctx.managerReputation < 40,
    generate: () => ({
      description: 'Pundits question your tactics after a poor run.',
      modifiers: [],
      reputationDelta: -1,
    }),
  },
  {
    id: 'manager_motm',
    category: 'managerial',
    condition: (ctx) => isMonthlyPhase(ctx.phase) && ctx.managerReputation >= 30,
    generate: () => ({
      description: 'You\'ve been shortlisted for Manager of the Month.',
      modifiers: [],
      reputationDelta: 1,
    }),
  },
  {
    id: 'manager_rival_dig',
    category: 'managerial',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const rival = getRandomClub(rng, ctx.clubs, ctx.playerClubId);
      return {
        description: `${rival.shortName}'s manager takes a dig at you in the press. Next match against them will be a grudge match.`,
        modifiers: [makeModifier(`manager-grudge-${ctx.phase}`, 'Grudge match', { DERBY_CHAOS: 1, MEN: 2 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'manager_board_confidence',
    category: 'managerial',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: () => ({
      description: 'Board expresses full confidence in your project.',
      modifiers: [],
      reputationDelta: 1,
    }),
  },
];

// ─── Player Life Events (1-3 per season) ───

const PLAYER_LIFE_EVENTS: EventTemplate[] = [
  {
    id: 'life_national_team',
    category: 'player_life',
    condition: (ctx) => ctx.phase === 'october' || ctx.phase === 'march',
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.overall >= 65 && !p.injured && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} has been called up to his national team. He'll miss one match but returns with a confidence boost.`,
        modifiers: [makeModifier(`life-national-${ctx.phase}`, `${player.name} international`, { MEN: 2 }, phaseAfterN(ctx.phase, 1), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'life_first_child',
    category: 'player_life',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.age >= 24 && p.age <= 32 && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} welcomed his first child. Congratulations to the family!`,
        modifiers: [makeModifier(`life-child-${ctx.phase}`, `${player.name} new father`, { MEN: 2 }, phaseAfterN(ctx.phase, 2), player.id, ctx.playerClubId)],
      };
    },
  },
  {
    id: 'life_european_interest',
    category: 'player_life',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.highPotential && p.overall >= 70 && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} is attracting interest from top European clubs. His stock is rising fast.`,
        modifiers: [],
      };
    },
  },
  {
    id: 'life_considering_retirement',
    category: 'player_life',
    condition: (ctx) => ctx.phase === 'march' || ctx.phase === 'april',
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.age >= 34 && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} (age ${player.age}) is considering retirement at the end of the season. Plan accordingly.`,
        modifiers: [],
      };
    },
  },
  {
    id: 'life_new_contract',
    category: 'player_life',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => p.trait === 'Loyal' && p.seasonsAtClub >= 3 && !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} signed a new long-term contract. Market value +15%.`,
        modifiers: [],
      };
    },
  },
  {
    id: 'life_social_media',
    category: 'player_life',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx, rng) => {
      const club = getPlayerClub(ctx.clubs, ctx.playerClubId);
      if (!club) return null;
      const player = getRandomPlayer(rng, club.roster, (p) => !p.isTemporary);
      if (!player) return null;
      return {
        description: `${player.name} featured in a high-profile social media controversy.`,
        modifiers: [makeModifier(`life-social-${ctx.phase}`, `${player.name} controversy`, { MEN: -2 }, nextPhase(ctx.phase), player.id, ctx.playerClubId)],
      };
    },
  },
];

// ─── Weather/Scheduling Events ───

const WEATHER_EVENTS: EventTemplate[] = [
  {
    id: 'weather_congestion',
    category: 'weather',
    condition: (ctx) => ctx.phase === 'december' || ctx.phase === 'april',
    generate: () => ({
      description: 'Brutal fixture congestion this month. Players are being pushed to the limit.',
      modifiers: [],
      // Injury chance increase is handled by caller
    }),
  },
  {
    id: 'weather_winter_pitches',
    category: 'weather',
    condition: (ctx) => ctx.phase === 'december' || ctx.phase === 'january',
    generate: (ctx) => ({
      description: 'Winter pitches taking their toll. Technical play suffers.',
      modifiers: [makeModifier(`weather-winter-${ctx.phase}`, 'Winter pitches', { SKL: -1, MOV: -1 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'weather_spring',
    category: 'weather',
    condition: (ctx) => ctx.phase === 'april' || ctx.phase === 'may',
    generate: (ctx) => ({
      description: 'Spring sunshine and firm pitches. Conditions favor technical football.',
      modifiers: [makeModifier(`weather-spring-${ctx.phase}`, 'Spring pitches', { MOV: 1, SKL: 1 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'weather_heavy_rain',
    category: 'weather',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: (ctx) => ({
      description: 'Heavy rain forecasted across all fixtures this month. Physical play favored.',
      modifiers: [makeModifier(`weather-rain-${ctx.phase}`, 'Heavy rain', { SKL: -2, PWR: 1, TSS_UNDERDOG: 1 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'weather_international_break',
    category: 'weather',
    condition: (ctx) => ctx.phase === 'october' || ctx.phase === 'march',
    generate: (ctx) => ({
      description: 'International break disrupts momentum. Returning players need to readjust.',
      modifiers: [makeModifier(`weather-intl-${ctx.phase}`, 'International break', { FORM: -1 }, nextPhase(ctx.phase), undefined, ctx.playerClubId)],
    }),
  },
  {
    id: 'weather_midweek_fixtures',
    category: 'weather',
    condition: (ctx) => isMonthlyPhase(ctx.phase),
    generate: () => ({
      description: 'Midweek fixtures added due to cup rescheduling. Increased injury risk.',
      modifiers: [],
      // +3% injury chance handled by caller
    }),
  },
];

// ─── All Event Pools ───

const ALL_EVENTS: EventTemplate[] = [
  ...FORM_EVENTS,
  ...SQUAD_EVENTS,
  ...TRANSFER_EVENTS,
  ...SEASON_NARRATIVE_EVENTS,
  ...MANAGERIAL_EVENTS,
  ...PLAYER_LIFE_EVENTS,
  ...WEATHER_EVENTS,
];

// ─── Event Frequency Targets ───

interface FrequencyTarget {
  category: EventCategory;
  min: number;
  max: number;
}

const MONTHLY_FREQUENCIES: FrequencyTarget[] = [
  { category: 'form', min: 3, max: 5 },
  { category: 'squad', min: 1, max: 2 },
  { category: 'weather', min: 0, max: 1 },
];

const TRANSFER_FREQUENCIES: FrequencyTarget[] = [
  { category: 'transfer_window', min: 2, max: 3 },
];


// ─── Core Event Generation ───

function pickEvents(
  rng: SeededRNG,
  pool: EventTemplate[],
  category: EventCategory,
  target: FrequencyTarget,
  ctx: EventContext,
): GeneratedEvent[] {
  const eligible = pool.filter((e) => e.category === category && e.condition(ctx));
  if (eligible.length === 0) return [];

  const count = rng.randomInt(target.min, target.max);
  const results: GeneratedEvent[] = [];
  const usedIds = new Set<string>();

  // Max 2 of same event per season
  for (let attempt = 0; attempt < count * 3 && results.length < count; attempt++) {
    const template = eligible[rng.randomInt(0, eligible.length - 1)];
    if (usedIds.has(template.id)) continue;

    const seasonCount = ctx.firedThisSeason.get(template.id) || 0;
    if (seasonCount >= 2) continue;

    const event = template.generate(ctx, rng);
    if (event) {
      results.push(event);
      usedIds.add(template.id);
      ctx.firedThisSeason.set(template.id, seasonCount + 1);
    }
  }

  return results;
}

export interface EventBatchResult {
  events: SeasonEvent[];
  modifiers: ActiveModifier[];
  budgetDeltas: { clubId: string; delta: number }[];
  newPlayers: { clubId: string; player: Player }[];
  reputationDelta: number;
}

/**
 * Generate events for a monthly phase.
 */
export function generateMonthlyEvents(
  rng: SeededRNG,
  ctx: EventContext,
): EventBatchResult {
  const result: EventBatchResult = {
    events: [],
    modifiers: [],
    budgetDeltas: [],
    newPlayers: [],
    reputationDelta: 0,
  };

  let eventIndex = 0;

  for (const freq of MONTHLY_FREQUENCIES) {
    const generated = pickEvents(rng, ALL_EVENTS, freq.category, freq, ctx);
    for (const gen of generated) {
      const eventType = gen.modifiers.length > 0 ? 'modifier' : 'narrative';
      result.events.push({
        id: `${ctx.phase}-${freq.category}-${eventIndex++}`,
        month: ctx.phase,
        description: gen.description,
        type: eventType as SeasonEvent['type'],
        category: freq.category,
      });
      result.modifiers.push(...gen.modifiers);
      if (gen.budgetDelta) {
        result.budgetDeltas.push({ clubId: ctx.playerClubId, delta: gen.budgetDelta });
      }
      if (gen.newPlayer) {
        result.newPlayers.push({ clubId: ctx.playerClubId, player: gen.newPlayer });
      }
      if (gen.reputationDelta) {
        result.reputationDelta += gen.reputationDelta;
      }
    }
  }

  // Player life events — 1-3 per season, we fire them probabilistically each month
  // ~20% chance per month to fire one (10 months × 20% ≈ 2 per season)
  if (rng.random() < 0.20) {
    const lifeGen = pickEvents(rng, ALL_EVENTS, 'player_life', { category: 'player_life', min: 1, max: 1 }, ctx);
    for (const gen of lifeGen) {
      result.events.push({
        id: `${ctx.phase}-player_life-${eventIndex++}`,
        month: ctx.phase,
        description: gen.description,
        type: gen.modifiers.length > 0 ? 'modifier' : 'narrative',
        category: 'player_life',
      });
      result.modifiers.push(...gen.modifiers);
      if (gen.reputationDelta) result.reputationDelta += gen.reputationDelta;
    }
  }

  // Managerial events — 0-2 per season, ~15% chance per month
  if (rng.random() < 0.15) {
    const mgrGen = pickEvents(rng, ALL_EVENTS, 'managerial', { category: 'managerial', min: 1, max: 1 }, ctx);
    for (const gen of mgrGen) {
      result.events.push({
        id: `${ctx.phase}-managerial-${eventIndex++}`,
        month: ctx.phase,
        description: gen.description,
        type: gen.modifiers.length > 0 ? 'modifier' : 'narrative',
        category: 'managerial',
      });
      result.modifiers.push(...gen.modifiers);
      if (gen.reputationDelta) result.reputationDelta += gen.reputationDelta;
    }
  }

  // Season narrative events in specific months
  if (['august', 'september', 'october', 'november'].includes(ctx.phase)) {
    // ~50% chance to fire a season narrative event in these early months
    if (rng.random() < 0.50) {
      const narGen = pickEvents(rng, ALL_EVENTS, 'season_narrative', { category: 'season_narrative', min: 1, max: 1 }, ctx);
      for (const gen of narGen) {
        result.events.push({
          id: `${ctx.phase}-season_narrative-${eventIndex++}`,
          month: ctx.phase,
          description: gen.description,
          type: gen.modifiers.length > 0 ? 'modifier' : 'narrative',
          category: 'season_narrative',
        });
        result.modifiers.push(...gen.modifiers);
        if (gen.budgetDelta) result.budgetDeltas.push({ clubId: ctx.playerClubId, delta: gen.budgetDelta });
        if (gen.reputationDelta) result.reputationDelta += gen.reputationDelta;
      }
    }
  }

  return result;
}

/**
 * Generate events for a transfer window phase.
 */
export function generateTransferWindowEvents(
  rng: SeededRNG,
  ctx: EventContext,
): EventBatchResult {
  const result: EventBatchResult = {
    events: [],
    modifiers: [],
    budgetDeltas: [],
    newPlayers: [],
    reputationDelta: 0,
  };

  let eventIndex = 0;

  for (const freq of TRANSFER_FREQUENCIES) {
    const generated = pickEvents(rng, ALL_EVENTS, freq.category, freq, ctx);
    for (const gen of generated) {
      result.events.push({
        id: `${ctx.phase}-${freq.category}-${eventIndex++}`,
        month: ctx.phase,
        description: gen.description,
        type: 'transfer',
        category: freq.category,
      });
      result.modifiers.push(...gen.modifiers);
      if (gen.budgetDelta) {
        result.budgetDeltas.push({ clubId: ctx.playerClubId, delta: gen.budgetDelta });
      }
      if (gen.newPlayer) {
        result.newPlayers.push({ clubId: ctx.playerClubId, player: gen.newPlayer });
      }
    }
  }

  return result;
}

/**
 * Get extra injury chance modifier from active weather events.
 */
export function getInjuryChanceModifier(events: SeasonEvent[]): number {
  let extra = 0;
  for (const event of events) {
    if (event.description.includes('fixture congestion')) extra += 0.02;
    if (event.description.includes('Midweek fixtures')) extra += 0.03;
  }
  return extra;
}
