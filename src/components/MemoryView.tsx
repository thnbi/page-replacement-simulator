import { motion } from 'motion/react';
import type { FrameSlot } from '../domain/types';
import { pageColor } from '../lib/colors';

type Props = {
  frames: FrameSlot[];
  victimIndex?: number;
};

export function MemoryView({ frames, victimIndex }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {frames.map((page, idx) => {
        const isVictim = idx === victimIndex;
        const baseClasses =
          'flex h-16 w-28 items-center justify-center rounded-lg text-2xl font-bold transition-all';
        const cellClasses =
          page === null
            ? `${baseClasses} border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400`
            : `${baseClasses} border-2 border-transparent shadow-md ${pageColor(page)}`;
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: physical frame slots are positional and never reorder
            key={idx}
            className="flex items-center gap-2"
          >
            <span className="w-8 text-right text-xs font-semibold text-slate-500">q{idx + 1}</span>
            <motion.div
              // biome-ignore lint/suspicious/noArrayIndexKey: physical frame slots are positional and never reorder
              key={`${idx}-${page}`}
              data-testid="memory-slot"
              data-victim={isVictim ? 'true' : 'false'}
              initial={page === null ? false : { scale: 0.7, opacity: 0 }}
              animate={
                isVictim ? { scale: [1, 1.15, 1, 1.15, 1], opacity: 1 } : { scale: 1, opacity: 1 }
              }
              transition={{ duration: isVictim ? 0.7 : 0.25 }}
              className={cellClasses}
            >
              {page === null ? <span className="text-base">vazio</span> : page}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
