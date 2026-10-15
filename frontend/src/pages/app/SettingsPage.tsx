import { useState } from 'react';
import { Cpu, Globe2, Monitor, Moon, Palette, Save, Sun, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { authService } from '@/services/authService';
import { evaluationApi } from '@/api/evaluations';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { theme, setTheme, language, setLanguage } = useUIStore();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loading, setLoading] = useState(false);

  const models = useQuery({ queryKey: ['models'], queryFn: evaluationApi.models });
  const liveModel = models.data?.find((item) => item.configured) ?? null;

  const themes = [
    ['light', Sun, t('settings.light')],
    ['dark', Moon, t('settings.dark')],
    ['system', Monitor, t('settings.auto')],
  ] as const;

  async function save() {
    setLoading(true);
    setSaved(false);
    setSaveError(false);
    try {
      await authService.preferences({ preferred_language: language, theme });
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        actions={
          <Button onClick={save} loading={loading} icon={<Save className="h-4 w-4" />}>
            {t('common.save')}
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/30">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="text-start">
              <h2 className="font-bold">{t('settings.profile')}</h2>
              <p className="text-xs text-[var(--muted)]">{t('settings.profileDesc')}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xl font-black text-white">
              {(user?.full_name || 'U')
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="min-w-0 text-start">
              <p className="truncate font-bold">{user?.full_name || 'User'}</p>
              <p className="truncate text-sm text-[var(--muted)]">{user?.email}</p>
              <span className="mt-2 inline-block rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                {user?.role || 'owner'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
              <Cpu className="h-5 w-5" />
            </div>
            <div className="text-start">
              <h2 className="font-bold">{t('settings.aiConnection')}</h2>
              <p className="text-xs text-[var(--muted)]">{t('settings.aiConnectionDesc')}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 text-start">
                <p className="font-bold">{liveModel?.name || t('settings.notConfigured')}</p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">
                  {liveModel?.provider || t('settings.configureEnv')}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  liveModel
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                }`}
              >
                {liveModel ? t('settings.connected') : t('settings.disconnected')}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
              <Palette className="h-5 w-5" />
            </div>
            <div className="text-start">
              <h2 className="font-bold">{t('settings.appearance')}</h2>
              <p className="text-xs text-[var(--muted)]">{t('settings.appearanceDesc')}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {themes.map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTheme(key)}
                className={`focus-ring rounded-2xl border p-5 text-center transition ${
                  theme === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-950'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-blue-300'
                }`}
              >
                <Icon className="mx-auto h-6 w-6" />
                <span className="mt-2 block text-sm font-bold">{label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
              <Globe2 className="h-5 w-5" />
            </div>
            <div className="text-start">
              <h2 className="font-bold">{t('settings.language')}</h2>
              <p className="text-xs text-[var(--muted)]">{t('settings.languageDesc')}</p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {[
              ['en', 'English'],
              ['ar', 'العربية'],
            ].map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => setLanguage(key as 'en' | 'ar')}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${
                  language === key
                    ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-200'
                    : 'border-[var(--border)] bg-[var(--surface-2)]'
                }`}
              >
                <span>{label}</span>
                <span
                  aria-hidden="true"
                  className={`h-4 w-4 rounded-full border-4 ${
                    language === key ? 'border-blue-600' : 'border-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{t('settings.rtlHint')}</p>
        </Card>
      </div>

      {saved && (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
          {t('settings.saved')}
        </div>
      )}
      {saveError && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          {t('settings.saveError')}
        </div>
      )}
    </div>
  );
}
