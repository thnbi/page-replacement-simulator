import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { initialState, useSimulatorStore } from './store/simulator';

describe('App', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText(/Simulador de Substituição/i)).toBeInTheDocument();
  });

  it('shows the three tabs', () => {
    render(<App />);
    expect(screen.getByRole('tab', { name: /Passo-a-passo/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Resultados/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Curva de faltas/i })).toBeInTheDocument();
  });

  it('Executar populates results, then Resultados shows the four cards', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Executar/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Resultados/i }));
    expect(screen.getByText('FIFO')).toBeInTheDocument();
    expect(screen.getByText('LRU')).toBeInTheDocument();
    expect(screen.getByText('OPT')).toBeInTheDocument();
    expect(screen.getByText('RANDOM')).toBeInTheDocument();
  });
});
