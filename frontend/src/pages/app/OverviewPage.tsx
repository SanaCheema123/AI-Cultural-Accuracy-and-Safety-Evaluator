import { useQuery } from '@tanstack/react-query';
import { Activity, Layers3, Palette, ShieldCheck, Users2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { evaluationApi } from '@/api/evaluations';
import { assetUrl } from '@/api/client';
import { EvalStatus, RiskBadge } from '@/components/common/Status';
import { KpiCard } from '@/components/common/KpiCard';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorState, LoadingState } from '@/components/common/States';
import { PlotCard } from '@/components/charts/PlotCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useUIStore } from '@/stores/uiStore';

export default function OverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const analytics = useQuery({ queryKey: ['analytics', 30], queryFn: () => evaluationApi.analytics(30) });
  const recent = useQuery({ queryKey: ['evaluations', 'recent'], queryFn: () => evaluationApi.list({ limit: 5 }) });
  const { theme, setTheme, language } = useUIStore();

  if (analytics.isLoading) return <LoadingState label={t('common.loading')} />;
  if (analytics.isError || !analytics.data) {
    return <ErrorState message={(analytics.error as Error | undefined)?.message || t('common.error')} onRetry={() => void analytics.refetch()} />;
  }

  const data = analytics.data;
  const locale = language === 'ar' ? 'ar' : 'en';
  const hasActivity = data.volume.length > 0;

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={<Button onClick={() => navigate('/app/evaluate')}>{t('common.newEvaluation')}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Layers3} label={t('dashboard.total')} value={data.kpis.total_evaluations.toLocaleString(locale)} tone="blue" />
        <KpiCard icon={Activity} label={t('dashboard.cultural')} value={`${Math.round(data.kpis.average_cultural_accuracy * 100)}%`} helper={t('dashboard.automated')} tone="green" />
        <KpiCard icon={ShieldCheck} label={t('dashboard.safety')} value={`${Math.round(data.kpis.safety_pass_rate * 100)}%`} helper={t('dashboard.threshold')} tone="purple" />
        <KpiCard icon={Users2} label={t('dashboard.reviews')} value={data.kpis.human_reviews_pending} helper={t('dashboard.reviewHelper')} tone="amber" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.45fr]">
        {hasActivity ? (
          <PlotCard
            title={t('dashboard.activity')}
            subtitle={t('dashboard.activitySubtitle')}
            data={[
              {
                x: data.volume.map((item) => item.date),
                y: data.volume.map((item) => item.count),
                type: 'scatter',
                mode: 'lines+markers',
                fill: 'tozeroy',
                line: { color: '#2563eb', width: 3 },
                marker: { size: 7, color: '#4f46e5' },
                fillcolor: 'rgba(37,99,235,.08)',
              },
            ]}
          />
        ) : (
          <Card className="grid min-h-[330px] place-items-center p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{t('dashboard.noActivityTitle')}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t('dashboard.noActivityDesc')}</p>
              <Button className="mt-5" onClick={() => navigate('/app/evaluate')}>{t('common.newEvaluation')}</Button>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold">{t('dashboard.appearance')}</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{t('dashboard.appearanceSubtitle')}</p>
          <div className="mt-5 grid gap-2">
            {(['light', 'dark', 'system'] as const).map((value) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`rounded-xl border px-3 py-3 text-start text-sm font-semibold transition ${
                  theme === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                    : 'border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {t(`dashboard.${value}`)}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="font-bold">{t('dashboard.recent')}</h3>
            <p className="text-xs text-[var(--muted)]">{t('dashboard.recentSubtitle')}</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/app/history')}>{t('common.viewAll')}</Button>
        </div>

        {recent.isLoading ? (
          <div className="p-6"><LoadingState /></div>
        ) : recent.data?.items.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-start text-sm">
                <thead className="bg-[var(--surface-2)] text-xs text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-3">{t('history.image')}</th>
                    <th className="px-3 py-3">{t('history.prompt')}</th>
                    <th>{t('history.model')}</th>
                    <th>{t('history.cultural')}</th>
                    <th>{t('history.safety')}</th>
                    <th>{t('history.risk')}</th>
                    <th>{t('history.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.data.items.map((evaluation) => (
                    <tr key={evaluation.id} onClick={() => navigate(`/app/evaluate?id=${evaluation.id}`)} className="cursor-pointer border-t border-[var(--border)] hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                      <td className="px-5 py-3"><img src={assetUrl(evaluation.image_url)} alt="Evaluation thumbnail" className="h-10 w-14 rounded-lg object-cover" /></td>
                      <td className="max-w-xs px-3 py-3">
                        <p className="truncate font-medium" dir="auto">{evaluation.prompt}</p>
                        <p className="text-xs text-[var(--muted)]">{new Date(evaluation.created_at).toLocaleString(locale)}</p>
                      </td>
                      <td>{evaluation.model_name}</td>
                      <td>{evaluation.cultural_score != null ? `${Math.round(evaluation.cultural_score * 100)}%` : '—'}</td>
                      <td>{evaluation.safety_score != null ? `${Math.round(evaluation.safety_score * 100)}%` : '—'}</td>
                      <td><RiskBadge risk={evaluation.bias_risk} /></td>
                      <td><EvalStatus status={evaluation.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--border)] md:hidden">
              {recent.data.items.map((evaluation) => (
                <button key={evaluation.id} onClick={() => navigate(`/app/evaluate?id=${evaluation.id}`)} className="flex w-full items-center gap-3 p-4 text-start hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                  <img src={assetUrl(evaluation.image_url)} alt="Evaluation thumbnail" className="h-14 w-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" dir="auto">{evaluation.prompt}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{evaluation.model_name}</p>
                    <div className="mt-2 flex flex-wrap gap-2"><EvalStatus status={evaluation.status} /><RiskBadge risk={evaluation.bias_risk} /></div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="p-10 text-center text-sm text-[var(--muted)]">{t('dashboard.empty')}</div>
        )}
      </Card>
    </div>
  );
}
