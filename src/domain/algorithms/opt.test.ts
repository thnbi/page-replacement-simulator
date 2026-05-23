import { describe, expect, it } from 'vitest';
import { CLASSIC_SEQUENCE, EXPECTED_FAULTS } from '../../test/fixtures';
import { opt } from './opt';

describe('opt', () => {
  it('classic sequence × 3 frames → 7 faults', () => {
    expect(opt(CLASSIC_SEQUENCE, 3).faults).toBe(EXPECTED_FAULTS.opt[3]);
  });

  it('classic sequence × 4 frames → 6 faults', () => {
    expect(opt(CLASSIC_SEQUENCE, 4).faults).toBe(EXPECTED_FAULTS.opt[4]);
  });

  it('empty sequence', () => {
    expect(opt([], 3)).toEqual({ steps: [], faults: 0 });
  });

  it('a page with no future use is evicted first', () => {
    // [1,2,3,4,2,3] with 3 frames:
    // at step 3 (page 4): memory={1,2,3}.
    // next uses from i=4 onward: 1→never (Inf), 2→i=4, 3→i=5.
    // 1 has no future use → it gets evicted.
    const r = opt([1, 2, 3, 4, 2, 3], 3);
    expect(r.steps[3]?.victim).toBe(1);
  });

  it('does not mutate the input sequence', () => {
    const seq = [...CLASSIC_SEQUENCE];
    opt(seq, 3);
    expect(seq).toEqual(CLASSIC_SEQUENCE);
  });

  it('produces no more faults than FIFO/LRU on the classic sequence', () => {
    expect(opt(CLASSIC_SEQUENCE, 3).faults).toBeLessThanOrEqual(9);
    expect(opt(CLASSIC_SEQUENCE, 4).faults).toBeLessThanOrEqual(6);
  });
});
