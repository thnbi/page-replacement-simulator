export type PageNumber = number;
export type FrameIndex = number;
export type StepIndex = number;
export type Algorithm = 'fifo' | 'lru' | 'opt' | 'random';

export const EMPTY_SLOT = null;
export type FrameSlot = PageNumber | null;

export type Step = {
  pagina: PageNumber;
  hit: boolean;
  quadrosDepois: FrameSlot[];
  filaDepois?: PageNumber[];
  vitima?: PageNumber;
};

export type RunResult = {
  passos: Step[];
  faltas: number;
};

export type AllResults = {
  fifo: RunResult;
  lru: RunResult;
  opt: RunResult;
  randomVisual: RunResult;
  randomMedia: number;
  randomDesvio: number;
};

export const DEFAULT_FRAMES = 3;
export const MIN_FRAMES = 1;
export const DEFAULT_GRAFICO_MAX = 10;
export const MAX_GRAFICO = 20;
export const RANDOM_AMOSTRAS = 30;
export const RANDOM_SEED_BASE = 0xc0ffee;
