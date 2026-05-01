import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

const playerCache = new Map<string, string>();
const managerCache = new Map<string, string>();

// Hairstyles only — no headwear (pro-headshot look). theCaesar covers
// the "rare shaved head" case without going fully bald. `sides` is
// excluded because it renders as a bald top with hair only on the sides.
// Dreads and fro variants are restricted to darker skin tones below.
const SHORT_TOPS_UNIVERSAL = [
  'shortCurly',
  'shortFlat',
  'shortRound',
  'shortWaved',
  'theCaesar',
  'theCaesarAndSidePart',
  'frizzle',
  'shaggyMullet',
] as const;

// Dreads / fro pool — only shown to darker-skinned players, and only on a
// ~10% roll so it stays a distinctive look rather than the default.
const DARK_DREADS_FRO_POOL = ['dreads01', 'dreads02', 'dreads', 'fro'] as const;

// For dark-brown / black skin players, lean heavily toward theCaesar cuts
// or dreads/fro rather than the random short-hair pool.
const VERY_DARK_PRIMARY_POOL = [
  'theCaesar',
  'theCaesarAndSidePart',
  'dreads01',
  'dreads02',
  'dreads',
  'fro',
] as const;

// Facial hair is weighted: clean light/medium beards and the magnum
// moustache dominate; the majestic beard and fancy moustache are rare.
const FACIAL_HAIR_OPTIONS = [
  'beardLight',
  'beardMedium',
  'moustacheMagnum',
  'beardMajestic',
  'moustacheFancy',
] as const;
const FACIAL_HAIR_WEIGHTS = [30, 30, 25, 8, 7];

// Crew-neck shirts only — keeps the kit-graphic clean and consistent.
const PLAYER_CLOTHES = ['shirtCrewNeck'] as const;

// Eyes are weighted: wink shows up on roughly 1 in 10 cards, not 1 in 4.
const EYES_OPTIONS = ['default', 'happy', 'side', 'wink'] as const;
const EYES_WEIGHTS = [35, 30, 25, 10];

const PLAYER_EYEBROWS = [
  'default',
  'defaultNatural',
  'flatNatural',
  'raisedExcited',
  'upDown',
  'angry',
  'angryNatural',
] as const;

// Mouth pools — neutral expressions for most players; Flair-trait players
// sometimes get the cheeky tongue.
const MOUTH_DEFAULT = ['default', 'serious', 'twinkle', 'smile'] as const;
const MOUTH_FLAIR = ['default', 'serious', 'twinkle', 'smile', 'tongue'] as const;
const MOUTH_FLAIR_WEIGHTS = [25, 22, 22, 16, 15];

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
// avataaars v9 expects hex strings (without #). Names → hex below match
// the DiceBear preset palette so portraits read consistently.
const SKIN_PALE = 'ffdbb4';
const SKIN_LIGHT = 'edb98a';
const SKIN_TANNED = 'fd9841';
const SKIN_YELLOW = 'f8d25c';
const SKIN_BROWN = 'd08b5b';
const SKIN_DARK_BROWN = 'ae5d29';
const SKIN_BLACK = '614335';

const SKIN_FULL_RANGE = [SKIN_PALE, SKIN_LIGHT, SKIN_TANNED, SKIN_BROWN, SKIN_DARK_BROWN, SKIN_BLACK];
const SKIN_LATIN = [SKIN_LIGHT, SKIN_TANNED, SKIN_BROWN, SKIN_DARK_BROWN];
const SKIN_AFRICAN = [SKIN_BROWN, SKIN_DARK_BROWN, SKIN_BLACK];
const SKIN_EAST_ASIAN = [SKIN_YELLOW, SKIN_PALE, SKIN_LIGHT];
const SKIN_MENA = [SKIN_LIGHT, SKIN_TANNED, SKIN_BROWN];
const SKIN_DEFAULT = [SKIN_PALE, SKIN_LIGHT, SKIN_TANNED, SKIN_BROWN];

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
// veterans more often bearded but not overwhelmingly so.
function facialHairProbabilityForAge(age?: number): number {
  if (age == null) return 30;
  if (age <= 21) return 10;
  if (age <= 25) return 20;
  if (age <= 30) return 45;
  return 55;
}

