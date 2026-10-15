import { create } from 'zustand';
import i18n, { applyDocumentLanguage, type AppLanguage } from '@/i18n/config';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  language: AppLanguage;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: AppLanguage) => void;
  toggleSidebar: () => void;
}

const readTheme = (): Theme => {
  const saved = localStorage.getItem('cg-theme');
  return saved === 'dark' || saved === 'system' ? saved : 'light';
};

const readLanguage = (): AppLanguage =>
  localStorage.getItem('cg-language') === 'ar' ? 'ar' : 'en';

const applyTheme = (theme: Theme) => {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
  localStorage.setItem('cg-theme', theme);
};

applyTheme(readTheme());
applyDocumentLanguage(readLanguage());

export const useUIStore = create<UIState>((set) => ({
  theme: readTheme(),
  language: readLanguage(),
  sidebarCollapsed: false,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  setLanguage: (language) => {
    // Apply direction synchronously so the sidebar/page mirror immediately,
    // then let i18next update translated strings in the same render cycle.
    applyDocumentLanguage(language);
    localStorage.setItem('cg-language', language);
    set({ language });
    void i18n.changeLanguage(language);
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
