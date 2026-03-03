// ═══════════════════════════════════════════════
// SEEDED RNG — Mulberry32
// Deterministic pseudo-random number generator
// ═══════════════════════════════════════════════

export interface RNG {
  /** Returns a float in [0, 1) */
  next(): number;
  /** Returns an integer in [0, max) */
  nextInt(max: number): number;
  /** Pick a random element from an array */
  pick<T>(arr: T[]): T;
}

export function createRng(seed: number): RNG {
  let s = seed;

  function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(max: number): number {
    return Math.floor(next() * max);
  }

  function pick<T>(arr: T[]): T {
    return arr[nextInt(arr.length)];
  }

  return { next, nextInt, pick };
}
