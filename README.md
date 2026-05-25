# Page Replacement Simulator

An interactive, didactic web simulator for the four classic page replacement
algorithms (FIFO, LRU, OPT, RANDOM). Step through a reference string and
watch each algorithm decide which page to evict when physical memory fills
up.

## Background: why we need page replacement

Modern operating systems give every process the illusion of a large, private
address space. Behind the scenes, only a fraction of that space lives in RAM
at any moment; the rest sits on disk. The unit of transfer is the **page**
(typically 4 KiB) on the program side, and the matching slot in physical
memory is called a **frame**.

When the CPU references a virtual address whose page is not currently
resident, the MMU traps to the OS with a **page fault**. The OS has to:

1. Find the missing page on disk.
2. Pick a frame to host it.
3. If that frame already holds another page, evict it first (possibly
   writing it back to disk if it was modified).
4. Restart the faulting instruction.

Steps (2) and (3) are the replacement problem. When all frames are occupied,
the OS must choose a victim. Different policies trade simplicity, hardware
support, and effectiveness in different ways, and the goal of this simulator
is to make those trade-offs visible on a single screen.

## What the simulator does

Given a number of frames and a sequence of page references, the simulator
runs four algorithms in parallel and exposes three coordinated views, all
driven by the same step pointer:

| View                  | What you see                                                                    |
| --------------------- | ------------------------------------------------------------------------------- |
| **1. Passo-a-passo**  | The memory state, the decision the algorithm just made, and an allocation table that fills column by column as you advance. |
| **2. Resultados**     | Four cards counting faults, hits, and fault rate as the walkthrough progresses. |
| **3. Curva de faltas**| Faults vs. number of frames. One x-value is revealed per step.                  |

You control the simulation with `← Voltar`, `Avançar →`, and a `▶ Tocar`
button that auto-advances at roughly one step per second. The four
algorithms share the same step index, so jumping to "Resultados" or "Curva
de faltas" always shows numbers consistent with what you just observed in
the walkthrough.

## The reference sequence used by default

```
7 0 1 2 0 3 0 4 2 3 0 3 2
```

Hand-tracing each algorithm against this 13-page string produces the fault
counts in `src/test/fixtures.ts`:

| Frames | FIFO | LRU | OPT |
| ------ | ---- | --- | --- |
| 3      | 10   | 9   | 7   |
| 4      | 7    | 6   | 6   |

The fixtures are used both by the unit tests and as the on-screen sanity
check: if you ever change one of the algorithm implementations and the
fixtures break, the trace tables in the UI will also visibly drift.

## The four algorithms

All four follow the same skeleton: keep an array of `frames` slots
representing physical memory, walk the reference string, push a `Step`
record at every reference describing what happened, and tally page faults.
They differ only in how the victim is chosen on a fault.

The shared types are in `src/domain/types.ts`:

```ts
type Step = {
  page: PageNumber;
  hit: boolean;
  framesAfter: FrameSlot[];   // memory snapshot after this reference
  queueAfter?: PageNumber[];  // FIFO only
  victim?: PageNumber;        // page evicted on this reference, if any
};

type RunResult = { steps: Step[]; faults: number };
```

### FIFO (First-In, First-Out)

**Source:** `src/domain/algorithms/fifo.ts`

**Idea.** Evict the page that has lived in memory the longest. Maintain a
queue ordered by arrival. A page is appended to the tail when loaded and
removed from the head when evicted. A hit does **not** reorder the queue;
that is what makes FIFO different from LRU.

**Pseudocode.**

```
function fifo(seq, frames):
    memory := array of `frames` empty slots
    queue  := empty list                # arrival order, oldest at head
    steps  := empty list
    faults := 0

    for each page in seq:
        if page is in memory:
            steps.push(HIT step snapshot)
            continue                    # no eviction, queue untouched

        faults := faults + 1
        if there is an empty slot in memory:
            place page in that slot
        else:
            victim := queue.dequeue()   # page that arrived first
            replace victim in memory with page
        queue.enqueue(page)
        steps.push(FAULT step snapshot, including victim if any)

    return { steps, faults }
```

**Why hits do not move pages in the queue.** FIFO is meant to be cheap. A
real implementation only needs a single FIFO pointer in hardware; checking
for hits costs nothing extra. The cost of this simplicity shows up as
**Belady's anomaly**: on some reference strings, adding more frames can
actually increase fault count. Our default sequence does not display the
anomaly between 3 and 4 frames (faults drop from 10 to 7), but the
phenomenon is real and FIFO is the algorithm most associated with it.

### LRU (Least Recently Used)

**Source:** `src/domain/algorithms/lru.ts`

**Idea.** Evict the page that has not been used for the longest time. The
intuition is that recent activity predicts near-future activity (temporal
locality). LRU is provably optimal among algorithms that base decisions only
on past behaviour, but it requires tracking the order of every reference.

