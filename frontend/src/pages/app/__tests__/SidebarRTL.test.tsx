import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '@/layouts/Sidebar';
import { useUIStore } from '@/stores/uiStore';

test('sidebar exposes only the four core application destinations', () => {
  useUIStore.getState().setLanguage('en');
  render(
    <MemoryRouter initialEntries={['/app']}>
      <Sidebar mobileOpen onClose={() => {}} />
    </MemoryRouter>,
  );

  expect(screen.getByText('Home')).toBeInTheDocument();
  expect(screen.getByText('Evaluate')).toBeInTheDocument();
  expect(screen.getByText('History')).toBeInTheDocument();
  expect(screen.getByText('Settings')).toBeInTheDocument();
  expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
  expect(screen.queryByText('Model Comparison')).not.toBeInTheDocument();
});

test('switching to Arabic applies RTL and Arabic navigation labels', async () => {
  useUIStore.getState().setLanguage('en');
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/app']}>
      <Sidebar mobileOpen onClose={() => {}} />
    </MemoryRouter>,
  );

  useUIStore.getState().setLanguage('ar');
  await user.click(document.body);

  expect(document.documentElement.dir).toBe('rtl');
  expect(await screen.findByText('الرئيسية')).toBeInTheDocument();
  expect(screen.getByText('التقييم')).toBeInTheDocument();
  expect(screen.getByText('السجل')).toBeInTheDocument();
  expect(screen.getByText('الإعدادات')).toBeInTheDocument();
});
