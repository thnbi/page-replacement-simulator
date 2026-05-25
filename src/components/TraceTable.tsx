import type { RunResult } from '../domain/types';
import { pageColor } from '../lib/colors';

type Props = {
  title: string;
  run: RunResult;
  frames: number;
};

/**
 * Static allocation table in the Maziero / Tanenbaum textbook format:
 * one column per reference in the sequence, one row per physical frame,
 * cells colored by page. The last row shows H (hit) or F (fault) per step.
 */
export function TraceTable({ title, run, frames }: Props) {
  const steps = run.steps;
  const frameRows: (number | null)[][] = Array.from({ length: frames }, (_, frameIdx) =>
    steps.map((step) => step.framesAfter[frameIdx] ?? null),
  );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-lg font-bold">
        {title} · {run.faults} faults
      </h3>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-right text-xs font-normal text-surface-600">ref</th>
              {steps.map((step, i) => (
                <th
                  // biome-ignore lint/suspicious/noArrayIndexKey: sequence is fixed once parsed
                  key={i}
                  className="border border-surface-300 bg-surface-100 px-2 py-1 text-center font-mono"
                >
                  {step.page}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {frameRows.map((row, frameIdx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: frame rows are positional
              <tr key={frameIdx}>
                <th className="px-2 py-1 text-right text-xs font-normal text-surface-600">
                  q{frameIdx + 1}
                </th>
                {row.map((page, stepIdx) => (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: sequence steps are positional
                    key={stepIdx}
                    className={`border border-surface-300 px-2 py-1 text-center font-mono ${
                      page === null ? 'bg-surface-50 text-surface-400' : pageColor(page)
                    }`}
                  >
                    {page === null ? '—' : page}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="px-2 py-1 text-right text-xs font-normal text-surface-600">h/f</th>
              {steps.map((step, i) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: sequence steps are positional
                  key={i}
                  className={`border border-surface-300 px-2 py-1 text-center font-bold ${
                    step.hit ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {step.hit ? 'H' : 'F'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
