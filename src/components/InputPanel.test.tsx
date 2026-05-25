import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { InputPanel } from './InputPanel';

describe('InputPanel', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('renders the inputs and buttons', () => {
    render(<InputPanel />);
    expect(screen.getByLabelText(/quadros/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sequência/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /executar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resetar/i })).toBeInTheDocument();
  });

  it('changing sequence to invalid text shows the parse error', () => {
    render(<InputPanel />);
    const input = screen.getByLabelText(/sequência/i);
    fireEvent.change(input, { target: { value: '1 x 2' } });
    expect(screen.getByText(/Caractere inválido/)).toBeInTheDocument();
  });

  it('clicking Executar with valid input fills results in the store', () => {
    render(<InputPanel />);
    fireEvent.click(screen.getByRole('button', { name: /executar/i }));
    expect(useSimulatorStore.getState().results).not.toBeNull();
  });

  it('Executar is disabled with a parse error', () => {
    render(<InputPanel />);
    fireEvent.change(screen.getByLabelText(/sequência/i), {
      target: { value: 'x' },
    });
    expect(screen.getByRole('button', { name: /executar/i })).toBeDisabled();
  });
});
