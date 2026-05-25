import type { FrameSlot, PageNumber, Step } from '../domain/types';

/**
 * Recency order for LRU at a given step.
 * Returns the pages currently in memory ordered from least-recently-used (head)
 * to most-recently-used (tail). Computed by walking the sequence up to and
 * including `stepIndex` and tracking last-seen positions.
 */
export function lruRecency(
  seq: PageNumber[],
  stepIndex: number,
  framesAfter: FrameSlot[],
): PageNumber[] {
  const lastSeen = new Map<PageNumber, number>();
  for (let i = 0; i <= stepIndex; i++) {
    const page = seq[i];
    if (page !== undefined) lastSeen.set(page, i);
  }
  const inMemory = framesAfter.filter((p): p is PageNumber => p !== null);
  return inMemory.slice().sort((a, b) => (lastSeen.get(a) ?? -1) - (lastSeen.get(b) ?? -1));
}

/**
 * Next use index per page currently in memory, looking forward from `stepIndex + 1`.
 * Pages with no future use map to `Infinity`.
 */
export function optFutureUse(
  seq: PageNumber[],
  stepIndex: number,
  framesAfter: FrameSlot[],
): Map<PageNumber, number> {
  const result = new Map<PageNumber, number>();
  for (const page of framesAfter) {
    if (page === null) continue;
    let next: number = Number.POSITIVE_INFINITY;
    for (let i = stepIndex + 1; i < seq.length; i++) {
      if (seq[i] === page) {
        next = i;
        break;
      }
    }
    result.set(page, next);
  }
  return result;
}

/**
 * Slot index (0-based) where the victim was placed — i.e., where the new page
 * now lives after eviction. Returns null on a hit or when there was no eviction.
 */
export function slotOfNewPage(step: Step): number | null {
  if (step.hit) return null;
  if (step.victim === undefined) return null;
  return step.framesAfter.indexOf(step.page);
}
