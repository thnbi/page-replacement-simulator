import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fifo } from '../domain/algorithms/fifo';
import { CLASSIC_SEQUENCE } from '../test/fixtures';
import { TraceTable } from './TraceTable';

describe('TraceTable', () => {
  it('renders the title and total faults', () => {
    const run = fifo(CLASSIC_SEQUENCE, 3);
    render(<TraceTable title="FIFO" run={run} frames={3} />);
    expect(screen.getByText(/FIFO/)).toBeInTheDocument();
    expect(screen.getByText(/10 faults/i)).toBeInTheDocument();
  });

  it('has one tr per (ref header + frame + hit/falta) = frames + 2 rows', () => {
    const run = fifo(CLASSIC_SEQUENCE, 3);
    const { container } = render(<TraceTable title="FIFO" run={run} frames={3} />);
    expect(container.querySelectorAll('tr').length).toBe(5);
  });

  it('hit/falta row shows F for the first reference (always a fault)', () => {
    const run = fifo(CLASSIC_SEQUENCE, 3);
    const { container } = render(<TraceTable title="FIFO" run={run} frames={3} />);
    const trs = container.querySelectorAll('tr');
    const hfRow = trs[trs.length - 1];
    const firstHf = hfRow?.querySelectorAll('td')[0];
    expect(firstHf?.textContent).toBe('F');
  });
});
