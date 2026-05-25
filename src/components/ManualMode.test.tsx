import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { ManualMode } from './ManualMode';

describe('ManualMode', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('shows placeholder before run', () => {
    render(<ManualMode />);
    expect(screen.getByText(/Clique em Executar/i)).toBeInTheDocument();
  });

  it('shows HIT or FALTA after stepping forward', () => {
    useSimulatorStore.getState().run();
    render(<ManualMode />);
    fireEvent.click(screen.getByRole('button', { name: /Avançar/i }));
    expect(screen.queryByText(/HIT|FALTA/)).toBeInTheDocument();
  });

  it('back button is disabled at stepIndex -1', () => {
    useSimulatorStore.getState().run();
    render(<ManualMode />);
    expect(screen.getByRole('button', { name: /Voltar/i })).toBeDisabled();
  });

  it('algorithm selector appears and switches the store', () => {
    useSimulatorStore.getState().run();
    render(<ManualMode />);
    const lru = screen.getByRole('radio', { name: /LRU/i });
    fireEvent.click(lru);
    expect(useSimulatorStore.getState().manualAlgorithm).toBe('lru');
  });

  it('FIFO queue appears for FIFO and disappears for other algorithms', () => {
    useSimulatorStore.getState().run();
    useSimulatorStore.getState().stepForward();
    render(<ManualMode />);
    expect(screen.getByText(/Fila FIFO/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /LRU/i }));
    expect(screen.queryByText(/Fila FIFO/i)).not.toBeInTheDocument();
  });

  it('running fault count reflects the current step', () => {
    useSimulatorStore.getState().run();
    render(<ManualMode />);
    // first reference (page 7) is a fault
    fireEvent.click(screen.getByRole('button', { name: /Avançar/i }));
    expect(screen.getByText(/faltas até aqui: 1/i)).toBeInTheDocument();
  });
});
