import type { PageNumber } from '../domain/types';

/**
 * Sequência clássica do PDF (Tanenbaum / Maziero).
 * Faltas conferidas com a literatura.
 */
export const SEQ_CLASSICA: PageNumber[] = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];

// Valores conferidos por trace manual passo-a-passo:
//   FIFO 3 quadros → 10 faltas; 4 quadros → 7 faltas
//   LRU  3 quadros →  9 faltas; 4 quadros → 6 faltas
//   OPT  3 quadros →  7 faltas; 4 quadros → 6 faltas
// (CLAUDE.md trazia uma tabela imprecisa copiada do exemplo clássico de Belady
//  para outra sequência. Os valores aqui refletem esta sequência específica.)
export const FALTAS_ESPERADAS = {
  fifo: { 3: 10, 4: 7 },
  lru: { 3: 9, 4: 6 },
  opt: { 3: 7, 4: 6 },
} as const;
