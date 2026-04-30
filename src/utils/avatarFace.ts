import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

const playerCache = new Map<string, string>();
const managerCache = new Map<string, string>();

const PLAYER_BG = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

// Male-skewing hairstyles. Excludes long-hair/hijab/floppy-hat/etc. so the
// player pool reads as young male footballers. Names match DiceBear v9
// avataaars schema.
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
  'winterHat1',
  'winterHat02',
  'winterHat03',
  'winterHat04',
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

export function getPlayerFaceUri(seed: string): string {
  const cached = playerCache.get(seed);
  if (cached) return cached;
  const uri = createAvatar(avataaars, {
    seed,
    backgroundColor: PLAYER_BG,
    radius: 50,
    top: [...PLAYER_TOPS],
    facialHair: [...PLAYER_FACIAL_HAIR],
    facialHairProbability: 35,
    hairColor: [...PLAYER_HAIR_COLOR],
    clothing: [...PLAYER_CLOTHES],
    accessoriesProbability: 8,
  }).toDataUri();
  playerCache.set(seed, uri);
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
