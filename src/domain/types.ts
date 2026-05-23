export type PageNumber = number;
export type FrameIndex = number;
export type StepIndex = number;
export type Algorithm = 'fifo' | 'lru' | 'opt' | 'random';

export const EMPTY_SLOT = null;
export type FrameSlot = PageNumber | null;

export type Step = {
  page: PageNumber;
  hit: boolean;
  framesAfter: FrameSlot[];
  queueAfter?: PageNumber[];
  victim?: PageNumber;
};

export type RunResult = {
  steps: Step[];
  faults: number;
};

export type AllResults = {
  fifo: RunResult;
  lru: RunResult;
  opt: RunResult;
  randomVisual: RunResult;
  randomMean: number;
  randomStdev: number;
};

export const DEFAULT_FRAMES = 3;
export const MIN_FRAMES = 1;
export const DEFAULT_CHART_MAX = 10;
export const MAX_CHART_FRAMES = 20;
export const RANDOM_SAMPLES = 30;
export const RANDOM_SEED_BASE = 0xc0ffee;
