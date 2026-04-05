import seedrandom from 'seedrandom';

export class SeededRNG {
  private rng: seedrandom.PRNG;

  constructor(seed: string) {
    this.rng = seedrandom(seed);
  }

  /** Returns a float in [0, 1) */
  random(): number {
    return this.rng();
  }

  /** Returns an integer in [min, max] (inclusive) */
  randomInt(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max) */
  randomFloat(min: number, max: number): number {
    return this.rng() * (max - min) + min;
  }

  /** Returns a Poisson-distributed integer with given lambda */
  poissonRandom(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.rng();
    } while (p > L);
    return k - 1;
  }

  /** Picks an item from a weighted list. weights[i] corresponds to items[i]. */
  weightedPick<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let r = this.rng() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

/** Create an RNG instance for a specific context */
export function createRNG(seed: string): SeededRNG {
  return new SeededRNG(seed);
}

/** Derive a match seed */
export function matchSeed(seasonSeed: string, fixtureId: string): string {
  return `${seasonSeed}-match-${fixtureId}`;
}

/** Derive a season seed */
export function seasonSeed(gameSeed: string, seasonNumber: number): string {
  return `${gameSeed}-season-${seasonNumber}`;
}

/** Derive a transfer seed */
export function transferSeed(seasonSeed: string, windowId: string): string {
  return `${seasonSeed}-transfer-${windowId}`;
}
