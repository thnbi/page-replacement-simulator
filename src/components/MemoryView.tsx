import { motion } from 'motion/react';
import type { FrameSlot } from '../domain/types';
import { pageColor } from '../lib/colors';

type Props = {
  frames: FrameSlot[];
  victimIndex?: number;
};

export function MemoryView({ frames, victimIndex }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {frames.map((page, idx) => {
        const isVictim = idx === victimIndex;
        const content =
          page === null ? (
            <span className="text-surface-400">—</span>
          ) : (
            <span className={`rounded px-3 py-1 font-bold ${pageColor(page)}`}>{page}</span>
          );
        return (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: physical frame slots are positional and never reorder
            key={idx}
            data-testid="memory-slot"
            data-victim={isVictim ? 'true' : 'false'}
            animate={isVictim ? { scale: [1, 1.1, 1, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex h-12 w-20 items-center justify-center rounded border border-surface-300 bg-surface-50"
          >
            {content}
          </motion.div>
        );
      })}
    </div>
  );
}