**Pseudocode.**

```
function lru(seq, frames):
    memory  := array of `frames` empty slots
    recency := empty list                # least recent at head, MRU at tail
    steps   := empty list
    faults  := 0

    for each page in seq:
        if page is in memory:
            move page to the tail of recency        # mark as most recent
            steps.push(HIT step snapshot)
            continue

        faults := faults + 1
        if there is an empty slot in memory:
            place page in that slot
        else:
            victim := recency.removeHead()           # least recently used
            replace victim in memory with page
        recency.append(page)
        steps.push(FAULT step snapshot, including victim if any)

    return { steps, faults }
```

**Cost in real hardware.** Exact LRU needs a per-access update of a global
ordering structure, which is expensive. Real kernels approximate LRU with
clock or aging algorithms that use a small number of reference bits per
frame. This simulator implements true LRU because the input is tiny and
clarity matters more than throughput.

### OPT (Belady, optimal)

**Source:** `src/domain/algorithms/opt.ts`

**Idea.** Evict the page whose **next** use is furthest in the future. A
page that is never referenced again (next use is +∞) is the very first
candidate. OPT cannot be implemented for real workloads, because it
requires knowing the future, but it gives a lower bound on fault count for
a given reference string. Use it as a yardstick: any practical algorithm
should produce a curve close to OPT.

**Pseudocode.**

```
function opt(seq, frames):
    memory := array of `frames` empty slots
    steps  := empty list
    faults := 0

    for i from 0 to seq.length - 1:
        page := seq[i]
        if page is in memory:
            steps.push(HIT step snapshot)
            continue

        faults := faults + 1
        if there is an empty slot in memory:
            place page in that slot
        else:
            victimSlot := pickVictim(memory, seq, i + 1)
            replace memory[victimSlot] with page
        steps.push(FAULT step snapshot, including victim if any)

    return { steps, faults }


function pickVictim(memory, seq, from):
    # Returns the slot whose page has the most distant next use.
    bestSlot     := 0
    bestDistance := -1
    for each slot s in memory:
        page := memory[s]
        next := nextUseIndex(seq, from, page)
        if next is +infinity:
            return s                   # never used again, evict immediately
        if next > bestDistance:
            bestDistance := next
            bestSlot     := s
    return bestSlot


function nextUseIndex(seq, from, page):
    for j from `from` to seq.length - 1:
        if seq[j] == page:
            return j
    return +infinity
```

**Reading the simulator's explanation panel.** When the OS view shows
`Próximos usos: 7→∞, 0→pos 4, 1→∞`, OPT picks the first page whose next use
is +∞ (in this case page 7 is found first in the memory order), so 7 is the
victim. If no page has +∞ as next use, OPT keeps scanning and chooses the
one with the largest finite distance.

### RANDOM

**Source:** `src/domain/algorithms/random.ts`

**Idea.** When memory is full, pick a victim slot uniformly at random.
Surprisingly competitive in practice, very easy to implement, and a useful
baseline. Because of the randomness, the simulator runs RANDOM 30 times
with deterministic seeds (`mulberry32` from `src/domain/mulberry32.ts`) and
reports the mean and standard deviation of fault count. The Passo-a-passo
view uses one specific seeded run so the walkthrough is reproducible.

**Pseudocode.**

```
function random(seq, frames, rng):
    memory := array of `frames` empty slots
    steps  := empty list
    faults := 0

    for each page in seq:
        if page is in memory:
            steps.push(HIT step snapshot)
            continue

        faults := faults + 1
        if there is an empty slot in memory:
            place page in that slot
        else:
            slot := floor(rng() * frames)            # uniform victim slot
            replace memory[slot] with page
        steps.push(FAULT step snapshot, including victim if any)

    return { steps, faults }
```

The injectable `rng` callback defaults to `Math.random` for production use.
Tests pass `() => 0` for a fully deterministic path (always evicts slot 0)
or `mulberry32(seed)` for a reproducible pseudo-random run.

### Putting them side by side

The aggregator in `src/domain/runAll.ts` runs all four algorithms and
collects the data the UI needs:

```ts
type AllResults = {
  fifo: RunResult;            // full step trace
  lru: RunResult;
  opt: RunResult;
  randomVisual: RunResult;    // one deterministic RANDOM run (for the walkthrough)
  randomMean: number;         // mean fault count over 30 seeded runs
  randomStdev: number;        // population standard deviation
};
```

The chart in "Curva de faltas" calls `runAll(seq, k)` once for every frame
count from 1 to the slider's max, producing the four lines plotted vs. the
x-axis.

## Running locally

```sh
bun install         # install dependencies
bun dev             # start the dev server at http://localhost:5173
bun run test        # run the Vitest suite
bun run check       # Biome lint + format check
bun run build       # production build
```
