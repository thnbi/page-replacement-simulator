import type { AllResults, RunResult } from '../domain/types';
import { ALGORITHM_COLOR, ALGORITHM_LABEL } from '../lib/colors';
import { useSimulatorStore } from '../store/simulator';

export function AutoResults() {
  const results = useSimulatorStore((s) => s.results);
  if (results === null) {
    return <p className="text-surface-600">Clique em Executar para começar.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <ResultCard label={ALGORITHM_LABEL.fifo} color={ALGORITHM_COLOR.fifo} run={results.fifo} />
      <ResultCard label={ALGORITHM_LABEL.lru} color={ALGORITHM_COLOR.lru} run={results.lru} />
      <ResultCard label={ALGORITHM_LABEL.opt} color={ALGORITHM_COLOR.opt} run={results.opt} />
      <RandomCard results={results} />
    </div>
  );
}

type ResultCardProps = {
  label: string;
  color: string;
  run: RunResult;
};

function ResultCard({ label, color, run }: ResultCardProps) {
  const total = run.steps.length;
  const hits = run.steps.filter((s) => s.hit).length;
  const pct = total === 0 ? 0 : Math.round((run.faults / total) * 100);
  return (
    <div
      data-testid="result-card"
      className="flex flex-col gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4"
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-lg font-bold">{label}</h3>
      </div>
      <div className="text-4xl font-bold" style={{ color }}>
        {run.faults}
        <span className="ml-1 text-sm font-normal text-surface-600">faults</span>
      </div>
      <table className="text-sm">
        <tbody>
          <tr>
            <td className="pr-3 text-surface-600">Steps</td>
            <td className="font-mono">{total}</td>
          </tr>
          <tr>
            <td className="pr-3 text-surface-600">Hits</td>
            <td className="font-mono">{hits}</td>
          </tr>
          <tr>
            <td className="pr-3 text-surface-600">Faults</td>
            <td className="font-mono">{run.faults}</td>
          </tr>
          <tr>
            <td className="pr-3 text-surface-600">Fault rate</td>
            <td className="font-mono">{pct}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RandomCard({ results }: { results: AllResults }) {
  const color = ALGORITHM_COLOR.random;
  const sigma = results.randomStdev.toFixed(2);
  return (
    <div
      data-testid="result-card"
      className="flex flex-col gap-3 rounded-lg border border-surface-300 bg-surface-50 p-4"
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-lg font-bold">{ALGORITHM_LABEL.random}</h3>
      </div>
      <div className="text-4xl font-bold" style={{ color }}>
        {results.randomMean}
        <span className="ml-1 text-sm font-normal text-surface-600">faults (média)</span>
      </div>
      <p className="text-sm text-surface-700">média de 30 execuções, σ ≈ {sigma}</p>
    </div>
  );
}
