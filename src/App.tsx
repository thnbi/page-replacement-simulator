import { useState } from 'react';
import { AutoResults } from './components/AutoResults';
import { ComparisonChart } from './components/ComparisonChart';
import { InputPanel } from './components/InputPanel';
import { ManualMode } from './components/ManualMode';

const TABS = [
  { id: 'manual', label: 'Manual' },
  { id: 'auto', label: 'Automático' },
  { id: 'chart', label: 'Gráfico' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function App() {
  const [tab, setTab] = useState<TabId>('manual');

  return (
    <main className="min-h-screen bg-surface-50 p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-primary-700">
          Simulador de Substituição de Páginas
        </h1>
        <p className="mt-1 text-surface-600">
          FIFO, LRU, OPT e RANDOM — modo manual, automático e gráfico.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <InputPanel />

        <nav className="flex gap-1 border-b border-surface-300" role="tablist">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`rounded-t px-4 py-2 text-sm font-medium ${
                  active
                    ? 'border-b-2 border-primary-500 bg-surface-100 text-primary-700'
                    : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        <section className="rounded-lg bg-surface-50 p-4">
          {tab === 'manual' && <ManualMode />}
          {tab === 'auto' && <AutoResults />}
          {tab === 'chart' && <ComparisonChart />}
        </section>
      </div>
    </main>
  );
}
