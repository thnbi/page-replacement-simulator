import type { RunResult } from '../domain/types';
import { pageColor } from '../lib/colors';

type Props = {
  title: string;
  run: RunResult;
  frames: number;
  /**
   * If provided, only columns with index <= revealUpToStep are filled with data;
   * later columns are shown as empty placeholders. The column equal to
   * revealUpToStep is highlighted as the current step.
   * If omitted, the whole table is revealed (legacy / static view).
   */
  revealUpToStep?: number;
};

/**
 * Allocation table in the Maziero / Tanenbaum textbook format:
 * one column per reference in the sequence, one row per physical frame,
 * cells colored by page. The last row shows H (hit) or F (fault) per step.
 *
 * Supports progressive reveal via `revealUpToStep` so the table fills in
 * step-by-step alongside the walkthrough.
 */
export function TraceTable({ title, run, frames, revealUpToStep }: Props) {
  const steps = run.steps;
  const reveal = revealUpToStep ?? steps.length - 1;
  const faultsRevealed = steps.slice(0, Math.max(0, reveal + 1)).filter((s) => !s.hit).length;
  const frameRows: (number | null)[][] = Array.from({ length: frames }, (_, frameIdx) =>
    steps.map((step) => step.framesAfter[frameIdx] ?? null),
  );

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-base font-bold">
        {title}
        <span className="ml-2 text-sm font-normal text-slate-600">
          {faultsRevealed} / {run.faults} faults
        </span>
      </h3>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-right text-xs font-normal text-slate-500">ref</th>
              {steps.map((step, i) => {
                const current = i === reveal;
                const future = i > reveal;
                return (
                  <th
                    // biome-ignore lint/suspicious/noArrayIndexKey: sequence is fixed once parsed
                    key={i}
                    className={`border px-2 py-1 text-center font-mono ${
                      future
                        ? 'border-slate-200 bg-slate-50 text-slate-300'
                        : current
                          ? 'border-blue-500 bg-blue-100 font-bold text-blue-900 ring-2 ring-blue-400'
                          : 'border-slate-300 bg-slate-100'
                    }`}
                  >
                    {step.page}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {frameRows.map((row, frameIdx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: frame rows are positional
              <tr key={frameIdx}>
                <th className="px-2 py-1 text-right text-xs font-normal text-slate-500">
                  q{frameIdx + 1}
                </th>
                {row.map((page, stepIdx) => {
                  const future = stepIdx > reveal;
                  const current = stepIdx === reveal;
                  const cellClass = future
                    ? 'border-slate-200 bg-slate-50 text-slate-300'
                    : page === null
                      ? 'border-slate-300 bg-slate-50 text-slate-400'
                      : `border-slate-300 ${pageColor(page)}`;
                  const highlight = current && !future ? 'ring-2 ring-blue-400' : '';
                  return (
                    <td
                      // biome-ignore lint/suspicious/noArrayIndexKey: sequence steps are positional
                      key={stepIdx}
                      className={`border px-2 py-1 text-center font-mono ${cellClass} ${highlight}`}
                    >
                      {future ? '·' : page === null ? '—' : page}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className="px-2 py-1 text-right text-xs font-normal text-slate-500">h/f</th>
              {steps.map((step, i) => {
                const future = i > reveal;
                const current = i === reveal;
                const cellClass = future
                  ? 'border-slate-200 bg-slate-50 text-slate-300'
                  : step.hit
                    ? 'border-slate-300 bg-emerald-200 text-emerald-900'
                    : 'border-slate-300 bg-rose-200 text-rose-900';
                const highlight = current && !future ? 'ring-2 ring-blue-400' : '';
                return (
                  <td
                    // biome-ignore lint/suspicious/noArrayIndexKey: sequence steps are positional
                    key={i}
                    className={`border px-2 py-1 text-center font-bold ${cellClass} ${highlight}`}
                  >
                    {future ? '·' : step.hit ? 'H' : 'F'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
