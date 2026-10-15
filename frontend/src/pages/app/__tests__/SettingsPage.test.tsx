import { render,screen } from '@testing-library/react';import userEvent from '@testing-library/user-event';import SettingsPage from '../SettingsPage';import { useUIStore } from '@/stores/uiStore';
test('theme changer updates global theme state',async()=>{render(<SettingsPage/>);await userEvent.click(screen.getByRole('button',{name:/dark/i}));expect(useUIStore.getState().theme).toBe('dark')});
test('Arabic language switch sets RTL',async()=>{render(<SettingsPage/>);await userEvent.click(screen.getByRole('button',{name:'العربية'}));expect(document.documentElement.dir).toBe('rtl')});
