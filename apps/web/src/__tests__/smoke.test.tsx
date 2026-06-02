import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlashProvider } from '@planit/ui';
import { AuthProvider } from '../contexts/auth-context';
import { RpPlanningView } from '../components/rp/rp-planning-view';

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <FlashProvider>
      <AuthProvider>
        <QueryClientProvider client={client}>{ui}</QueryClientProvider>
      </AuthProvider>
    </FlashProvider>,
  );
}

describe('smoke', () => {
  it('renders the RP planning view header without crashing', () => {
    renderWithProviders(<RpPlanningView />);
    expect(screen.getByRole('heading', { name: 'Planning hebdomadaire' })).toBeInTheDocument();
  });
});
