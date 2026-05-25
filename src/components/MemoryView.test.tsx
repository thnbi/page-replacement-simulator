import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryView } from './MemoryView';

describe('MemoryView', () => {
  it('renders one slot per frame', () => {
    render(<MemoryView frames={[1, 2, null]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('marks the slot that changed (victimIndex)', () => {
    const { container } = render(<MemoryView frames={[5, 2, 3]} victimIndex={0} />);
    const slots = container.querySelectorAll('[data-testid="memory-slot"]');
    expect(slots[0]).toHaveAttribute('data-victim', 'true');
    expect(slots[1]).toHaveAttribute('data-victim', 'false');
  });
});
