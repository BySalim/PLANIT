import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RpPage from '../app/(planit)/rp/page';

function renderWithQueryProvider(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('smoke', () => {
  it('renders the RP planning page header without crashing', () => {
    renderWithQueryProvider(<RpPage />);
    expect(screen.getByRole('heading', { name: 'Planning — RP' })).toBeInTheDocument();
  });
});
