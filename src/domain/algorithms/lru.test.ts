import { describe, expect, it } from 'vitest';
import { CLASSIC_SEQUENCE, EXPECTED_FAULTS } from '../../test/fixtures';
import { fifo } from './fifo';
import { lru } from './lru';

describe('lru', () => {
  it('classic sequence × 3 frames → 9 faults', () => {
    expect(lru(CLASSIC_SEQUENCE, 3).faults).toBe(EXPECTED_FAULTS.lru[3]);
  });

  it('classic sequence × 4 frames → 6 faults', () => {
    expect(lru(CLASSIC_SEQUENCE, 4).faults).toBe(EXPECTED_FAULTS.lru[4]);
  });

  it('empty sequence yields no steps', () => {
    expect(lru([], 3)).toEqual({ steps: [], faults: 0 });
  });

  it('repeating the same page: 1 fault + hits', () => {
    const r = lru([5, 5, 5], 3);
    expect(r.faults).toBe(1);
  });

  it('LRU differs from FIFO on [1,2,3,1,4] with 3 frames', () => {
    // FIFO evicts 1 (oldest in queue) when 4 arrives → final memory {2,3,4}
    // LRU  evicts 2 (least recently used)              → final memory {1,3,4}
    const seq = [1, 2, 3, 1, 4];
    const lastLru = lru(seq, 3).steps.at(-1);
    const lastFifo = fifo(seq, 3).steps.at(-1);
    expect(lastLru?.framesAfter.slice().sort()).toEqual([1, 3, 4]);
    expect(lastFifo?.framesAfter.slice().sort()).toEqual([2, 3, 4]);
  });

  it('1 frame: every new page evicts the previous', () => {
    const r = lru([1, 2, 3], 1);
    expect(r.steps[1]?.victim).toBe(1);
    expect(r.steps[2]?.victim).toBe(2);
  });

  it('does not mutate the input sequence', () => {
    const seq = [...CLASSIC_SEQUENCE];
    lru(seq, 3);
    expect(seq).toEqual(CLASSIC_SEQUENCE);
  });
});
