import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../contexts/auth-context';
import RpPage from '../app/(planit)/rp/page';

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <AuthProvider>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </AuthProvider>,
  );
}

describe('smoke', () => {
  it('renders the RP planning page header without crashing', () => {
    renderWithProviders(<RpPage />);
    expect(screen.getByRole('heading', { name: 'Planning hebdomadaire' })).toBeInTheDocument();
  });
});
