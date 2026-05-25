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
    expect(screen.getByText(/10 \/ 10 faults/i)).toBeInTheDocument();
  });

  it('progressive reveal hides future columns and updates fault count', () => {
    const run = fifo(CLASSIC_SEQUENCE, 3);
    const { container } = render(
      <TraceTable title="FIFO" run={run} frames={3} revealUpToStep={2} />,
    );
    // First 3 references (7, 0, 1) are all faults
    expect(screen.getByText(/3 \/ 10 faults/i)).toBeInTheDocument();
    // The h/f row should show F F F · · · · · · · · · ·
    const trs = container.querySelectorAll('tr');
    const hfRow = trs[trs.length - 1];
    const cells = hfRow?.querySelectorAll('td');
    expect(cells?.[0]?.textContent).toBe('F');
    expect(cells?.[2]?.textContent).toBe('F');
    expect(cells?.[3]?.textContent).toBe('·');
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
