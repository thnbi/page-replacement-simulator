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
  const maxChartFrames = useSimulatorStore((s) => s.maxChartFrames);
  const setMaxChartFrames = useSimulatorStore((s) => s.setMaxChartFrames);

  const points: Point[] = useMemo(() => {
    if (sequence.length === 0) return [];
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
  }, [sequence, maxChartFrames]);

  if (sequence.length === 0) {
    return (
      <p className="text-surface-600">
        Informe uma sequência de páginas válida para gerar o gráfico.
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

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="frames"
              label={{ value: 'Nº de quadros', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
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
