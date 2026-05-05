/**
 * Mappings from game entity IDs/names to asset file paths in /public.
 */

/** Maps club IDs to their logo filenames in /public/Premier League Clubs Logos/ */
export const CLUB_LOGOS: Record<string, string> = {
  'man-city': 'mancity.png',
  'arsenal': 'Arsenal.png',
  'liverpool': 'liverpool.png',
  'chelsea': 'chelsea.png',
  'man-utd': 'manutd.png',
  'tottenham': 'spurs.png',
  'newcastle': 'Newcastle.png',
  'aston-villa': 'astonvilla.png',
  'brighton': 'brighton.png',
  'west-ham': 'westham.png',
  'fulham': 'fulham.png',
  'brentford': 'brentford.png',
  'bournemouth': 'bournemouth.png',
  'crystal-palace': 'palace.png',
  'wolves': 'wolves.png',
  'nottm-forest': 'forest.png',
  'everton': 'everton.png',
  'leicester': 'leeds.png',
  'ipswich': 'sunderland.png',
  'southampton': 'burnley.png',
};

export function getClubLogoUrl(clubId: string): string {
  const filename = CLUB_LOGOS[clubId];
  if (!filename) return '';
  return `/Premier League Clubs Logos/${filename}`;
}

/**
 * Maps nationality strings (as used in player/manager data) to
 * ISO 3166-1 alpha-2 flag file codes in /public/national flags/.
 * UK home nations use the extended codes (gb-eng, gb-sct, gb-wls, gb-nir).
 */
export const NATIONALITY_FLAG_CODES: Record<string, string> = {
  english: 'gb-eng',
  scottish: 'gb-sct',
  welsh: 'gb-wls',
  'northern-irish': 'gb-nir',
  irish: 'ie',
  french: 'fr',
  brazilian: 'br',
  spanish: 'es',
  portuguese: 'pt',
  dutch: 'nl',
  german: 'de',
  argentinian: 'ar',
  argentine: 'ar',
  belgian: 'be',
  norwegian: 'no',
  danish: 'dk',
  italian: 'it',
  japanese: 'jp',
  korean: 'kr',
  'south-korean': 'kr',
  nigerian: 'ng',
  ghanaian: 'gh',
  ivorian: 'ci',
  senegalese: 'sn',
  cameroonian: 'cm',
  colombian: 'co',
  mexican: 'mx',
  uruguayan: 'uy',
  swedish: 'se',
  swiss: 'ch',
  austrian: 'at',
  croatian: 'hr',
  serbian: 'rs',
  polish: 'pl',
  turkish: 'tr',
  american: 'us',
  egyptian: 'eg',
  hungarian: 'hu',
  czech: 'cz',
  moroccan: 'ma',
  jamaican: 'jm',
  paraguayan: 'py',
  ecuadorian: 'ec',
  ukrainian: 'ua',
  malian: 'ml',
  zambian: 'zm',
  finnish: 'fi',
  greek: 'gr',
  australian: 'au',
  canadian: 'ca',
  chilean: 'cl',
  'south-african': 'za',
};

export function getNationalityFlagUrl(nationality: string): string {
  // Normalize: lowercase and replace whitespace with hyphens so "South Korean" matches "south-korean".
  const key = nationality.toLowerCase().trim().replace(/\s+/g, '-');
  const code = NATIONALITY_FLAG_CODES[key];
  if (!code) return '';
  return `/national flags/${code}.webp`;
}

export function getNationalityLabel(nationality: string): string {
  return nationality.charAt(0).toUpperCase() + nationality.slice(1).replace(/-/g, ' ');
}

/**
 * Maps in-game nationality strings to the national team logo files in
 * /public/National team logos/. Falls back to the country flag when no
 * matching team logo exists (see getNationalityFlagUrl).
 */
export const NATIONALITY_TEAM_LOGOS: Record<string, string> = {
  argentinian: 'argentina_argentina-national-team.football-logos.cc.svg',
  belgian: 'belgium_belgium-national-team.football-logos.cc.svg',
  brazilian: 'brazil_brazil-national-team.football-logos.cc.svg',
  colombian: 'colombia_colombia-national-team.football-logos.cc.svg',
  danish: 'denmark_denmark-national-team.football-logos.cc.svg',
  dutch: 'netherlands_dutch-national-team.football-logos.cc.svg',
  ecuadorian: 'ecuador_ecuador-national-team.football-logos.cc.svg',
  egyptian: 'egypt_egypt-national-team.football-logos.cc.svg',
  english: 'england_england-national-team.football-logos.cc.svg',
  finnish: 'finland_finland-national-team.football-logos.cc.svg',
  french: 'france_france-national-team.football-logos.cc.svg',
  german: 'germany_germany-national-team.football-logos.cc.svg',
  ghanaian: 'ghana_ghana-national-team.football-logos.cc.svg',
  greek: 'greece_greece-national-team.football-logos.cc.svg',
  hungarian: 'hungary_hungary-national-team.football-logos.cc.svg',
  italian: 'italy_italy-national-team.football-logos.cc.svg',
  ivorian: 'cote-d-ivoire_cote-d-ivoire-national-team.football-logos.cc.svg',
  jamaican: 'jamaica_jamaica-national-team.football-logos.cc.svg',
  japanese: 'japan_japan-national-team.football-logos.cc.svg',
  malian: 'mali_mali-national-team.football-logos.cc.svg',
  portuguese: 'portugal_portuguese-football-federation.football-logos.cc.svg',
  scottish: 'scotland_scotland-national-team.football-logos.cc.svg',
  spanish: 'spain_spain-national-team.football-logos.cc.svg',
  turkish: 'turkey_turkey-national-team.football-logos.cc.svg',
};

export function getNationalTeamLogoUrl(nationality: string): string | null {
  const key = nationality.toLowerCase().trim().replace(/\s+/g, '-');
  const fn = NATIONALITY_TEAM_LOGOS[key];
  if (!fn) return null;
  return `/National team logos/${fn}`;
}
