import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * LRU: evicts the least recently used page.
 * Maintains a recency list (index 0 = least recent, last = most recent).
 *
 * @example lru([7,0,1,2,0,3,0,4,2,3,0,3,2], 3) // { faults: 9, steps: [...] }
 */
export function lru(seq: PageNumber[], frames: number): RunResult {
  const memory: FrameSlot[] = new Array(frames).fill(EMPTY_SLOT);
  const recency: PageNumber[] = [];
  const steps: Step[] = [];
  let faults = 0;

  for (const page of seq) {
    if (memory.includes(page)) {
      const idx = recency.indexOf(page);
      recency.splice(idx, 1);
      recency.push(page);
      steps.push({ page, hit: true, framesAfter: [...memory] });
      continue;
    }

    faults++;
    const emptySlotIdx = memory.indexOf(EMPTY_SLOT);
    let victim: PageNumber | undefined;

    if (emptySlotIdx !== -1) {
      memory[emptySlotIdx] = page;
    } else {
      const evicted = recency.shift();
      if (evicted === undefined) {
        throw new Error('Inconsistent state: memory full but recency list empty.');
      }
      victim = evicted;
      const slotIdx = memory.indexOf(evicted);
      memory[slotIdx] = page;
    }
    recency.push(page);

    steps.push({
      page,
      hit: false,
      framesAfter: [...memory],
      ...(victim !== undefined ? { victim } : {}),
    });
  }

  return { steps, faults };
}
