import type { Player } from '@/types/entities';

// Effect tier drives which overlay layers an InteractiveCard renders on top of
// a player card. The thresholds mirror the visual tiers already used by
// RetroPlayerCard so the gesture wrapper and the static card art agree.
//
//   sheen   — bronze / silver / base (default, every card)
//   holo    — gold (80–84) and future-stars (u21, 75–81)
//   cosmic  — 85+, icons (90+), legends (8+ trophies), starboys (u21, 82+)
export type CardEffectTier = 'sheen' | 'holo' | 'cosmic';

function isStarboy(player: Player): boolean {
  return player.age <= 21 && player.overall >= 82;
}

function isFutureStar(player: Player): boolean {
  return player.age <= 21 && player.overall >= 75 && player.overall < 82;
}

function isLegend(player: Player): boolean {
  return (player.trophiesWon?.length ?? 0) >= 8;
}

export function getCardEffectTier(player: Player): CardEffectTier {
  if (player.overall >= 85 || isLegend(player) || isStarboy(player)) {
    return 'cosmic';
  }
  if (player.overall >= 80 || isFutureStar(player)) {
    return 'holo';
  }
  return 'sheen';
}
