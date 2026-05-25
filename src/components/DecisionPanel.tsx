import type { Algorithm, FrameSlot, PageNumber, Step } from '../domain/types';
import { lruRecency, optFutureUse } from '../lib/algorithmState';
import { pageColor } from '../lib/colors';

type Props = {
  algorithm: Algorithm;
  step: Step;
  framesBefore: FrameSlot[];
  sequence: PageNumber[];
  stepIndex: number;
};

/**
 * Plain-language explanation of what the algorithm did this step.
 * Goal is to make the *decision* visible, not just the resulting state.
 */
export function DecisionPanel({ algorithm, step, framesBefore, sequence, stepIndex }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        O que aconteceu
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-base">
        <span className="text-slate-600">Página</span>
        <Chip page={step.page} />
        <span className="text-slate-600">chegou →</span>
        {step.hit ? (
          <span className="rounded-md bg-emerald-100 px-3 py-1 font-bold text-emerald-800">
            HIT
          </span>
        ) : step.victim !== undefined ? (
          <>
            <span className="rounded-md bg-rose-100 px-3 py-1 font-bold text-rose-800">FAULT</span>
            <span className="text-slate-600">→ remove</span>
            <Chip page={step.victim} struck />
            <span className="text-slate-600">e coloca</span>
            <Chip page={step.page} />
          </>
        ) : (
          <>
            <span className="rounded-md bg-rose-100 px-3 py-1 font-bold text-rose-800">FAULT</span>
            <span className="text-slate-600">→ usa um slot vazio</span>
          </>
        )}
      </div>
      <p className="text-sm leading-relaxed text-slate-700">
        <ReasoningSentence
          algorithm={algorithm}
          step={step}
          framesBefore={framesBefore}
          sequence={sequence}
          stepIndex={stepIndex}
        />
      </p>
    </div>
  );
}

function Chip({ page, struck }: { page: PageNumber; struck?: boolean }) {
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded font-bold shadow-sm ${pageColor(page)} ${
        struck ? 'opacity-60 line-through decoration-2' : ''
      }`}
    >
      {page}
    </span>
  );
}

function ReasoningSentence({ algorithm, step, framesBefore, sequence, stepIndex }: Props) {
  if (step.hit) {
    return (
      <>
        A página <strong>{step.page}</strong> já estava na memória, então o acesso é instantâneo e
        nenhuma substituição acontece.
      </>
    );
  }

  if (step.victim === undefined) {
    return (
      <>
        Havia espaço livre, então a página <strong>{step.page}</strong> ocupou um slot vazio sem
        precisar remover ninguém.
      </>
    );
  }

  switch (algorithm) {
    case 'fifo': {
      const queueAfter = step.queueAfter ?? [];
      const queueBefore = [step.victim, ...queueAfter.slice(0, -1)];
      return (
        <>
          <strong>FIFO</strong> mantém uma fila de chegada. Antes deste passo a fila era{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">{formatList(queueBefore)}</code>.
          O primeiro é o que está há mais tempo na memória → <strong>{step.victim}</strong> sai.
        </>
      );
    }
    case 'lru': {
      const recencyBefore = lruRecency(sequence, stepIndex - 1, framesBefore);
      return (
        <>
          <strong>LRU</strong> remove a página menos recentemente usada. Ordem de uso antes deste
          passo (do mais antigo ao mais recente):{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            {formatList(recencyBefore)}
          </code>
          . O primeiro da lista vai embora → <strong>{step.victim}</strong>.
        </>
      );
    }
    case 'opt': {
      const future = optFutureUse(sequence, stepIndex, framesBefore);
      const pairs = Array.from(future.entries()).map(([p, idx]) => {
        const label = idx === Number.POSITIVE_INFINITY ? '∞' : `pos ${idx}`;
        return `${p}→${label}`;
      });
      return (
        <>
          <strong>OPT</strong> remove a página cujo próximo uso é o mais distante. Próximos usos:{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">{pairs.join(', ')}</code>. A
          página <strong>{step.victim}</strong> tem o uso mais distante (ou nenhum) → sai.
        </>
      );
    }
    case 'random':
      return (
        <>
          <strong>RANDOM</strong> sorteia um slot uniformemente. Este sorteio escolheu o slot que
          continha <strong>{step.victim}</strong>.
        </>
      );
  }
}

function formatList(pages: PageNumber[]): string {
  return pages.length === 0 ? '[]' : `[${pages.join(' → ')}]`;
}
