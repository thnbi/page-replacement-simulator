import { describe, expect, it } from 'vitest';
import { CLASSIC_SEQUENCE, EXPECTED_FAULTS } from '../../test/fixtures';
import { fifo } from './fifo';

describe('fifo', () => {
  it('classic sequence × 3 frames → 10 faults', () => {
    const r = fifo(CLASSIC_SEQUENCE, 3);
    expect(r.faults).toBe(EXPECTED_FAULTS.fifo[3]);
    expect(r.steps).toHaveLength(CLASSIC_SEQUENCE.length);
  });

  it('classic sequence × 4 frames → 7 faults', () => {
    expect(fifo(CLASSIC_SEQUENCE, 4).faults).toBe(EXPECTED_FAULTS.fifo[4]);
  });

  it('empty sequence yields no steps and zero faults', () => {
    expect(fifo([], 3)).toEqual({ steps: [], faults: 0 });
  });

  it('sequence shorter than frames: all faults, no victims', () => {
    const r = fifo([1, 2, 3], 5);
    expect(r.faults).toBe(3);
    expect(r.steps.every((s) => s.victim === undefined)).toBe(true);
  });

  it('repeating the same page: 1 fault + hits', () => {
    const r = fifo([5, 5, 5], 3);
    expect(r.faults).toBe(1);
    expect(r.steps.map((s) => s.hit)).toEqual([false, true, true]);
  });

  it('1 frame: every new page is a fault evicting the previous one', () => {
    const r = fifo([1, 2, 3], 1);
    expect(r.steps[0]?.victim).toBeUndefined();
    expect(r.steps[1]?.victim).toBe(1);
    expect(r.steps[2]?.victim).toBe(2);
  });

  it('a HIT does not reorder the queue', () => {
    const r = fifo([1, 2, 3, 1], 3);
    expect(r.steps[2]?.queueAfter).toEqual([1, 2, 3]);
    expect(r.steps[3]?.hit).toBe(true);
    expect(r.steps[3]?.queueAfter).toEqual([1, 2, 3]);
  });

  it('does not mutate the input sequence', () => {
    const seq = [...CLASSIC_SEQUENCE];
    fifo(seq, 3);
    expect(seq).toEqual(CLASSIC_SEQUENCE);
  });
});
