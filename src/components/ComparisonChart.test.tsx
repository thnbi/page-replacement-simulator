import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { ComparisonChart } from './ComparisonChart';

describe('ComparisonChart', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('shows placeholder when sequence is empty', () => {
    useSimulatorStore.getState().setSequenceText('');
    render(<ComparisonChart />);
    expect(screen.getByText(/sequência/i)).toBeInTheDocument();
  });

  it('renders the slider for max frames when sequence is valid', () => {
    render(<ComparisonChart />);
    expect(screen.getByLabelText(/quadros máximo/i)).toBeInTheDocument();
  });
});
