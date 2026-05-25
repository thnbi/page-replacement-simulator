import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { runAll } from '../domain/runAll';
import { MAX_CHART_FRAMES } from '../domain/types';
import { ALGORITHM_COLOR, ALGORITHM_LABEL } from '../lib/colors';
import { useSimulatorStore } from '../store/simulator';

type Point = {
  frames: number;
  FIFO: number;
  LRU: number;
  OPT: number;
  RANDOM: number;
};

export function ComparisonChart() {
  const sequence = useSimulatorStore((s) => s.sequence);
  const results = useSimulatorStore((s) => s.results);
  const stepIndex = useSimulatorStore((s) => s.stepIndex);
  const maxChartFrames = useSimulatorStore((s) => s.maxChartFrames);
  const setMaxChartFrames = useSimulatorStore((s) => s.setMaxChartFrames);

  const allPoints: Point[] = useMemo(() => {
    if (results === null || sequence.length === 0) return [];
    const ps: Point[] = [];
    for (let k = 1; k <= maxChartFrames; k++) {
      const r = runAll(sequence, k);
      ps.push({
        frames: k,
        FIFO: r.fifo.faults,
        LRU: r.lru.faults,
        OPT: r.opt.faults,
        RANDOM: r.randomMean,
      });
    }
    return ps;
  }, [results, sequence, maxChartFrames]);

  // The chart reveals one X value (frame count) per step advanced in the
  // Passo-a-passo, same idea as the trace tables filling column by column.
  const revealedCount = Math.max(0, Math.min(stepIndex + 1, maxChartFrames));
  const visiblePoints = allPoints.slice(0, revealedCount);
  // Keep the axes fixed at the full chart extent so the visual scale doesn't
  // shrink as the curve fills in.
  const yMax = allPoints.reduce((acc, p) => Math.max(acc, p.FIFO, p.LRU, p.OPT, p.RANDOM), 0);

  if (results === null) {
    return (
      <p className="text-slate-600">
        Clique em <strong>Executar</strong> para gerar a curva de faltas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-3">
        <span className="text-sm font-medium">Quadros máximo</span>
        <input
          aria-label="Quadros máximo"
          type="range"
          min={1}
          max={MAX_CHART_FRAMES}
          value={maxChartFrames}
          onChange={(e) => setMaxChartFrames(Number.parseInt(e.target.value, 10))}
        />
        <span className="font-mono text-sm">{maxChartFrames}</span>
      </label>

      <p className="text-xs text-slate-500">
        A curva vai se preenchendo a cada passo do Passo-a-passo. Atualmente:{' '}
        <strong>
          {revealedCount} / {allPoints.length}
        </strong>{' '}
        valores de quadros revelados.
      </p>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visiblePoints} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="frames"
              type="number"
              domain={[1, maxChartFrames]}
              allowDecimals={false}
              ticks={Array.from({ length: maxChartFrames }, (_, i) => i + 1)}
              label={{ value: 'Nº de quadros', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              domain={[0, yMax || 1]}
              label={{ value: 'Page faults', angle: -90, position: 'insideLeft' }}
              allowDecimals={false}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="FIFO"
              stroke={ALGORITHM_COLOR.fifo}
              strokeWidth={2}
              dot
              name={ALGORITHM_LABEL.fifo}
            />
            <Line
              type="monotone"
              dataKey="LRU"
              stroke={ALGORITHM_COLOR.lru}
              strokeWidth={2}
              dot
              name={ALGORITHM_LABEL.lru}
            />
            <Line
              type="monotone"
              dataKey="OPT"
              stroke={ALGORITHM_COLOR.opt}
              strokeWidth={2}
              dot
              name={ALGORITHM_LABEL.opt}
            />
            <Line
              type="monotone"
              dataKey="RANDOM"
              stroke={ALGORITHM_COLOR.random}
              strokeWidth={2}
              dot
              name={ALGORITHM_LABEL.random}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
