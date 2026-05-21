import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RpPage from '../app/(planit)/rp/page';

describe('smoke', () => {
  it('renders the RP placeholder page without crashing', () => {
    render(<RpPage />);
    expect(screen.getByText('Planning — RP')).toBeInTheDocument();
  });
});
