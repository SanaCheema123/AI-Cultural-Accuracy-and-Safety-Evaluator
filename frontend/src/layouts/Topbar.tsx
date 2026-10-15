import { ChevronDown, Globe2, Menu, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme, setTheme, language, setLanguage } = useUIStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const themes = [
    ['light', Sun],
    ['dark', Moon],
    ['system', Monitor],
  ] as const;

  return (
    <header className="sticky top-0 z-20 h-[70px] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onMenu}
          className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden max-w-xl flex-1 md:block">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            aria-label="Global search"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.currentTarget.value.trim()) {
                navigate(`/app/history?search=${encodeURIComponent(event.currentTarget.value.trim())}`);
              }
            }}
            className="focus-ring h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] ps-10 pe-3 text-sm"
            placeholder={t('common.search')}
          />
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1 sm:flex">
            {themes.map(([value, Icon]) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-label={`${value} theme`}
                className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                  theme === value
                    ? 'bg-[var(--surface)] text-blue-600 shadow-sm'
                    : 'text-slate-400 hover:text-[var(--text)]'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="focus-ring flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold"
            aria-label={t('common.language')}
          >
            <Globe2 className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'en' ? 'العربية' : 'English'}</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileOpen((value) => !value)}
              className="flex h-11 items-center gap-2 rounded-xl px-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                {(user?.full_name || 'DR')
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="hidden text-start lg:block">
                <p className="text-xs font-bold">{user?.full_name || 'User'}</p>
                <p className="text-[10px] text-[var(--muted)]">{user?.role || 'owner'}</p>
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 lg:block" />
            </button>

            {profileOpen && (
              <div className="absolute end-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-2xl">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/app/settings');
                  }}
                  className="w-full rounded-xl px-3 py-2 text-start text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t('common.accountSettings')}
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/auth/login');
                  }}
                  className="w-full rounded-xl px-3 py-2 text-start text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  {t('common.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
