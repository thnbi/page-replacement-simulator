import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { AutoResults } from './AutoResults';

describe('AutoResults', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('shows placeholder without results', () => {
    render(<AutoResults />);
    expect(screen.getByText(/Clique em Executar/i)).toBeInTheDocument();
  });

  it('renders four cards after run', () => {
    useSimulatorStore.getState().run();
    render(<AutoResults />);
    expect(screen.getByText('FIFO')).toBeInTheDocument();
    expect(screen.getByText('LRU')).toBeInTheDocument();
    expect(screen.getByText('OPT')).toBeInTheDocument();
    expect(screen.getByText('RANDOM')).toBeInTheDocument();
  });

  it('FIFO card shows its fault count (10 for classic × 3)', () => {
    useSimulatorStore.getState().run();
    render(<AutoResults />);
    const card = screen.getByText('FIFO').closest('[data-testid="result-card"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('10');
  });
});
