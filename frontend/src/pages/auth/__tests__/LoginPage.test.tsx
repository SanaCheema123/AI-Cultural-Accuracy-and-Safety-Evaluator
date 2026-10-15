import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../LoginPage';

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('login starts empty and submits real user credentials', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        access_token: 'a',
        refresh_token: 'r',
        workspace_id: 'w',
        role: 'owner',
        user: {
          id: 'u',
          email: 'user@example.test',
          full_name: 'Live User',
          preferred_language: 'en',
          theme: 'light',
        },
      },
    }),
  }) as any;

  renderPage();
  const email = screen.getByLabelText('Email');
  const password = screen.getByLabelText('Password');
  expect(email).toHaveValue('');
  expect(password).toHaveValue('');

  await userEvent.type(email, 'user@example.test');
  await userEvent.type(password, 'Str0ng-Live-Password!');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(global.fetch).toHaveBeenCalled();
});
