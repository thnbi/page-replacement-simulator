import { useSimulatorStore } from '../store/simulator';

export function InputPanel() {
  const frames = useSimulatorStore((s) => s.frames);
  const sequenceText = useSimulatorStore((s) => s.sequenceText);
  const parseError = useSimulatorStore((s) => s.parseError);
  const sequence = useSimulatorStore((s) => s.sequence);
  const setFrames = useSimulatorStore((s) => s.setFrames);
  const setSequenceText = useSimulatorStore((s) => s.setSequenceText);
  const run = useSimulatorStore((s) => s.run);
  const reset = useSimulatorStore((s) => s.reset);

  const canRun = parseError === null && sequence.length > 0;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-end gap-5">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-slate-700">Quadros</span>
          <input
            type="number"
            min={1}
            aria-label="Quadros"
            value={frames}
            onChange={(e) => setFrames(Number.parseInt(e.target.value, 10) || 1)}
            className="w-20 rounded border border-slate-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="text-xs text-slate-500">quantas páginas cabem na memória física</span>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-slate-700">Sequência de páginas</span>
          <input
            type="text"
            aria-label="Sequência"
            value={sequenceText}
            onChange={(e) => setSequenceText(e.target.value)}
            placeholder="ex: 7 0 1 2 0 3 0 4"
            className="rounded border border-slate-300 px-3 py-2 font-mono text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="text-xs text-slate-500">
            ordem em que o programa acessa páginas — separe por espaço ou vírgula
          </span>
        </label>

        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="rounded-md bg-blue-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          Executar
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100"
        >
          Resetar
        </button>
      </div>

      {parseError !== null && (
        <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {parseError}
        </p>
      )}
    </section>
  );
}
