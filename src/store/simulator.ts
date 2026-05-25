import { create } from 'zustand';
import { ParseError, parseSequence } from '../domain/parseSequence';
import { runAll } from '../domain/runAll';
import {
  type Algorithm,
  type AllResults,
  DEFAULT_CHART_MAX,
  DEFAULT_FRAMES,
  MAX_CHART_FRAMES,
  MIN_FRAMES,
  type PageNumber,
  type RunResult,
  type StepIndex,
} from '../domain/types';

const DEFAULT_SEQUENCE_TEXT = '7 0 1 2 0 3 0 4 2 3 0 3 2';

type SimulatorState = {
  frames: number;
  sequenceText: string;
  sequence: PageNumber[];
  parseError: string | null;
  results: AllResults | null;
  manualAlgorithm: Algorithm;
  stepIndex: StepIndex;
  maxChartFrames: number;

  setFrames(n: number): void;
  setSequenceText(s: string): void;
  setManualAlgorithm(a: Algorithm): void;
  run(): void;
  stepForward(): void;
  stepBack(): void;
  reset(): void;
  setMaxChartFrames(n: number): void;
};

export function initialState(): Omit<
  SimulatorState,
  | 'setFrames'
  | 'setSequenceText'
  | 'setManualAlgorithm'
  | 'run'
  | 'stepForward'
  | 'stepBack'
  | 'reset'
  | 'setMaxChartFrames'
> {
  return {
    frames: DEFAULT_FRAMES,
    sequenceText: DEFAULT_SEQUENCE_TEXT,
    sequence: parseSequence(DEFAULT_SEQUENCE_TEXT),
    parseError: null,
    results: null,
    manualAlgorithm: 'fifo',
    stepIndex: -1,
    maxChartFrames: DEFAULT_CHART_MAX,
  };
}

/**
 * Returns the RunResult that the manual walkthrough should show.
 * RANDOM uses the deterministic `randomVisual` run so step-by-step is reproducible.
 *
 * Example:
 *   const run = selectManualRun(useSimulatorStore.getState());
 *   if (run) console.log(run.steps[0]);
 */
export function selectManualRun(
  s: Pick<SimulatorState, 'results' | 'manualAlgorithm'>,
): RunResult | null {
  if (!s.results) return null;
  switch (s.manualAlgorithm) {
    case 'fifo':
      return s.results.fifo;
    case 'lru':
      return s.results.lru;
    case 'opt':
      return s.results.opt;
    case 'random':
      return s.results.randomVisual;
  }
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  ...initialState(),

  setFrames: (n) => {
    const clamped = Math.max(MIN_FRAMES, Math.floor(n));
    set({ frames: clamped, results: null, stepIndex: -1 });
  },

  setSequenceText: (text) => {
    try {
      const seq = parseSequence(text);
      set({
        sequenceText: text,
        sequence: seq,
        parseError: null,
        results: null,
        stepIndex: -1,
      });
    } catch (e) {
      if (e instanceof ParseError) {
        set({ sequenceText: text, parseError: e.message });
      } else {
        throw e;
      }
    }
  },

  setManualAlgorithm: (a) => {
    set({ manualAlgorithm: a });
  },

  run: () => {
    const { sequence, frames, parseError } = get();
    if (parseError !== null) return;
    if (sequence.length === 0) return;
    const results = runAll(sequence, frames);
    set({ results, stepIndex: -1 });
  },

  stepForward: () => {
    const s = get();
    const run = selectManualRun(s);
    if (!run) return;
    const limit = run.steps.length - 1;
    set({ stepIndex: Math.min(limit, s.stepIndex + 1) });
  },

  stepBack: () => {
    set((s) => ({ stepIndex: Math.max(-1, s.stepIndex - 1) }));
  },

  reset: () => {
    set(initialState());
  },

  setMaxChartFrames: (n) => {
    const clamped = Math.max(1, Math.min(MAX_CHART_FRAMES, Math.floor(n)));
    set({ maxChartFrames: clamped });
  },
}));
