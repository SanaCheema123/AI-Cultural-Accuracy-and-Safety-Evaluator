import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Radio,
  Scale,
  ShieldCheck,
  Sparkles,
  Users2,
  Workflow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/common/Brand';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/stores/authStore';

export default function LandingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.accessToken);

  const features = [
    [t('landing.featureCultural'), t('landing.featureCulturalDesc'), BadgeCheck],
    [t('landing.featureSafety'), t('landing.featureSafetyDesc'), ShieldCheck],
    [t('landing.featureBias'), t('landing.featureBiasDesc'), Scale],
    [t('landing.featureReview'), t('landing.featureReviewDesc'), Users2],
    [t('landing.featureReports'), t('landing.featureReportsDesc'), FileText],
  ] as const;

  const steps = [
    ['01', t('landing.stepUpload'), t('landing.stepUploadDesc')],
    ['02', t('landing.stepEvaluate'), t('landing.stepEvaluateDesc')],
    ['03', t('landing.stepReview'), t('landing.stepReviewDesc')],
    ['04', t('landing.stepHistory'), t('landing.stepHistoryDesc')],
  ] as const;

  const start = () => navigate(token ? '/app/evaluate' : '/auth/login');

  return (
    <main className="overflow-hidden">
      <section className="relative">
        <div className="absolute inset-0 cg-grid-bg opacity-50" />
        <div className="absolute -start-24 top-40 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute end-0 top-12 h-[480px] w-[480px] rounded-full bg-violet-200/35 blur-3xl" />

        <div className="relative mx-auto grid min-h-[690px] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.02fr_.98fr] lg:py-20">
          <div className="fade-up text-start">
            <Badge tone="blue" className="px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {t('landing.badge')}
            </Badge>

            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.04] tracking-[-.045em] sm:text-6xl lg:text-[68px]">
              {t('landing.headlineA')}{' '}
              <span className="cg-gradient-text">{t('landing.headlineB')}</span>{' '}
              {t('landing.headlineC')}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">{t('landing.support')}</p>

            <div className="mt-8">
              <Button onClick={start} className="h-12 px-7 text-base">
                {t('common.tryNow')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
              {[t('landing.arabicEnglish'), t('landing.humanLoop'), t('landing.explainable')].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-[520px]">
            <div className="absolute inset-0 rounded-[44px] bg-gradient-to-br from-blue-100/80 via-white to-violet-100/90 shadow-2xl shadow-blue-500/10 dark:from-blue-950/50 dark:via-slate-950 dark:to-violet-950/50" />

            <div className="absolute start-0 top-10 w-[59%] overflow-hidden rounded-[28px] border-8 border-white shadow-2xl dark:border-slate-800">
              <img src="/cultural-scene.webp" alt={t('landing.previewImageAlt')} className="aspect-[1.02] w-full object-cover" />
              <div className="absolute start-4 top-4">
                <Badge tone="blue"><Radio className="h-3 w-3" />{t('landing.liveReady')}</Badge>
              </div>
            </div>

            <div className="cg-glass absolute bottom-9 end-0 w-[68%] rounded-[28px] p-5 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold">{t('landing.result')}</p>
                  <p className="text-xs text-[var(--muted)]">{t('landing.noPresetScores')}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  [t('landing.similarity'), t('landing.liveSignal'), 'bg-blue-500'],
                  [t('landing.cultural'), t('landing.liveSignal'), 'bg-emerald-500'],
                  [t('landing.safety'), t('landing.liveSignal'), 'bg-violet-500'],
                  [t('landing.bias'), t('landing.liveSignal'), 'bg-amber-500'],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                    <p className="text-[11px] font-medium text-[var(--muted)]">{label}</p>
                    <div className="mt-1 flex items-end justify-between gap-2">
                      <strong className="text-sm">{value}</strong>
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                {t('landing.liveDisclaimer')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <Badge tone="purple">{t('landing.platformBadge')}</Badge>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{t('landing.platformTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted)]">{t('landing.platformSubtitle')}</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {features.map(([title, description, Icon]) => (
            <article key={title} className="cg-card-flat p-5 transition hover:-translate-y-1 hover:shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 text-blue-600 dark:from-blue-950 dark:to-violet-950">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div className="text-start">
              <Badge tone="blue"><Workflow className="h-3 w-3" />{t('landing.how')}</Badge>
              <h2 className="mt-4 text-3xl font-extrabold">{t('landing.howTitle')}</h2>
              <p className="mt-4 leading-7 text-[var(--muted)]">{t('landing.howDesc')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {steps.map(([number, title, description]) => (
                <div key={number} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-5 text-start">
                  <span className="text-xs font-black text-blue-600">{number}</span>
                  <h3 className="mt-2 font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="overflow-hidden rounded-[32px] bg-[#0B1537] px-7 py-12 text-white shadow-2xl sm:px-12">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
            <div className="text-start">
              <p className="text-sm font-bold text-cyan-300">{t('landing.ctaKicker')}</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">{t('landing.ctaTitle')}</h2>
            </div>
            <Button onClick={start} className="h-12 shrink-0 bg-white text-blue-700 shadow-none hover:bg-blue-50">
              {t('common.tryNow')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center">
          <Brand />
          <p className="text-sm text-[var(--muted)] md:ms-auto">{t('landing.footer')}</p>
        </div>
      </footer>
    </main>
  );
}
