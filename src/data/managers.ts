/**
 * Real EPL manager names mapped to club IDs.
 * Used for the Manager of the Year award and other narrative elements.
 */
export const CLUB_MANAGERS: Record<string, string> = {
  'man-city': 'Pep Guardiola',
  'arsenal': 'Mikel Arteta',
  'liverpool': 'Arne Slot',
  'chelsea': 'Enzo Maresca',
  'man-utd': 'Ruben Amorim',
  'tottenham': 'Ange Postecoglou',
  'newcastle': 'Eddie Howe',
  'aston-villa': 'Unai Emery',
  'brighton': 'Fabian Hürzeler',
  'west-ham': 'Julen Lopetegui',
  'fulham': 'Marco Silva',
  'brentford': 'Thomas Frank',
  'bournemouth': 'Andoni Iraola',
  'crystal-palace': 'Oliver Glasner',
  'wolves': 'Vítor Pereira',
  'nottm-forest': 'Nuno Espírito Santo',
  'everton': 'Sean Dyche',
  'leicester': 'Daniel Farke',
  'ipswich': 'Régis Le Bris',
  'southampton': 'Scott Parker',
};

/**
 * Expected finishing position by tier, used for overperformance calculations.
 * These are the midpoint positions for each tier's typical range.
 */
export const TIER_EXPECTED_POSITION: Record<number, number> = {
  1: 2.5,   // Tier 1: expected ~1st–4th
  2: 6.25,  // Tier 2: expected ~5th–8th (4 clubs)
  3: 10,    // Tier 3: expected ~9th–11th
  4: 14.5,  // Tier 4: expected ~12th–17th (6 clubs)
  5: 18.5,  // Tier 5: expected ~18th–20th
};
