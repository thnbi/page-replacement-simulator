import { ALGORITHM_LABEL } from '../lib/colors';
import { useSimulatorStore } from '../store/simulator';
import { TraceTable } from './TraceTable';

type Props = {
  /**
   * If provided, all four tables only reveal data up to this step.
   * If omitted, all tables show the full run.
   */
  revealUpToStep?: number;
};

export function TraceCompare({ revealUpToStep }: Props) {
  const results = useSimulatorStore((s) => s.results);
  const frames = useSimulatorStore((s) => s.frames);

  if (results === null) {
    return <p className="text-slate-600">Clique em Executar para começar.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <TraceTable
        title={ALGORITHM_LABEL.fifo}
        run={results.fifo}
        frames={frames}
        revealUpToStep={revealUpToStep}
      />
      <TraceTable
        title={ALGORITHM_LABEL.lru}
        run={results.lru}
        frames={frames}
        revealUpToStep={revealUpToStep}
      />
      <TraceTable
        title={ALGORITHM_LABEL.opt}
        run={results.opt}
        frames={frames}
        revealUpToStep={revealUpToStep}
      />
      <TraceTable
        title={`${ALGORITHM_LABEL.random} (seed determinística)`}
        run={results.randomVisual}
        frames={frames}
        revealUpToStep={revealUpToStep}
      />
    </div>
  );
}
