/* eslint-disable no-bitwise -- The seeded generator uses uint32 mixing. */
export interface RandomSource {
  /** Returns a value in [0, 1). */
  next(): number;
}

/** A reproducible uint32 stream; no ambient Math.random use. */
export function createSeededRandom(seed: number): RandomSource {
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError('seed must be a safe integer');
  }
  let state = seed >>> 0;
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 0x100000000;
    },
  };
}

export function shuffle<T>(
  items: readonly T[],
  random: RandomSource,
): readonly T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const value = random.next();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('random source must return a value in [0, 1)');
    }
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}
