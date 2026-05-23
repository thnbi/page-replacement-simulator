import { describe, expect, it } from 'vitest';
import { FALTAS_ESPERADAS, SEQ_CLASSICA } from '../../test/fixtures';
import { fifo } from './fifo';

describe('fifo', () => {
  it('sequência clássica × 3 quadros → 10 faltas', () => {
    const r = fifo(SEQ_CLASSICA, 3);
    expect(r.faltas).toBe(FALTAS_ESPERADAS.fifo[3]);
    expect(r.passos).toHaveLength(SEQ_CLASSICA.length);
  });

  it('sequência clássica × 4 quadros → 7 faltas', () => {
    expect(fifo(SEQ_CLASSICA, 4).faltas).toBe(FALTAS_ESPERADAS.fifo[4]);
  });

  it('sequência vazia retorna sem passos e zero faltas', () => {
    expect(fifo([], 3)).toEqual({ passos: [], faltas: 0 });
  });

  it('sequência menor que o nº de quadros: todas faltas, sem vítima', () => {
    const r = fifo([1, 2, 3], 5);
    expect(r.faltas).toBe(3);
    expect(r.passos.every((p) => p.vitima === undefined)).toBe(true);
  });

  it('mesma página repetida: 1 falta + hits', () => {
    const r = fifo([5, 5, 5], 3);
    expect(r.faltas).toBe(1);
    expect(r.passos.map((p) => p.hit)).toEqual([false, true, true]);
  });

  it('1 quadro: toda página nova é falta com vítima = anterior', () => {
    const r = fifo([1, 2, 3], 1);
    expect(r.passos[0]?.vitima).toBeUndefined();
    expect(r.passos[1]?.vitima).toBe(1);
    expect(r.passos[2]?.vitima).toBe(2);
  });

  it('um HIT não altera a fila', () => {
    const r = fifo([1, 2, 3, 1], 3);
    expect(r.passos[2]?.filaDepois).toEqual([1, 2, 3]);
    expect(r.passos[3]?.hit).toBe(true);
    expect(r.passos[3]?.filaDepois).toEqual([1, 2, 3]);
  });

  it('não muta a sequência de entrada', () => {
    const seq = [...SEQ_CLASSICA];
    fifo(seq, 3);
    expect(seq).toEqual(SEQ_CLASSICA);
  });
});
