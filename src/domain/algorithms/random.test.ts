import { describe, expect, it } from 'vitest';
import { CLASSIC_SEQUENCE } from '../../test/fixtures';
import { mulberry32 } from '../mulberry32';
import { opt } from './opt';
import { random } from './random';

describe('random', () => {
  it('empty sequence', () => {
    expect(random([], 3)).toEqual({ steps: [], faults: 0 });
  });

  it('sequence shorter than frames: all faults, no victims', () => {
    const r = random([1, 2, 3], 5, () => 0);
    expect(r.faults).toBe(3);
    expect(r.steps.every((s) => s.victim === undefined)).toBe(true);
  });

  it('with rng = () => 0 always evicts slot 0 (deterministic)', () => {
    // [1,2,3,4] with 3 frames: 4 faults total.
    // When 4 arrives, rng()=0 → evicts memory[0]=1.
    const r = random([1, 2, 3, 4], 3, () => 0);
    expect(r.steps[3]?.victim).toBe(1);
    expect(r.faults).toBe(4);
  });

  it('is deterministic with the same seed', () => {
    const rngA = mulberry32(42);
    const rngB = mulberry32(42);
    const a = random(CLASSIC_SEQUENCE, 3, rngA);
    const b = random(CLASSIC_SEQUENCE, 3, rngB);
    expect(a.faults).toBe(b.faults);
    expect(a.steps).toEqual(b.steps);
  });

  it('faults >= opt.faults on the classic sequence', () => {
    const rng = mulberry32(123);
    const rRandom = random(CLASSIC_SEQUENCE, 3, rng).faults;
    const rOpt = opt(CLASSIC_SEQUENCE, 3).faults;
    expect(rRandom).toBeGreaterThanOrEqual(rOpt);
  });

  it('does not mutate the input sequence', () => {
    const seq = [...CLASSIC_SEQUENCE];
    random(seq, 3, () => 0);
    expect(seq).toEqual(CLASSIC_SEQUENCE);
  });
});
