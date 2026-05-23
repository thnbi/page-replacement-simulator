import { describe, expect, it } from 'vitest';
import { mulberry32 } from './mulberry32';

describe('mulberry32', () => {
  it('produz valores entre 0 e 1', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('é determinístico para a mesma seed', () => {
    const a = mulberry32(0xc0ffee);
    const b = mulberry32(0xc0ffee);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produz sequências diferentes para seeds diferentes', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});
