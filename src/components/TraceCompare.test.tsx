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
    expect(screen.getByText(/FIFO · 10 faults/)).toBeInTheDocument();
    expect(screen.getByText(/LRU · 9 faults/)).toBeInTheDocument();
    expect(screen.getByText(/OPT · 7 faults/)).toBeInTheDocument();
    expect(screen.getByText(/RANDOM/)).toBeInTheDocument();
  });
});
