import type {
  Algorithm,
  FrameSlot,
  PageNumber,
  RunResult,
} from '../domain/types';
import { ALGORITHM_LABEL, pageColor } from '../lib/colors';
import { selectManualRun, useSimulatorStore } from '../store/simulator';
import { HitMissBadge } from './HitMissBadge';
import { MemoryView } from './MemoryView';

const ALGORITHMS: Algorithm[] = ['fifo', 'lru', 'opt', 'random'];

export function ManualMode() {
  const results = useSimulatorStore((s) => s.results);
  const stepIndex = useSimulatorStore((s) => s.stepIndex);
  const frames = useSimulatorStore((s) => s.frames);
  const sequence = useSimulatorStore((s) => s.sequence);
  const manualAlgorithm = useSimulatorStore((s) => s.manualAlgorithm);
  const setAlgorithm = useSimulatorStore((s) => s.setManualAlgorithm);
  const stepForward = useSimulatorStore((s) => s.stepForward);
  const stepBack = useSimulatorStore((s) => s.stepBack);
  const run = useSimulatorStore(selectManualRun);

  return (
    <div className="flex flex-col gap-4">
      <fieldset
        className="flex flex-wrap items-center gap-2"
        aria-label="Algoritmo"
      >
        <legend className="text-sm font-medium text-surface-700">
          Algoritmo:
        </legend>
        {ALGORITHMS.map((a) => (
          <label key={a} className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              name="manual-algorithm"
              value={a}
              checked={manualAlgorithm === a}
              onChange={() => setAlgorithm(a)}
            />
            {ALGORITHM_LABEL[a]}
          </label>
        ))}
      </fieldset>

      {results === null || run === null ? (
        <p className="text-surface-600">Clique em Executar para começar.</p>
      ) : (
        <ManualBody
          run={run}
          manualAlgorithm={manualAlgorithm}
          stepIndex={stepIndex}
          frames={frames}
          sequence={sequence}
          stepForward={stepForward}
          stepBack={stepBack}
        />
      )}
    </div>
  );
}

type BodyProps = {
  run: RunResult;
  manualAlgorithm: Algorithm;
  stepIndex: number;
  frames: number;
  sequence: PageNumber[];
  stepForward: () => void;
  stepBack: () => void;
};

function ManualBody({
  run,
  manualAlgorithm,
  stepIndex,
  frames,
  sequence,
  stepForward,
  stepBack,
}: BodyProps) {
  const steps = run.steps;
  const step = stepIndex >= 0 ? steps[stepIndex] : null;
  const currentFrames: FrameSlot[] =
    step?.framesAfter ?? new Array(frames).fill(null);
  const victimIndex =
    step?.victim !== undefined
      ? step.framesAfter.indexOf(step.page)
      : undefined;
  const faultsSoFar = steps
    .slice(0, Math.max(0, stepIndex + 1))
    .filter((s) => !s.hit).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-sm text-surface-600">Sequência:</span>
        {sequence.map((p, i) => {
          const active = i === stepIndex;
          return (
            <span
              key={i}
              className={`rounded px-2 py-1 text-sm font-mono ${
                active
                  ? `${pageColor(p)} ring-2 ring-primary-700`
                  : 'bg-surface-200'
              }`}
            >
              {p}
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={stepBack}
          disabled={stepIndex <= -1}
          className="rounded border border-surface-400 px-3 py-1 disabled:opacity-50"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={stepForward}
          disabled={stepIndex >= steps.length - 1}
          className="rounded bg-primary-500 px-3 py-1 text-white disabled:opacity-50"
        >
          Avançar →
        </button>
        <span className="text-sm text-surface-600">
          passo {Math.max(0, stepIndex + 1)} / {steps.length}
        </span>
        <span className="text-sm text-surface-700">
          · faltas até aqui: {faultsSoFar} / {run.faults} (total)
        </span>
      </div>

      <div className="flex gap-6">
        <div>
          <h3 className="mb-2 text-sm font-medium">Memória</h3>
          <MemoryView frames={currentFrames} victimIndex={victimIndex} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Status</h3>
          {step === null ? (
            <p className="text-surface-500">— ainda não começou —</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-sm text-surface-600">Página: </span>
                <span
                  className={`rounded px-2 py-1 font-bold ${pageColor(step.page)}`}
                >
                  {step.page}
                </span>
              </div>
              <HitMissBadge hit={step.hit} />
              {step.victim !== undefined && (
                <p className="text-sm text-surface-700">
                  Vítima removida:{' '}
                  <span
                    className={`rounded px-2 py-0.5 font-bold ${pageColor(step.victim)}`}
                  >
                    {step.victim}
                  </span>
                </p>
              )}
              {manualAlgorithm === 'fifo' && step.queueAfter !== undefined && (
                <div>
                  <span className="text-sm text-surface-600">Fila FIFO: </span>
                  <span className="font-mono">
                    [{step.queueAfter.join(', ')}]
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
