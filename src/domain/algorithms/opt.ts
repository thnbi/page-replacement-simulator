import type { FrameSlot, PageNumber, RunResult, Step } from '../types';
import { EMPTY_SLOT } from '../types';

/**
 * OPT (Belady): evicts the page whose next use is furthest in the future.
 * A page with no future use (Infinity) is the first candidate to go.
 *
 * @example opt([7,0,1,2,0,3,0,4,2,3,0,3,2], 3) // { faults: 7, steps: [...] }
 */
export function opt(seq: PageNumber[], frames: number): RunResult {
  const memory: FrameSlot[] = new Array(frames).fill(EMPTY_SLOT);
  const steps: Step[] = [];
  let faults = 0;

  for (let i = 0; i < seq.length; i++) {
    const page = seq[i];
    if (page === undefined) continue;

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
      const victimIdx = pickVictim(memory, seq, i + 1);
      victim = memory[victimIdx] ?? undefined;
      memory[victimIdx] = page;
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

function pickVictim(memory: FrameSlot[], seq: PageNumber[], from: number): number {
  let worstIdx = 0;
  let worstDistance = -1;

  for (let s = 0; s < memory.length; s++) {
    const candidate = memory[s];
    if (candidate === null || candidate === undefined) continue;
    const next = nextUseIndex(seq, from, candidate);
    if (next === Infinity) return s;
    if (next > worstDistance) {
      worstDistance = next;
      worstIdx = s;
    }
  }
  return worstIdx;
}

function nextUseIndex(seq: PageNumber[], from: number, page: PageNumber): number {
  for (let j = from; j < seq.length; j++) {
    if (seq[j] === page) return j;
  }
  return Infinity;
}
