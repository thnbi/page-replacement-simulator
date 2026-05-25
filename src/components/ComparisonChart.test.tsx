import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { initialState, useSimulatorStore } from '../store/simulator';
import { ComparisonChart } from './ComparisonChart';

describe('ComparisonChart', () => {
  beforeEach(() => {
    useSimulatorStore.setState(initialState());
  });

  it('shows placeholder before Executar (results === null)', () => {
    render(<ComparisonChart />);
    expect(screen.getByText(/Clique em/i)).toBeInTheDocument();
  });

  it('renders the slider once results exist', () => {
    useSimulatorStore.getState().run();
    render(<ComparisonChart />);
    expect(screen.getByLabelText(/quadros máximo/i)).toBeInTheDocument();
  });

  it('clearing the sequence resets results so the chart shows the placeholder again', () => {
    useSimulatorStore.getState().run();
    useSimulatorStore.getState().setSequenceText('');
    render(<ComparisonChart />);
    expect(screen.getByText(/Clique em/i)).toBeInTheDocument();
  });
});
