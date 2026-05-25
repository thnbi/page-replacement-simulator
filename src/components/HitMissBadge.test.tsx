import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HitMissBadge } from './HitMissBadge';

describe('HitMissBadge', () => {
  it('shows HIT when hit=true', () => {
    render(<HitMissBadge hit={true} />);
    expect(screen.getByText(/HIT/i)).toBeInTheDocument();
  });

  it('shows FAULT when hit=false', () => {
    render(<HitMissBadge hit={false} />);
    expect(screen.getByText(/FAULT/i)).toBeInTheDocument();
  });
});
