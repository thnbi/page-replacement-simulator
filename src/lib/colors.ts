import type { Algorithm, PageNumber } from '../domain/types';

const PAGE_PALETTE = [
  'bg-sky-400 text-white',
  'bg-emerald-400 text-white',
  'bg-amber-400 text-black',
  'bg-rose-400 text-white',
  'bg-violet-400 text-white',
  'bg-cyan-400 text-black',
  'bg-orange-400 text-white',
  'bg-lime-400 text-black',
  'bg-pink-400 text-white',
  'bg-indigo-400 text-white',
  'bg-teal-400 text-white',
  'bg-yellow-400 text-black',
] as const;

export function pageColor(p: PageNumber): string {
  const idx = ((p % PAGE_PALETTE.length) + PAGE_PALETTE.length) % PAGE_PALETTE.length;
  return PAGE_PALETTE[idx] ?? PAGE_PALETTE[0];
}

export const ALGORITHM_COLOR: Record<Algorithm, string> = {
  fifo: '#3b82f6',
  lru: '#10b981',
  opt: '#f59e0b',
  random: '#ef4444',
};

export const ALGORITHM_LABEL: Record<Algorithm, string> = {
  fifo: 'FIFO',
  lru: 'LRU',
  opt: 'OPT',
  random: 'RANDOM',
};
