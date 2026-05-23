import type { PageNumber } from '../domain/types';

/**
 * Canonical reference sequence from the PDF (Tanenbaum / Maziero).
 * Fault counts below were verified by hand-tracing each algorithm
 * step by step against this exact sequence.
 *
 * (Note: CLAUDE.md ships an inaccurate table copied from Belady's
 * anomaly classic example, which uses a different sequence.)
 */
export const CLASSIC_SEQUENCE: PageNumber[] = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];

export const EXPECTED_FAULTS = {
  fifo: { 3: 10, 4: 7 },
  lru: { 3: 9, 4: 6 },
  opt: { 3: 7, 4: 6 },
} as const;
