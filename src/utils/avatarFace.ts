import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

const playerCache = new Map<string, string>();
const managerCache = new Map<string, string>();

// Hairstyles only — no headwear (pro-headshot look). theCaesar covers
// the "rare shaved head" case without going fully bald.
const PLAYER_TOPS = [
  'shortCurly',
  'shortFlat',
  'shortRound',
  'shortWaved',
  'sides',
  'theCaesar',
  'theCaesarAndSidePart',
  'dreads01',
  'dreads02',
  'frizzle',
] as const;

const PLAYER_FACIAL_HAIR = [
  'beardLight',
  'beardMedium',
  'beardMajestic',
  'moustacheFancy',
] as const;

const PLAYER_CLOTHES = [
  'shirtCrewNeck',
  'shirtScoopNeck',
  'shirtVNeck',
  'hoodie',
  'collarAndSweater',
] as const;

// Composed/neutral expressions — pro-headshot vibe with a touch of
// personality, not goofy.
const PLAYER_EYES = ['default', 'happy', 'side', 'wink'] as const;
const PLAYER_EYEBROWS = [
  'default',
  'defaultNatural',
  'flatNatural',
  'raisedExcited',
  'upDown',
] as const;
const PLAYER_MOUTH = ['default', 'serious', 'smile', 'twinkle'] as const;

// ─── Hair color palettes ───
// Default hair colors — naturally varied browns/blondes/reds, no greying.
const HAIR_NATURAL = [
  '2c1b18', // near-black
  '4a312c', // dark brown
  '724133', // chestnut
  'a55728', // auburn
  'b58143', // honey blonde
  'c93305', // bright red
  'd6b370', // wheat blonde
  'e8e1e1', // platinum
];
// Dark-only — for nationality buckets where blonde/red is implausible.
const HAIR_DARK = ['2c1b18', '4a312c', '724133'];
// Colorful streetwear hair — only ever shown to a small slice of <26s.
const HAIR_COLORFUL = ['ecdcbf', 'f59797', 'b25b3b', 'b58143', 'c93305'];
const HAIR_PASTEL = ['F59797']; // pastel pink — keep rare

// ─── Skin tones ───
// avataaars built-in skin colors: 'tanned', 'yellow', 'pale', 'light',
// 'brown', 'darkBrown', 'black'
const SKIN_FULL_RANGE = ['pale', 'light', 'tanned', 'brown', 'darkBrown', 'black'];
const SKIN_LATIN = ['light', 'tanned', 'brown', 'darkBrown'];
const SKIN_AFRICAN = ['brown', 'darkBrown', 'black'];
const SKIN_EAST_ASIAN = ['yellow', 'pale', 'light'];
const SKIN_MENA = ['light', 'tanned', 'brown'];
const SKIN_DEFAULT = ['pale', 'light', 'tanned', 'brown'];

interface NationalityBucket {
  skin: string[];
  hair: string[];
}

// Broad regional buckets. Diversity within nations is preserved (most
// buckets allow several skin tones); buckets exclude implausible
// combinations (e.g. no white Nigerian).
const BUCKET_DIVERSE_ANGLO: NationalityBucket = { skin: SKIN_FULL_RANGE, hair: HAIR_NATURAL };
const BUCKET_LATIN: NationalityBucket = { skin: SKIN_LATIN, hair: HAIR_DARK.concat(['a55728', 'b58143']) };
const BUCKET_AFRICAN: NationalityBucket = { skin: SKIN_AFRICAN, hair: HAIR_DARK };
const BUCKET_EAST_ASIAN: NationalityBucket = { skin: SKIN_EAST_ASIAN, hair: HAIR_DARK };
const BUCKET_MENA: NationalityBucket = { skin: SKIN_MENA, hair: HAIR_DARK };
const BUCKET_DEFAULT: NationalityBucket = { skin: SKIN_DEFAULT, hair: HAIR_NATURAL };