// Hair color palette pick. Default-bucket young players (<26) get an
// occasional colorful pop. Dark-hair buckets stay overwhelmingly
// black/dark brown but allow a small ~7% dye rate.
function pickHairPalette(age: number | undefined, bucket: NationalityBucket, seed: string): string[] {
  if (bucket.hair === HAIR_DARK) {
    const dye = hashSeed(`${seed}|dye`) % 100;
    if (dye < 2) return HAIR_PASTEL;
    if (dye < 7) return HAIR_COLORFUL;
    return bucket.hair;
  }
  const isYoung = age != null && age < 26;
  if (!isYoung) return bucket.hair;
  const r = hashSeed(`${seed}|colorful`) % 100;
  if (r < 3) return HAIR_PASTEL;
  if (r < 12) return HAIR_COLORFUL;
  return bucket.hair;
}

// Pick a single hair color from the palette, deterministically per seed.
// Locking it to one value lets us match facial-hair color to head-hair.
function pickHairColor(age: number | undefined, bucket: NationalityBucket, seed: string): string {
  const palette = pickHairPalette(age, bucket, seed);
  return palette[hashSeed(`${seed}|haircolor`) % palette.length];
}

function pickSkinTone(bucket: NationalityBucket, seed: string): string {
  return bucket.skin[hashSeed(`${seed}|skin`) % bucket.skin.length];
}

const DARK_SKIN_TONES = new Set([SKIN_BROWN, SKIN_DARK_BROWN, SKIN_BLACK]);
function isDarkSkin(tone: string): boolean {
  return DARK_SKIN_TONES.has(tone);
}
const VERY_DARK_SKIN_TONES = new Set([SKIN_DARK_BROWN, SKIN_BLACK]);
function isVeryDarkSkin(tone: string): boolean {
  return VERY_DARK_SKIN_TONES.has(tone);
}

function weightedPickFromSeed<T extends string>(
  items: readonly T[],
  weights: readonly number[],
  seed: string,
): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = hashSeed(seed) % total;
  for (let i = 0; i < items.length; i++) {
    if (r < weights[i]) return items[i];
    r -= weights[i];
  }
  return items[items.length - 1];
}

function stripHash(hex?: string): string | undefined {
  if (!hex) return undefined;
  return hex.startsWith('#') ? hex.slice(1) : hex;
}

interface PlayerFaceOpts {
  shirtColor?: string;
  age?: number;
  nationality?: string;
  trait?: string;
}

export function getPlayerFaceUri(seed: string, opts: PlayerFaceOpts = {}): string {
  const { shirtColor, age, nationality, trait } = opts;
  const colorKey = stripHash(shirtColor) ?? '';
  const cacheKey = `${seed}|${colorKey}|${age ?? ''}|${nationality ?? ''}|${trait ?? ''}`;
  const cached = playerCache.get(cacheKey);
  if (cached) return cached;

  const bucket = getBucket(nationality);
  const skinTone = pickSkinTone(bucket, seed);
  const dark = isDarkSkin(skinTone);
  const veryDark = isVeryDarkSkin(skinTone);
  const hairColor = pickHairColor(age, bucket, seed);

  // Top selection: dark-brown / black players strongly favour theCaesar cuts
  // or dreads/fro (~85%); brown skin players get the dreads/fro pool on a
  // ~20% roll; everyone else lands in the universal short pool.
  const dreadsRoll = hashSeed(`${seed}|dreads`) % 100;
  let tops: readonly string[];
  if (veryDark && dreadsRoll < 85) {
    tops = VERY_DARK_PRIMARY_POOL;
  } else if (dark && !veryDark && dreadsRoll < 20) {
    tops = DARK_DREADS_FRO_POOL;
  } else {
    tops = SHORT_TOPS_UNIVERSAL;
  }

  const facialHair = weightedPickFromSeed(FACIAL_HAIR_OPTIONS, FACIAL_HAIR_WEIGHTS, `${seed}|fh`);
  const eyes = weightedPickFromSeed(EYES_OPTIONS, EYES_WEIGHTS, `${seed}|eye`);
  const mouth = trait === 'Flair'
    ? weightedPickFromSeed(MOUTH_FLAIR, MOUTH_FLAIR_WEIGHTS, `${seed}|mouth`)
    : MOUTH_DEFAULT[hashSeed(`${seed}|mouth`) % MOUTH_DEFAULT.length];

  const uri = createAvatar(avataaars, {
    seed,
    backgroundColor: ['transparent'],
    top: [...tops],
    facialHair: [facialHair],
    facialHairProbability: facialHairProbabilityForAge(age),
    hairColor: [hairColor],
    facialHairColor: [hairColor],
    skinColor: [skinTone],
    clothing: [...PLAYER_CLOTHES],
    ...(colorKey ? { clothesColor: [colorKey] } : {}),
    eyes: [eyes],
    eyebrows: [...PLAYER_EYEBROWS],
    mouth: [mouth],
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
