import { describe, expect, it } from 'vitest';
import { ParseError, parseSequence } from './parseSequence';

describe('parseSequence', () => {
  it('parseia números separados por espaço', () => {
    expect(parseSequence('7 0 1 2')).toEqual([7, 0, 1, 2]);
  });

  it('parseia números separados por vírgula', () => {
    expect(parseSequence('7,0,1,2')).toEqual([7, 0, 1, 2]);
  });

  it('tolera múltiplos separadores e espaços extras', () => {
    expect(parseSequence('  7,, 0  1 ,2 ')).toEqual([7, 0, 1, 2]);
  });

  it('retorna array vazio para string vazia', () => {
    expect(parseSequence('')).toEqual([]);
  });

  it('retorna array vazio para string só com espaços', () => {
    expect(parseSequence('   ')).toEqual([]);
  });

  it('lança ParseError citando posição e caractere inválido', () => {
    expect(() => parseSequence('7 x 0')).toThrow(ParseError);
    try {
      parseSequence('7 x 0');
    } catch (e) {
      expect((e as Error).message).toContain('posição 2');
      expect((e as Error).message).toContain("'x'");
    }
  });

  it('parseia números multi-dígito', () => {
    expect(parseSequence('10 100 999')).toEqual([10, 100, 999]);
  });

  it('rejeita números negativos', () => {
    expect(() => parseSequence('1 -2 3')).toThrow(ParseError);
  });
});
