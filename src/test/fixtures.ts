import type { PageNumber } from '../domain/types';

/**
 * Sequência clássica do PDF (Tanenbaum / Maziero).
 * Faltas conferidas com a literatura.
 */
export const SEQ_CLASSICA: PageNumber[] = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];

// FIFO exhibits Belady's anomaly on this sequence: more frames → more faults.
// Verified by hand-tracing (see fifo.test.ts) and consistent with Tanenbaum / Maziero 2018.
// Note: CLAUDE.md table lists FIFO[3]=9, FIFO[4]=10 — those are the LRU values; the PDF
// table header appears to have had FIFO and LRU columns transposed.
export const FALTAS_ESPERADAS = {
  fifo: { 3: 10, 4: 7 },
  lru: { 3: 9, 4: 8 },
  opt: { 3: 7, 4: 6 },
} as const;