const NATIONALITY_BUCKETS: Record<string, NationalityBucket> = {
  // Diverse Anglo / Northern European societies — full skin-tone range
  english: BUCKET_DIVERSE_ANGLO,
  scottish: BUCKET_DIVERSE_ANGLO,
  welsh: BUCKET_DIVERSE_ANGLO,
  irish: BUCKET_DIVERSE_ANGLO,
  french: BUCKET_DIVERSE_ANGLO,
  dutch: BUCKET_DIVERSE_ANGLO,
  belgian: BUCKET_DIVERSE_ANGLO,
  german: BUCKET_DIVERSE_ANGLO,
  swiss: BUCKET_DIVERSE_ANGLO,
  swedish: BUCKET_DIVERSE_ANGLO,
  norwegian: BUCKET_DIVERSE_ANGLO,
  danish: BUCKET_DIVERSE_ANGLO,
  finnish: BUCKET_DIVERSE_ANGLO,
  american: BUCKET_DIVERSE_ANGLO,
  ukrainian: BUCKET_DIVERSE_ANGLO,
  czech: BUCKET_DIVERSE_ANGLO,
  hungarian: BUCKET_DIVERSE_ANGLO,
  serbian: BUCKET_DIVERSE_ANGLO,
  croatian: BUCKET_DIVERSE_ANGLO,

  // Latin / Mediterranean
  brazilian: BUCKET_LATIN,
  argentinian: BUCKET_LATIN,
  mexican: BUCKET_LATIN,
  colombian: BUCKET_LATIN,
  uruguayan: BUCKET_LATIN,
  paraguayan: BUCKET_LATIN,
  ecuadorian: BUCKET_LATIN,
  italian: BUCKET_LATIN,
  spanish: BUCKET_LATIN,
  portuguese: BUCKET_LATIN,
  greek: BUCKET_LATIN,
  turkish: BUCKET_LATIN,

  // Sub-Saharan African / Caribbean — dark skin, dark hair only
  nigerian: BUCKET_AFRICAN,
  ghanaian: BUCKET_AFRICAN,
  ivorian: BUCKET_AFRICAN,
  malian: BUCKET_AFRICAN,
  senegalese: BUCKET_AFRICAN,
  zambian: BUCKET_AFRICAN,
  jamaican: BUCKET_AFRICAN,

  // East Asian
  japanese: BUCKET_EAST_ASIAN,
  south_korean: BUCKET_EAST_ASIAN,
  'south-korean': BUCKET_EAST_ASIAN,

  // North African / Middle Eastern
  egyptian: BUCKET_MENA,
  moroccan: BUCKET_MENA,
};

function getBucket(nationality?: string): NationalityBucket {
  if (!nationality) return BUCKET_DEFAULT;
  return NATIONALITY_BUCKETS[nationality.toLowerCase()] ?? BUCKET_DEFAULT;
}

// Cheap deterministic hash for picking a bool/index from a seed without
// pulling in the full RNG (this stays a pure render-time helper).
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Facial hair gets more likely with age. Young pros mostly clean-shaven;
// veterans mostly bearded.
function facialHairProbabilityForAge(age?: number): number {
  if (age == null) return 35;
  if (age <= 21) return 10;
  if (age <= 25) return 25;
  if (age <= 30) return 50;
  return 75;
}

// Under-26s rarely get streetwear/colorful hair — ~12% land in the
// colorful bucket, with pastel pink as a sub-bucket within that.
function pickHairColors(age: number | undefined, bucket: NationalityBucket, seed: string): string[] {
  const isYoung = age != null && age < 26;
  if (!isYoung) return bucket.hair;
  // Only nationality buckets that allow varied hair (i.e. not the
  // dark-only buckets) can land in the colorful pool.
  if (bucket.hair === HAIR_DARK) return bucket.hair;
  const r = hashSeed(`${seed}|colorful`) % 100;
  if (r < 3) return HAIR_PASTEL;
  if (r < 12) return HAIR_COLORFUL;
  return bucket.hair;
}

function stripHash(hex?: string): string | undefined {
  if (!hex) return undefined;
  return hex.startsWith('#') ? hex.slice(1) : hex;
}

interface PlayerFaceOpts {
  shirtColor?: string;
  age?: number;
  nationality?: string;
}

export function getPlayerFaceUri(seed: string, opts: PlayerFaceOpts = {}): string {
  const { shirtColor, age, nationality } = opts;
  const colorKey = stripHash(shirtColor) ?? '';
  const cacheKey = `${seed}|${colorKey}|${age ?? ''}|${nationality ?? ''}`;
  const cached = playerCache.get(cacheKey);
  if (cached) return cached;

  const bucket = getBucket(nationality);
  const hairColors = pickHairColors(age, bucket, seed);

  const uri = createAvatar(avataaars, {
    seed,
    backgroundColor: ['transparent'],
    top: [...PLAYER_TOPS],
    facialHair: [...PLAYER_FACIAL_HAIR],
    facialHairProbability: facialHairProbabilityForAge(age),
    hairColor: hairColors,
    skinColor: bucket.skin as never,
    clothing: [...PLAYER_CLOTHES],
    ...(colorKey ? { clothesColor: [colorKey] } : {}),
    eyes: [...PLAYER_EYES],
    eyebrows: [...PLAYER_EYEBROWS],
    mouth: [...PLAYER_MOUTH],
    accessoriesProbability: 0,
  }).toDataUri();
  playerCache.set(cacheKey, uri);
  return uri;
}

export function getManagerFaceUri(seed: string): string {
  const cached = managerCache.get(seed);
  if (cached) return cached;
  const uri = createAvatar(avataaars, {
    seed,
    backgroundColor: ['transparent'],
  }).toDataUri();
  managerCache.set(seed, uri);
  return uri;
}
