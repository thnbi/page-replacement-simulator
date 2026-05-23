import { describe, expect, it } from 'vitest';
import { CLASSIC_SEQUENCE, EXPECTED_FAULTS } from '../test/fixtures';
import { runAll } from './runAll';

describe('runAll', () => {
  it('returns all four results for the classic sequence × 3 frames', () => {
    const r = runAll(CLASSIC_SEQUENCE, 3);
    expect(r.fifo.faults).toBe(EXPECTED_FAULTS.fifo[3]);
    expect(r.lru.faults).toBe(EXPECTED_FAULTS.lru[3]);
    expect(r.opt.faults).toBe(EXPECTED_FAULTS.opt[3]);
    expect(r.randomMean).toBeGreaterThanOrEqual(r.opt.faults);
    expect(Number.isFinite(r.randomMean)).toBe(true);
    expect(r.randomStdev).toBeGreaterThanOrEqual(0);
    expect(r.randomVisual.steps).toHaveLength(CLASSIC_SEQUENCE.length);
    expect(r.randomVisual.faults).toBeGreaterThanOrEqual(r.opt.faults);
  });

  it('is deterministic (same seed base → same randomMean)', () => {
    const a = runAll(CLASSIC_SEQUENCE, 3);
    const b = runAll(CLASSIC_SEQUENCE, 3);
    expect(a.randomMean).toBe(b.randomMean);
    expect(a.randomStdev).toBe(b.randomStdev);
  });

  it('empty sequence returns zero everywhere', () => {
    const r = runAll([], 3);
    expect(r.fifo.faults).toBe(0);
    expect(r.lru.faults).toBe(0);
    expect(r.opt.faults).toBe(0);
    expect(r.randomMean).toBe(0);
    expect(r.randomStdev).toBe(0);
    expect(r.randomVisual).toEqual({ steps: [], faults: 0 });
  });
});
