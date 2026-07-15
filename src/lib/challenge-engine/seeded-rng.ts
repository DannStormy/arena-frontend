/**
 * Deterministic seeded PRNG (xmur3 hash seed -> mulberry32 stream).
 *
 * Ported verbatim from arena-api (src/challenges/util/seeded-rng.ts). The same
 * seed string always yields the same sequence, so the client can regenerate AND
 * validate a challenge from (matchSeed, index) without storing the answer — the
 * spine of offline play. Must stay byte-for-byte behaviourally identical to the
 * server so a set generated here scores the same way there would (self-consistent
 * offline; the two never share a seed).
 *
 * NOTE: deliberately NOT Math.random() — that would be non-reproducible.
 */
export class SeededRng {
  private state: number;

  constructor(seed: string) {
    this.state = SeededRng.xmur3(seed);
  }

  /** Hash a string into a 32-bit seed (xmur3). */
  private static xmur3(str: string): number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /** Next float in [0, 1) (mulberry32). */
  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  /** Deterministically pick one element. */
  pick<T>(items: readonly T[]): T {
    return items[this.nextInt(0, items.length - 1)];
  }
}
