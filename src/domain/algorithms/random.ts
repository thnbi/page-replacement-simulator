import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * RANDOM: when a fault occurs and memory is full, evicts a random frame.
 * Accepts an injectable RNG so callers can reproduce runs (default Math.random).
 *
 * @example
 *   const result = random([1, 2, 3, 4], 3, mulberry32(42));
 */
export function random(
  seq: PageNumber[],
  frames: number,
  rng: () => number = Math.random,
): RunResult {
  const memory: FrameSlot[] = new Array(frames).fill(EMPTY_SLOT);
  const steps: Step[] = [];
  let faults = 0;

  for (const page of seq) {
    if (memory.includes(page)) {
      steps.push({ page, hit: true, framesAfter: [...memory] });
      continue;
    }

    faults++;
    const emptySlotIdx = memory.indexOf(EMPTY_SLOT);
    let victim: PageNumber | undefined;

    if (emptySlotIdx !== -1) {
      memory[emptySlotIdx] = page;
    } else {
      const idx = Math.floor(rng() * frames);
      const evicted = memory[idx];
      victim = evicted ?? undefined;
      memory[idx] = page;
    }

    steps.push({
      page,
      hit: false,
      framesAfter: [...memory],
      ...(victim !== undefined ? { victim } : {}),
    });
  }

  return { steps, faults };
}
