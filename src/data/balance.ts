/**
 * Central balance configuration.
 *
 * One place to tune the simulation. Engine modules read from this object
 * instead of holding their own magic numbers, so future difficulty modes
 * or rebalancing patches are one-file changes.
 *
 * Conventions:
 *   - All percentages are 0..1 unless the field name says "Pct" or "Chance%".
 *   - All TSS bonuses are in raw rating points.
 *   - All fees / values are in £M.
 */

import type { Formation, Mentality } from '@/engine/matchSim';
import type { Position } from '@/types/entities';

export const BALANCE = {
  match: {
    /** Baseline expected goals before TSS difference is applied. */
    baseGoals: 1.25,
    /** Per-team noise band added to expected goals. */
    noiseRange: 0.3,
    /** Floor on expected goals so even mismatches don't go to 0. */
    minExpectedGoals: 0.2,
    /**
     * Goal-curve coefficient. With Math.log1p(|diff|/diffScale)*coeff,
     * the curve saturates so a 50-pt gap doesn't double a 25-pt gap.
     * Tuning: at diff=10, +0.35 goals; at diff=25, +0.6; at diff=50, +0.9.
     */
    diffScale: 10,
    diffCoeff: 0.5,
    homeBonus: 3,
    derbyBonusMax: 3,
    leaderBonus: 1,
    captainBonus: 2,
    preferredFormationBonus: 1,
  },

  injury: {
    /** Per non-temp player, per month. 0.05 produced ~10 injuries/club/season
     *  (≈40% squad churn). Real PL is ~2–3% monthly; 0.035 keeps drama
     *  without making roster turnover the loudest signal of the season. */
    base: 0.035,
    fragile: 0.07,
    durable: 0.014,
    /** GKs less prone — multiplier applied after trait selection. */
    gkMultiplier: 0.25,
    /**
     * Position-aware duration weights. Each entry is [1mo, 2mo, 3mo, season].
     * Wingers / strikers pull harder muscles; GKs rarely miss long.
     */
    durationWeightsByPosition: {
      GK: [70, 25, 5, 0],
      CB: [60, 30, 9, 1],
      FB: [55, 30, 13, 2],
      MF: [55, 30, 12, 3],
      WG: [50, 30, 17, 3],
      ST: [50, 30, 17, 3],
    } satisfies Record<Position, [number, number, number, number]>,
    /** Months out for the "season-ending" bucket. */
    seasonEndingMonths: 6,
  },

  transfer: {
    willingnessBase: 50,
    /**
     * Smooth willingness premium. Was two stacked thresholds at 1.2x/1.5x;
     * now: bonus = clamp(premium * curve, 0, max).
     * At 20% premium → +18, at 50% → +45, capped at premiumCapBonus.
     */
    premiumCurve: 90,
    premiumCapBonus: 45,
    ambitiousDownTier: -30,
    loyalPenalty: -20,
    rivalPenalty: -30,
    needsPositionPenalty: -15,
    olderPlayerBonus: 15,
    /** Listed players: seller is motivated. */
    listedBoost: 15,
    /** Final willingness clamp. */
    maxWillingness: 95,
    rejectThreshold: 20,
    /** Counter-offer multiplier on market value. */
    counterMultiplier: 1.3,
    refusalBase: 10,
    refusalDownTier: 20,
    refusalLoyal: 15,
    /**
     * Continent-sale chance per eligible aging+low-rated player per window.
     * Was 0.30 — too low; veterans hoarded forever in mid-table.
     */
    continentSaleChance: 0.50,
    /** Discount on continent sale (paid to seller). */
    continentSalePriceMult: 0.70,
  },

  reputation: {
    /**
     * Match TSS bonus = clamp(reputation / divisor, 0, max).
     * Was /33 capped at 3 — barely a goal across a season.
     * Now: 100 rep ≈ +5.9 TSS; meaningful, never decisive.
     */
    matchBonusDivisor: 17,
    matchBonusMax: 6,
  },

  aging: {
    earlyPeakerStallRange: [-1, 0] as const,
    earlyPeakerDeclineRange: [-4, -1] as const,
    /** Trait nudges to the bracket's stat-change range. */
    traitDeclineMod: { Durable: 2, Fragile: -1 } as const,
  },

  /** Formation balance — slightly steepen 4-3-3 / 3-4-3 cost. */
  formationModifiers: {
    '4-4-2': { atk: 0, def: 0 },
    '4-3-3': { atk: 3, def: -2 },
    '3-5-2': { atk: 1, def: 2 },
    '4-2-3-1': { atk: 2, def: 1 },
    '5-3-2': { atk: -1, def: 4 },
    '3-4-3': { atk: 4, def: -3 },
  } satisfies Record<Formation, { atk: number; def: number }>,

  mentalityModifiers: {
    defensive: { atk: -3, def: 4 },
    balanced: { atk: 0, def: 0 },
    attacking: { atk: 4, def: -3 },
  } satisfies Record<Mentality, { atk: number; def: number }>,
} as const;

export type Balance = typeof BALANCE;
