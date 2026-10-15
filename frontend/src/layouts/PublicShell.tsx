import { Outlet, useNavigate } from 'react-router-dom';
import { Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/common/Brand';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

export function PublicShell() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.accessToken);
  const { language, setLanguage } = useUIStore();

  return (
    <div className="cg-page min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/82">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center gap-3 px-4 sm:px-6">
          <button onClick={() => navigate('/')} aria-label="CulturalGuard AI home" className="text-start">
            <Brand />
          </button>

          <div className="ms-auto flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={t('common.language')}
            >
              <Globe2 className="h-4 w-4" />
              <span className="hidden sm:inline">{language === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {!token && (
              <button
                onClick={() => navigate('/auth/login')}
                className="hidden rounded-xl px-3 py-2 text-sm font-semibold sm:block"
              >
                {t('common.signIn')}
              </button>
            )}

            <Button onClick={() => navigate(token ? '/app/evaluate' : '/auth/login')}>
              {t('common.tryNow')}
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
