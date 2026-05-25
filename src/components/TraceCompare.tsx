import { ALGORITHM_LABEL } from '../lib/colors';
import { useSimulatorStore } from '../store/simulator';
import { TraceTable } from './TraceTable';

export function TraceCompare() {
  const results = useSimulatorStore((s) => s.results);
  const frames = useSimulatorStore((s) => s.frames);

  if (results === null) {
    return <p className="text-surface-600">Clique em Executar para começar.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <TraceTable title={ALGORITHM_LABEL.fifo} run={results.fifo} frames={frames} />
      <TraceTable title={ALGORITHM_LABEL.lru} run={results.lru} frames={frames} />
      <TraceTable title={ALGORITHM_LABEL.opt} run={results.opt} frames={frames} />
      <TraceTable
        title={`${ALGORITHM_LABEL.random} (seed determinística)`}
        run={results.randomVisual}
        frames={frames}
      />
    </div>
  );
}
