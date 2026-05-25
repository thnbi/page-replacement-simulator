import { useEffect, useState } from 'react';
import { AutoResults } from './components/AutoResults';
import { ComparisonChart } from './components/ComparisonChart';
import { InputPanel } from './components/InputPanel';
import { ManualMode } from './components/ManualMode';
import { TraceCompare } from './components/TraceCompare';
import { useSimulatorStore } from './store/simulator';

const TABS = [
  {
    id: 'manual',
    n: 1,
    label: 'Passo-a-passo',
    hint: 'Acompanhe a memória a cada referência',
  },
  {
    id: 'trace',
    n: 2,
    label: 'Tabela completa',
    hint: 'Veja a alocação de todos os algoritmos lado a lado',
  },
  {
    id: 'auto',
    n: 3,
    label: 'Resultados',
    hint: 'Total de faltas por algoritmo',
  },
  {
    id: 'chart',
    n: 4,
    label: 'Curva de faltas',
    hint: 'Como o nº de quadros afeta as faltas',
  },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<TabId>('manual');
  const results = useSimulatorStore((s) => s.results);
  const run = useSimulatorStore((s) => s.run);

  // First-run UX: execute defaults so the user sees something immediately.
  useEffect(() => {
    if (results === null) run();
  }, [results, run]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <header className="mx-auto mb-6 max-w-6xl">
        <h1 className="text-3xl font-bold text-slate-900">Simulador de Substituição de Páginas</h1>
        <p className="mt-1 text-slate-600">
          Veja FIFO, LRU, OPT e RANDOM decidindo qual página remover quando a memória enche.
        </p>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <InputPanel />

        <div className="flex flex-wrap gap-1 border-b-2 border-slate-200" role="tablist">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                title={t.hint}
                className={`-mb-0.5 flex items-baseline gap-2 rounded-t-lg px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'border-b-4 border-blue-600 bg-white text-blue-700 shadow-sm'
                    : 'border-b-4 border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {t.n}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          {tab === 'manual' && <ManualMode />}
          {tab === 'trace' && <TraceCompare />}
          {tab === 'auto' && <AutoResults />}
          {tab === 'chart' && <ComparisonChart />}
        </section>
      </div>
    </main>
  );
}
