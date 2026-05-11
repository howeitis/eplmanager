/**
 * Shared tier-color palette for the cards meta.
 *
 * Both player and manager cards classify their subject into one of six tiers
 * (elite / gold / silver / bronze / base / future-star) and then read color
 * values off the same palette. Keeping both card components in lockstep here
 * avoids the drift that previously lived as duplicated helpers in
 * RetroPlayerCard.tsx and ManagerCard.tsx.
 *
 * Two classifiers live here:
 *   - cardTierFromOverall(overall, age?)         → player-card tier
 *   - cardTierFromManagerReputation(reputation)  → manager-card tier
 *
 * Both return a CardTier; color/border/gradient/foil functions all take
 * a CardTier so the call sites stay symmetric.
 *
 * Note: the 'future-star' tier (u21 + 75–79 overall) is a player-side concept
 * only. It expresses "rising silver player on a gold trajectory" and gets
 * a mixed silver-gold treatment. Manager classification never produces it.
 *
 * Don't confuse this with `tierFromReputation` in engine/clubReputation.ts,
 * which returns a 1–5 *club* tier — a separate concept.
 */

export type CardTier = 'elite' | 'gold' | 'silver' | 'bronze' | 'base' | 'future-star';

// ─── Classifiers ───

/** Player-card classifier — combines overall rating with age for the u21 mixed tier. */
export function cardTierFromOverall(overall: number, age?: number): CardTier {
  if (age !== undefined && age <= 21 && overall >= 75 && overall < 80) {
    return 'future-star';
  }
  if (overall >= 80) return 'gold';
  if (overall >= 75) return 'silver';
  if (overall >= 65) return 'bronze';
  return 'base';
}

/** Manager-card classifier — pure reputation threshold, has the extra `elite` band. */
export function cardTierFromManagerReputation(reputation: number): CardTier {
  if (reputation >= 90) return 'elite';
  if (reputation >= 85) return 'gold';
  if (reputation >= 75) return 'silver';
  if (reputation >= 65) return 'bronze';
  return 'base';
}

// ─── Color accessors ───

/** Primary accent color — used for the big OVR / REP number and trophy count. */
export function getTierAccentColor(tier: CardTier): string {
  switch (tier) {
    case 'future-star':
      return '#D4AF37'; // mixed silver-gold
    case 'elite':
    case 'gold':
      return '#FFD700';
    case 'silver':
      return '#C0C0C0';
    case 'bronze':
      return '#CD7F32';
    case 'base':
      return '#8B7355';
  }
}

export function getTierBorderColor(tier: CardTier): string {
  switch (tier) {
    case 'future-star':
      return '#B8980A';
    case 'elite':
    case 'gold':
      return '#B8860B';
    case 'silver':
      return '#808080';
    case 'bronze':
      return '#8B4513';
    case 'base':
      return '#6B5B45';
  }
}

export function getTierBgGradient(tier: CardTier): string {
  switch (tier) {
    case 'future-star':
      return 'linear-gradient(135deg, #FFF8DC 0%, #C0C0C0 25%, #FFD700 50%, #C0C0C0 75%, #FFF8DC 100%)';
    case 'elite':
    case 'gold':
      return 'linear-gradient(135deg, #FFF8DC 0%, #FFD700 30%, #FFF8DC 50%, #FFD700 70%, #FFF8DC 100%)';
    case 'silver':
      return 'linear-gradient(135deg, #F5F5F5 0%, #C0C0C0 30%, #F5F5F5 50%, #C0C0C0 70%, #F5F5F5 100%)';
    case 'bronze':
      return 'linear-gradient(135deg, #FFF3E0 0%, #CD7F32 30%, #FFF3E0 50%, #CD7F32 70%, #FFF3E0 100%)';
    case 'base':
      return 'linear-gradient(135deg, #FAF0E6 0%, #D2B48C 30%, #FAF0E6 50%, #D2B48C 70%, #FAF0E6 100%)';
  }
}

/**
 * Foil-stamped ink that complements each tier. Deeper, higher-contrast shades
 * so the stamp reads as embossed metallic on the card base color rather than
 * re-using the bright accent hue.
 */
export function getTierFoilColor(tier: CardTier): string {
  switch (tier) {
    case 'future-star':
      return '#6B5A14'; // antique champagne foil
    case 'elite':
    case 'gold':
      return '#7A5A10'; // deep antique gold foil
    case 'silver':
      return '#3F3F46'; // brushed pewter foil
    case 'bronze':
      return '#5A3418'; // burnished copper foil
    case 'base':
      return '#4A3A2E'; // dark sepia foil
  }
}

// ─── Misc color util ───

/**
 * Whether a hex color is light enough that black text reads better on it
 * than white. Used to pick name-plate text color against arbitrary club
 * primaries. Threshold is the standard YIQ luma cutoff at ~160.
 */
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}
