import type { TacticCard } from '@/types/tactics';
import { getClubLogoUrl, getNationalTeamLogoUrl, getNationalityFlagUrl } from './assets';

/**
 * Phase D watermark: each tactical concept is loosely "famous from" some
 * club or national team. Used as a translucent crest behind the tactic
 * card's central glyph — a visual nod to where the idea was perfected.
 *
 * Resolution order:
 *   1. clubId  → CLUB_LOGOS (a Premier League crest if in the game)
 *   2. nationality → NATIONALITY_TEAM_LOGOS (national-team SVG crest)
 *   3. fallback → null (the card renders its glyph alone)
 *
 * Keys are matched first by `card.family` (so all silver/gold variants of
 * "press-from-front" share Liverpool's crest), then by `card.id` for
 * cards that don't have a family (Phase A shapes / tempos and a few
 * stand-alone instructions).
 */

interface CrestRef {
  clubId?: string;
  nationality?: string;
}

const FAMOUS_FROM: Record<string, CrestRef> = {
  // ─── Shape — formations made famous by specific clubs / nations ───
  'shape-4-4-2': { clubId: 'man-utd' }, // Ferguson-era PL classic
  'shape-4-3-3': { clubId: 'liverpool' }, // Klopp's Red Wave
  'shape-3-5-2': { nationality: 'italian' }, // Conte's Italy
  'shape-4-2-3-1': { clubId: 'man-city' }, // Pep's number-ten role
  'shape-5-3-2': { nationality: 'italian' }, // Catenaccio orthodox
  'shape-3-4-3': { clubId: 'chelsea' }, // Conte's title-winning Chelsea

  // ─── Tempo — mentalities by school ───
  'tempo-defensive': { nationality: 'italian' },
  'tempo-balanced': { nationality: 'spanish' },
  'tempo-attacking': { clubId: 'liverpool' },

  // ─── Bronze + tier-variant instruction families ───
  'press-from-front': { clubId: 'liverpool' },
  'compact-lines': { nationality: 'italian' },
  'win-second-balls': { clubId: 'newcastle' },
  'stay-patient': { nationality: 'spanish' },
  'quick-transitions': { clubId: 'liverpool' },
  'tempo-quickens': { clubId: 'man-city' },
  'hold-the-line': { nationality: 'italian' },
  'time-wasting': { nationality: 'italian' },
  'underdog-bite': { clubId: 'leicester' },
  'derby-day': { clubId: 'man-utd' },
  'away-days': { clubId: 'liverpool' },
  'home-comforts': { clubId: 'liverpool' },
  'cup-tied': { clubId: 'arsenal' },
  'big-game': { clubId: 'chelsea' },
  'bully-pulpit': { clubId: 'man-utd' },
  'park-the-bus': { clubId: 'chelsea' },

  // ─── Legendary signatures — pinned by name ───
  'legend-invincibles-wing-play': { clubId: 'arsenal' },
  'legend-cloughie-two-banks': { clubId: 'nottm-forest' },
  'legend-sacchi-pressing-trap': { nationality: 'italian' }, // Sacchi's Milan, but Italy NT as proxy
  'legend-total-football-74': { nationality: 'dutch' },
  'legend-survival-instinct': { nationality: 'english' },
  'legend-cup-final-march': { clubId: 'arsenal' },
  'legend-the-double': { clubId: 'man-utd' }, // 1999 treble side
  'legend-wenger-project': { clubId: 'arsenal' },
  'legend-klopp-heavy-metal': { clubId: 'liverpool' },
  'legend-pep-possession-loop': { clubId: 'man-city' },
  'legend-mourinho-park': { clubId: 'chelsea' },
  'legend-big-sams-houdini': { nationality: 'english' },
};

/**
 * Resolve a card to its watermark crest URL, or null if none is defined.
 *
 * Tries `card.family` first, then falls back to `card.id` so Phase A
 * shape/tempo cards (which don't have families) and any future custom
 * cards still resolve cleanly. National-team crests are preferred over
 * raw flags when both are available.
 */
export function getFamousFromCrestUrl(card: Pick<TacticCard, 'id' | 'family'>): string | null {
  const ref = (card.family && FAMOUS_FROM[card.family]) || FAMOUS_FROM[card.id];
  if (!ref) return null;
  if (ref.clubId) {
    const url = getClubLogoUrl(ref.clubId);
    if (url) return url;
  }
  if (ref.nationality) {
    const teamUrl = getNationalTeamLogoUrl(ref.nationality);
    if (teamUrl) return teamUrl;
    const flagUrl = getNationalityFlagUrl(ref.nationality);
    if (flagUrl) return flagUrl;
  }
  return null;
}
