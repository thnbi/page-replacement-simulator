import type { AllResults, RunResult } from '../domain/types';
import { ALGORITHM_COLOR, ALGORITHM_LABEL } from '../lib/colors';
import { useSimulatorStore } from '../store/simulator';

export function AutoResults() {
  const results = useSimulatorStore((s) => s.results);
  const stepIndex = useSimulatorStore((s) => s.stepIndex);

  if (results === null) {
    return <p className="text-slate-600">Clique em Executar para começar.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500">
        Os contadores acompanham o Passo-a-passo. Cada Avançar → soma um acesso em todas as 4
        cartas.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ResultCard
          label={ALGORITHM_LABEL.fifo}
          color={ALGORITHM_COLOR.fifo}
          run={results.fifo}
          stepIndex={stepIndex}
        />
        <ResultCard
          label={ALGORITHM_LABEL.lru}
          color={ALGORITHM_COLOR.lru}
          run={results.lru}
          stepIndex={stepIndex}
        />
        <ResultCard
          label={ALGORITHM_LABEL.opt}
          color={ALGORITHM_COLOR.opt}
          run={results.opt}
          stepIndex={stepIndex}
        />
        <RandomCard results={results} stepIndex={stepIndex} />
      </div>
    </div>
  );
}

type ResultCardProps = {
  label: string;
  color: string;
  run: RunResult;
  stepIndex: number;
};

function ResultCard({ label, color, run, stepIndex }: ResultCardProps) {
  const total = run.steps.length;
  const revealed = run.steps.slice(0, Math.max(0, stepIndex + 1));
  const stepsSoFar = revealed.length;
  const hitsSoFar = revealed.filter((s) => s.hit).length;
  const faultsSoFar = revealed.filter((s) => !s.hit).length;
  const pct = stepsSoFar === 0 ? 0 : Math.round((faultsSoFar / stepsSoFar) * 100);

  return (
    <div
      data-testid="result-card"
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-lg font-bold">{label}</h3>
      </div>
      <div className="flex items-baseline gap-1" style={{ color }}>
        <span className="text-4xl font-bold tabular-nums">{faultsSoFar}</span>
        <span className="text-sm font-normal text-slate-500">/ {run.faults} faults</span>
      </div>
      <table className="text-sm">
        <tbody>
          <tr>
            <td className="pr-3 text-slate-600">Steps</td>
            <td className="font-mono tabular-nums">
              {stepsSoFar}
              <span className="text-slate-400"> / {total}</span>
            </td>
          </tr>
          <tr>
            <td className="pr-3 text-slate-600">Hits</td>
            <td className="font-mono tabular-nums">{hitsSoFar}</td>
          </tr>
          <tr>
            <td className="pr-3 text-slate-600">Faults</td>
            <td className="font-mono tabular-nums">{faultsSoFar}</td>
          </tr>
          <tr>
            <td className="pr-3 text-slate-600">Fault rate</td>
            <td className="font-mono tabular-nums">{pct}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function RandomCard({ results, stepIndex }: { results: AllResults; stepIndex: number }) {
  const color = ALGORITHM_COLOR.random;
  const sigma = results.randomStdev.toFixed(2);
  const revealed = results.randomVisual.steps.slice(0, Math.max(0, stepIndex + 1));
  const faultsSoFar = revealed.filter((s) => !s.hit).length;
  const finished = stepIndex >= results.randomVisual.steps.length - 1;

  return (
    <div
      data-testid="result-card"
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-lg font-bold">{ALGORITHM_LABEL.random}</h3>
      </div>
      <div className="flex items-baseline gap-1" style={{ color }}>
        <span className="text-4xl font-bold tabular-nums">{faultsSoFar}</span>
        <span className="text-sm font-normal text-slate-500">
          / {results.randomVisual.faults} faults (seed fixa)
        </span>
      </div>
      <p className="text-sm text-slate-700">
        {finished ? (
          <>
            Média final de 30 execuções: <strong>{results.randomMean}</strong> (σ ≈ {sigma})
          </>
        ) : (
          <>
            média de 30 execuções: <strong>{results.randomMean}</strong> (σ ≈ {sigma})
          </>
        )}
      </p>
    </div>
  );
}
