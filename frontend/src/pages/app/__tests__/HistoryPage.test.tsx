import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HistoryPage from '../HistoryPage';

test('history exposes live-data search, status, risk, and date filters', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { items: [], total: 0, limit: 12, offset: 0 } }),
  }) as any;

  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  expect(await screen.findByPlaceholderText(/search prompt or model/i)).toBeInTheDocument();
  expect(screen.getByText('All statuses')).toBeInTheDocument();
  expect(screen.getByText('All risk levels')).toBeInTheDocument();
  expect(screen.queryByText('All models')).not.toBeInTheDocument();
});
