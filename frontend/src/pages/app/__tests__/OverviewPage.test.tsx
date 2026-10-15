import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OverviewPage from '../OverviewPage';

vi.mock('react-plotly.js', () => ({ default: () => <div data-testid="plot" /> }));

test('dashboard stays empty until live evaluations exist', async () => {
  global.fetch = vi.fn().mockImplementation((url: string) =>
    Promise.resolve({
      ok: true,
      json: async () =>
        url.includes('analytics')
          ? {
              data: {
                period_days: 30,
                kpis: {
                  total_evaluations: 0,
                  average_cultural_accuracy: 0,
                  safety_pass_rate: 0,
                  human_reviews_pending: 0,
                },
                volume: [],
                model_performance: [],
                flag_distribution: [],
              },
            }
          : { data: { items: [], total: 0, limit: 5, offset: 0 } },
    }),
  ) as any;

  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  expect(await screen.findByText('No live evaluations yet')).toBeInTheDocument();
  expect(screen.queryByText(/sample dashboard data/i)).not.toBeInTheDocument();
});
