import { useEffect, useState } from 'react';
import type { Algorithm, FrameSlot, PageNumber, RunResult } from '../domain/types';
import { ALGORITHM_LABEL, pageColor } from '../lib/colors';
import { selectManualRun, useSimulatorStore } from '../store/simulator';
import { DecisionPanel } from './DecisionPanel';
import { MemoryView } from './MemoryView';
import { TraceTable } from './TraceTable';

const ALGORITHMS: Algorithm[] = ['fifo', 'lru', 'opt', 'random'];
const PLAY_INTERVAL_MS = 900;

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
    <div className="flex flex-col gap-5">
      <AlgorithmSelector value={manualAlgorithm} onChange={setAlgorithm} />

      {results === null || run === null ? (
        <p className="text-slate-600">Clique em Executar para começar.</p>
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

function AlgorithmSelector({
  value,
  onChange,
}: {
  value: Algorithm;
  onChange: (a: Algorithm) => void;
}) {
  return (
    <fieldset aria-label="Algoritmo">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Algoritmo
      </legend>
      <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
        {ALGORITHMS.map((a) => {
          const active = value === a;
          return (
            <label
              key={a}
              className={`relative cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="manual-algorithm"
                value={a}
                checked={active}
                onChange={() => onChange(a)}
                className="sr-only"
              />
              {ALGORITHM_LABEL[a]}
            </label>
          );
        })}
      </div>
    </fieldset>
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
  const currentFrames: FrameSlot[] = step?.framesAfter ?? new Array(frames).fill(null);
  const framesBefore: FrameSlot[] =
    stepIndex > 0
      ? (steps[stepIndex - 1]?.framesAfter ?? new Array(frames).fill(null))
      : new Array(frames).fill(null);
  const victimIndex = step?.victim !== undefined ? step.framesAfter.indexOf(step.page) : undefined;
  const faultsSoFar = steps.slice(0, Math.max(0, stepIndex + 1)).filter((s) => !s.hit).length;
  const totalSteps = steps.length;
  const atEnd = stepIndex >= totalSteps - 1;

  return (
    <>
      <ProgressStrip
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        faultsSoFar={faultsSoFar}
        totalFaults={run.faults}
      />

      <SequenceStrip sequence={sequence} steps={steps} stepIndex={stepIndex} />

      <Controls stepIndex={stepIndex} atEnd={atEnd} stepBack={stepBack} stepForward={stepForward} />

      <div className="grid gap-5 lg:grid-cols-[auto,1fr]">
        <section aria-labelledby="memory-heading">
          <h3
            id="memory-heading"
            className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Memória
          </h3>
          <MemoryView frames={currentFrames} victimIndex={victimIndex} />
        </section>

        <section className="flex flex-col gap-4">
          {step != null ? (
            <DecisionPanel
              algorithm={manualAlgorithm}
              step={step}
              framesBefore={framesBefore}
              sequence={sequence}
              stepIndex={stepIndex}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              Clique em <strong>Avançar →</strong> ou <strong>▶ Tocar</strong> para ver o primeiro
              acesso à memória.
            </p>
          )}
        </section>
      </div>

      <section aria-labelledby="trace-heading" className="flex flex-col gap-3">
        <div>
          <h3
            id="trace-heading"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Tabela de alocação · {ALGORITHM_LABEL[manualAlgorithm]}
          </h3>
          <p className="text-xs text-slate-500">
            A tabela vai se preenchendo a cada passo. A coluna em destaque é o passo atual.
          </p>
        </div>
        <TraceTable
          title={ALGORITHM_LABEL[manualAlgorithm]}
          run={run}
          frames={frames}
          revealUpToStep={stepIndex}
        />
      </section>
    </>
  );
}

function ProgressStrip({
  stepIndex,
  totalSteps,
  faultsSoFar,
  totalFaults,
}: {
  stepIndex: number;
  totalSteps: number;
  faultsSoFar: number;
  totalFaults: number;
}) {
  const pct = totalSteps === 0 ? 0 : (Math.max(0, stepIndex + 1) / totalSteps) * 100;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">
          Passo {Math.max(0, stepIndex + 1)} de {totalSteps}
        </span>
        <span className="text-slate-600">
          {`${faultsSoFar} faults até aqui · ${totalFaults} no total`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SequenceStrip({
  sequence,
  steps,
  stepIndex,
}: {
  sequence: PageNumber[];
  steps: RunResult['steps'];
  stepIndex: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Sequência de referências
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {sequence.map((p, i) => {
          const past = i < stepIndex;
          const active = i === stepIndex;
          const future = i > stepIndex;
          const wasHit = steps[i]?.hit ?? false;
          const base =
            'flex h-10 w-10 items-center justify-center rounded-md font-mono text-base font-bold transition-all';
          const colors = active
            ? `${pageColor(p)} scale-110 ring-4 ring-blue-500 shadow-lg`
            : past
              ? wasHit
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-rose-100 text-rose-900'
              : 'bg-slate-100 text-slate-500';
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: sequence is fixed once parsed
              key={i}
              className={`${base} ${colors}`}
              aria-current={active ? 'true' : undefined}
              title={future ? '(ainda não processado)' : wasHit ? 'HIT' : 'FALTA'}
            >
              {p}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Controls({
  stepIndex,
  atEnd,
  stepBack,
  stepForward,
}: {
  stepIndex: number;
  atEnd: boolean;
  stepBack: () => void;
  stepForward: () => void;
}) {
  const [playing, setPlaying] = usePlay(atEnd, stepForward);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={stepBack}
        disabled={stepIndex <= -1 || playing}
        className="rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
      >
        ← Voltar
      </button>
      <button
        type="button"
        onClick={() => setPlaying(!playing)}
        disabled={atEnd && !playing}
        className={`rounded-md px-4 py-2 font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none ${
          playing
            ? 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
        }`}
      >
        {playing ? '⏸ Pausar' : '▶ Tocar'}
      </button>
      <button
        type="button"
        onClick={stepForward}
        disabled={atEnd || playing}
        className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
      >
        Avançar →
      </button>
    </div>
  );
}

/**
 * Auto-advance timer. Stops when reaching the end of the sequence.
 */
function usePlay(atEnd: boolean, stepForward: () => void): [boolean, (next: boolean) => void] {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const id = window.setInterval(stepForward, PLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, atEnd, stepForward]);

  return [playing, setPlaying];
}
