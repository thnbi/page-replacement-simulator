import { describe, expect, it } from 'vitest';
import { ALGORITHM_COLOR, ALGORITHM_LABEL, pageColor } from './colors';

describe('colors', () => {
  it('the same page returns the same color', () => {
    expect(pageColor(7)).toBe(pageColor(7));
  });

  it('different pages can yield different colors', () => {
    const colors = new Set([
      pageColor(0),
      pageColor(1),
      pageColor(2),
      pageColor(3),
    ]);
    expect(colors.size).toBeGreaterThan(1);
  });

  it('handles pages larger than the palette via modulo', () => {
    expect(pageColor(99)).toBeDefined();
  });

  it('exports one color per algorithm', () => {
    expect(ALGORITHM_COLOR.fifo).toBeDefined();
    expect(ALGORITHM_COLOR.lru).toBeDefined();
    expect(ALGORITHM_COLOR.opt).toBeDefined();
    expect(ALGORITHM_COLOR.random).toBeDefined();
  });

  it('exports a label per algorithm', () => {
    expect(ALGORITHM_LABEL.fifo).toBe('FIFO');
    expect(ALGORITHM_LABEL.lru).toBe('LRU');
    expect(ALGORITHM_LABEL.opt).toBe('OPT');
    expect(ALGORITHM_LABEL.random).toBe('RANDOM');
  });
});
