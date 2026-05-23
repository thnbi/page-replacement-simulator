import { fifo } from './algorithms/fifo';
import { lru } from './algorithms/lru';
import { opt } from './algorithms/opt';
import { random } from './algorithms/random';
import { mulberry32 } from './mulberry32';
import {
  type AllResults,
  type PageNumber,
  RANDOM_SAMPLES,
  RANDOM_SEED_BASE,
} from './types';

/**
 * Runs all four page-replacement algorithms on the given sequence and
 * returns their results aggregated into a single `AllResults` value.
 *
 * RANDOM is run `RANDOM_SAMPLES` times with deterministic seeds
 * (mulberry32(RANDOM_SEED_BASE + i)) so the mean and stdev are
 * reproducible across calls.  The first run also keeps the full step
 * trace (`randomVisual`) for use by the chart and manual inspection.
 *
 * Example:
 *   const r = runAll([7, 0, 1, 2, 0, 3], 3);
 *   console.log(r.fifo.faults, r.randomMean);
 */
export function runAll(seq: PageNumber[], frames: number): AllResults {
  const fifoResult = fifo(seq, frames);
  const lruResult = lru(seq, frames);
  const optResult = opt(seq, frames);

  // First run keeps the full step trace used by the UI.
  const visual = random(seq, frames, mulberry32(RANDOM_SEED_BASE));
  const samples: number[] = [visual.faults];
  for (let i = 1; i < RANDOM_SAMPLES; i++) {
    samples.push(random(seq, frames, mulberry32(RANDOM_SEED_BASE + i)).faults);
  }

  return {
    fifo: fifoResult,
    lru: lruResult,
    opt: optResult,
    randomVisual: visual,
    randomMean: Math.round(sampleMean(samples)),
    randomStdev: populationStdev(samples),
  };
}

function sampleMean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((acc, v) => acc + v, 0) / xs.length;
}

function populationStdev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const m = sampleMean(xs);
  const variance = xs.reduce((acc, v) => acc + (v - m) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}
