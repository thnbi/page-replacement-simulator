import type { PageNumber } from '../domain/types';

/**
 * Sequência clássica do PDF (Tanenbaum / Maziero).
 * Faltas conferidas com a literatura.
 */
export const SEQ_CLASSICA: PageNumber[] = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];

export const FALTAS_ESPERADAS = {
  fifo: { 3: 9, 4: 10 },
  lru: { 3: 9, 4: 8 },
  opt: { 3: 7, 4: 6 },
} as const;
