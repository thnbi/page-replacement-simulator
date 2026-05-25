import { describe, expect, it } from 'vitest';
import { fifo } from '../domain/algorithms/fifo';
import { lru } from '../domain/algorithms/lru';
import { opt } from '../domain/algorithms/opt';
import { CLASSIC_SEQUENCE } from '../test/fixtures';
import { lruRecency, optFutureUse, slotOfNewPage } from './algorithmState';

describe('lruRecency', () => {
  it('orders pages by last-seen index (LRU first)', () => {
    // After step 5 of CLASSIC_SEQUENCE (page 3) with 3 frames,
    // memory is {0, 2, 3} and last-seen indexes are 0→4, 2→3, 3→5.
    const run = lru(CLASSIC_SEQUENCE, 3);
    const step = run.steps[5];
    if (!step) throw new Error('expected step 5');
    expect(lruRecency(CLASSIC_SEQUENCE, 5, step.framesAfter)).toEqual([2, 0, 3]);
  });

  it('ignores empty slots', () => {
    const recency = lruRecency([7, 0], 1, [7, 0, null]);
    expect(recency).toEqual([7, 0]);
  });
});

describe('optFutureUse', () => {
  it('returns position of next use for each page in memory', () => {
    // After step 3 of CLASSIC_SEQUENCE (page 2), OPT memory = {0, 1, 2}.
    // Next uses from index 4 onward: 0→4, 1→never, 2→8.
    const run = opt(CLASSIC_SEQUENCE, 3);
    const step = run.steps[3];
    if (!step) throw new Error('expected step 3');
    const future = optFutureUse(CLASSIC_SEQUENCE, 3, step.framesAfter);
    expect(future.get(0)).toBe(4);
    expect(future.get(1)).toBe(Number.POSITIVE_INFINITY);
    expect(future.get(2)).toBe(8);
  });
});

describe('slotOfNewPage', () => {
  it('returns the slot index where the new page sits on a fault', () => {
    const run = fifo(CLASSIC_SEQUENCE, 3);
    const step3 = run.steps[3];
    if (!step3) throw new Error('expected step 3');
    expect(slotOfNewPage(step3)).toBe(step3.framesAfter.indexOf(2));
  });

  it('returns null on a hit', () => {
    const run = fifo(CLASSIC_SEQUENCE, 3);
    const step4 = run.steps[4];
    if (!step4) throw new Error('expected step 4');
    expect(slotOfNewPage(step4)).toBeNull();
  });
});
