import { describe, expect, it } from 'vitest';
import { FALTAS_ESPERADAS, SEQ_CLASSICA } from '../../test/fixtures';
import { fifo } from './fifo';
import { lru } from './lru';

describe('lru', () => {
  it('sequência clássica × 3 quadros → 9 faltas', () => {
    expect(lru(SEQ_CLASSICA, 3).faltas).toBe(FALTAS_ESPERADAS.lru[3]);
  });

  it('sequência clássica × 4 quadros → 6 faltas', () => {
    expect(lru(SEQ_CLASSICA, 4).faltas).toBe(FALTAS_ESPERADAS.lru[4]);
  });

  it('sequência vazia retorna sem passos', () => {
    expect(lru([], 3)).toEqual({ passos: [], faltas: 0 });
  });

  it('mesma página repetida: 1 falta + hits', () => {
    const r = lru([5, 5, 5], 3);
    expect(r.faltas).toBe(1);
  });

  it('LRU difere de FIFO em [1,2,3,1,4] com 3 quadros', () => {
    // FIFO: expulsa 1 (mais antigo) na chegada do 4 → [4,2,3]
    // LRU:  expulsa 2 (menos recentemente usado) → [1,4,3]
    const seq = [1, 2, 3, 1, 4];
    const rLru = lru(seq, 3);
    const rFifo = fifo(seq, 3);
    const ultimoLru = rLru.passos[rLru.passos.length - 1];
    const ultimoFifo = rFifo.passos[rFifo.passos.length - 1];
    expect(ultimoLru?.quadrosDepois.sort()).toEqual([1, 3, 4]);
    expect(ultimoFifo?.quadrosDepois.sort()).toEqual([2, 3, 4]);
  });

  it('1 quadro: cada página nova substitui a anterior', () => {
    const r = lru([1, 2, 3], 1);
    expect(r.passos[1]?.vitima).toBe(1);
    expect(r.passos[2]?.vitima).toBe(2);
  });

  it('não muta a sequência de entrada', () => {
    const seq = [...SEQ_CLASSICA];
    lru(seq, 3);
    expect(seq).toEqual(SEQ_CLASSICA);
  });
});
