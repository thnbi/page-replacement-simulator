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
    <section className="flex flex-col gap-3 rounded-lg border border-surface-300 bg-surface-100 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Quadros</span>
          <input
            type="number"
            min={1}
            aria-label="Quadros"
            value={frames}
            onChange={(e) => setFrames(Number.parseInt(e.target.value, 10) || 1)}
            className="w-20 rounded border border-surface-300 px-2 py-1"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Sequência de páginas</span>
          <input
            type="text"
            aria-label="Sequência"
            value={sequenceText}
            onChange={(e) => setSequenceText(e.target.value)}
            placeholder="ex: 7 0 1 2 0 3 0 4"
            className="rounded border border-surface-300 px-2 py-1 font-mono"
          />
        </label>

        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="rounded bg-primary-500 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Executar
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded border border-surface-400 px-4 py-2 font-medium"
        >
          Resetar
        </button>
      </div>

      {parseError !== null && <p className="text-sm text-rose-600">{parseError}</p>}
    </section>
  );
}
