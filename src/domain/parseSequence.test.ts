import { describe, expect, it } from 'vitest';
import { ParseError, parseSequence } from './parseSequence';

describe('parseSequence', () => {
  it('parses numbers separated by spaces', () => {
    expect(parseSequence('7 0 1 2')).toEqual([7, 0, 1, 2]);
  });

  it('parses numbers separated by commas', () => {
    expect(parseSequence('7,0,1,2')).toEqual([7, 0, 1, 2]);
  });

  it('tolerates extra whitespace and repeated separators', () => {
    expect(parseSequence('  7,, 0  1 ,2 ')).toEqual([7, 0, 1, 2]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseSequence('')).toEqual([]);
  });

  it('returns an empty array for whitespace-only input', () => {
    expect(parseSequence('   ')).toEqual([]);
  });

  it('throws ParseError with the offending position and character', () => {
    expect(() => parseSequence('7 x 0')).toThrow(ParseError);
    try {
      parseSequence('7 x 0');
    } catch (e) {
      expect((e as Error).message).toContain('posição 2');
      expect((e as Error).message).toContain("'x'");
    }
  });

  it('parses multi-digit numbers', () => {
    expect(parseSequence('10 100 999')).toEqual([10, 100, 999]);
  });

  it('rejects negative numbers', () => {
    expect(() => parseSequence('1 -2 3')).toThrow(ParseError);
  });
});
