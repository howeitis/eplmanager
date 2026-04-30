import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

const playerCache = new Map<string, string>();
const managerCache = new Map<string, string>();

// Male-skewing hairstyles only — no headwear, since pro-headshot players
// don't pose in hats. Names match DiceBear v9 avataaars schema.
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

// Young-player hair colors — exclude silverGray/platinum (elderly) and
// pastelPink (off-brand).
const PLAYER_HAIR_COLOR = [
  '2c1b18',
  '4a312c',
  '724133',
  'a55728',
  'b58143',
  'c93305',
  'd6b370',
  'e8e1e1',
] as const;

const PLAYER_CLOTHES = [
  'shirtCrewNeck',
  'shirtScoopNeck',
  'shirtVNeck',
  'hoodie',
  'collarAndSweater',
] as const;

// Composed/neutral expressions only — like a real headshot. A few
// personality variants ('happy', 'twinkle' smile) keep it from feeling
// stiff, but no surprised/dizzy/cry/hearts/eyepatch/etc.
const PLAYER_EYES = ['default', 'happy', 'side', 'wink'] as const;
const PLAYER_EYEBROWS = [
  'default',
  'defaultNatural',
  'flatNatural',
  'raisedExcited',
  'upDown',
] as const;
const PLAYER_MOUTH = ['default', 'serious', 'smile', 'twinkle'] as const;

function stripHash(hex?: string): string | undefined {
  if (!hex) return undefined;
  return hex.startsWith('#') ? hex.slice(1) : hex;
}

export function getPlayerFaceUri(seed: string, shirtColor?: string): string {
  const colorKey = stripHash(shirtColor) ?? '';
  const cacheKey = `${seed}|${colorKey}`;
  const cached = playerCache.get(cacheKey);
  if (cached) return cached;
  const uri = createAvatar(avataaars, {
    seed,
    backgroundColor: ['transparent'],
    top: [...PLAYER_TOPS],
    facialHair: [...PLAYER_FACIAL_HAIR],
    facialHairProbability: 35,
    hairColor: [...PLAYER_HAIR_COLOR],
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
