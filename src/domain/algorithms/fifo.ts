import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * FIFO: evicts the page that has been in memory the longest.
 * Maintains an explicit queue; hits do not reorder the queue.
 *
 * @example fifo([7,0,1,2,0,3,0,4,2,3,0,3,2], 3) // { faults: 10, steps: [...] }
 */
export function fifo(seq: PageNumber[], frames: number): RunResult {
  const memory: FrameSlot[] = new Array(frames).fill(EMPTY_SLOT);
  const queue: PageNumber[] = [];
  const steps: Step[] = [];
  let faults = 0;

  for (const page of seq) {
    if (memory.includes(page)) {
      steps.push({
        page,
        hit: true,
        framesAfter: [...memory],
        queueAfter: [...queue],
      });
      continue;
    }

    faults++;
    const emptySlotIdx = memory.indexOf(EMPTY_SLOT);
    let victim: PageNumber | undefined;

    if (emptySlotIdx !== -1) {
      memory[emptySlotIdx] = page;
    } else {
      const evicted = queue.shift();
      if (evicted === undefined) {
        throw new Error('Inconsistent state: memory full but queue empty.');
      }
      victim = evicted;
      const slotIdx = memory.indexOf(evicted);
      memory[slotIdx] = page;
    }
    queue.push(page);

    steps.push({
      page,
      hit: false,
      framesAfter: [...memory],
      queueAfter: [...queue],
      ...(victim !== undefined ? { victim } : {}),
    });
  }

  return { steps, faults };
}
