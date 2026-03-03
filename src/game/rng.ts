// ═══════════════════════════════════════════════
// SEEDED RNG — Mulberry32
// ═══════════════════════════════════════════════

export type Rng = () => number;

/** Create a seeded PRNG (Mulberry32). Returns float in [0, 1). */
export function createRng(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random integer in [min, max] inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Random float in [min, max]. */
export function randFloat(rng: Rng, min: number, max: number): number {
  return rng() * (max - min) + min;
}

/** Pick a random element from an array. */
export function randPick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Shuffle an array in place (Fisher-Yates). */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Generate a random seed from Math.random. */
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
