import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { TraceCompare } from './TraceCompare';

describe('TraceCompare', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('shows placeholder before run', () => {
    render(<TraceCompare />);
    expect(screen.getByText(/Clique em Executar/i)).toBeInTheDocument();
  });

  it('renders one table per algorithm after run', () => {
    useSimulatorStore.getState().run();
    render(<TraceCompare />);
    const headings = screen.getAllByRole('heading', { level: 3 });
    const titles = headings.map((h) => h.textContent);
    expect(titles.some((t) => t?.startsWith('FIFO'))).toBe(true);
    expect(titles.some((t) => t?.startsWith('LRU'))).toBe(true);
    expect(titles.some((t) => t?.startsWith('OPT'))).toBe(true);
    expect(titles.some((t) => t?.startsWith('RANDOM'))).toBe(true);
    // FIFO has 10 faults (uniquely known among the four algorithms here).
    expect(screen.getByText(/10 \/ 10 faults/)).toBeInTheDocument();
  });

  it('progressive reveal: with revealUpToStep=2 only shows partial counts', () => {
    useSimulatorStore.getState().run();
    render(<TraceCompare revealUpToStep={2} />);
    // First 3 references (7,0,1) are all faults for every algorithm,
    // so 3 / total faults are revealed.
    expect(screen.getByText(/3 \/ 10 faults/)).toBeInTheDocument();
  });
});
