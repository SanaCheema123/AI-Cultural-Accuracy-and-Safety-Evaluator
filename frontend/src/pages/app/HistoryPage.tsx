import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Eye, Filter, Search, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { evaluationApi } from '@/api/evaluations';
import { assetUrl } from '@/api/client';
import { PageHeader } from '@/components/common/PageHeader';
import { EvalStatus, RiskBadge } from '@/components/common/Status';
import { ErrorState, LoadingState } from '@/components/common/States';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Form';
import { useUIStore } from '@/stores/uiStore';

export default function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [urlParams] = useSearchParams();
  const language = useUIStore((state) => state.language);
  const locale = language === 'ar' ? 'ar' : 'en';

  const [search, setSearch] = useState(urlParams.get('search') || '');
  const [status, setStatus] = useState('');
  const [risk, setRisk] = useState('');
  const [days, setDays] = useState('30');
  const [page, setPage] = useState(0);
  const limit = 12;

  const evaluations = useQuery({
    queryKey: ['evaluations', 'history', search, status, risk, days, page],
    queryFn: () =>
      evaluationApi.list({
        search,
        status,
        risk,
        days: days ? Number(days) : undefined,
        limit,
        offset: page * limit,
      }),
  });

  const removeEvaluation = useMutation({
    mutationFn: evaluationApi.remove,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['evaluations'] }),
  });

  const report = useMutation({
    mutationFn: (id: string) => evaluationApi.createReport(id, 'pdf'),
    onSuccess: (data) => {
      if (data.file_url) window.open(assetUrl(data.file_url), '_blank');
    },
  });

  if (evaluations.isLoading) return <LoadingState label={t('common.loading')} />;
  if (evaluations.isError) {
    return <ErrorState message={(evaluations.error as Error).message} onRetry={() => void evaluations.refetch()} />;
  }

  const items = evaluations.data?.items ?? [];
  const total = evaluations.data?.total ?? 0;
  const from = total === 0 ? 0 : page * limit + 1;
  const to = Math.min((page + 1) * limit, total);

  const reset = () => {
    setSearch('');
    setStatus('');
    setRisk('');
    setDays('30');
    setPage(0);
  };

  const confirmDelete = (id: string) => {
    if (window.confirm(t('history.confirmDelete'))) removeEvaluation.mutate(id);
  };

  return (
    <div className="fade-up">
      <PageHeader eyebrow={t('history.eyebrow')} title={t('history.title')} subtitle={t('history.subtitle')} />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_.8fr_.8fr_.75fr_auto]">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              className="ps-9"
              placeholder={t('history.search')}
            />
          </div>

          <Select
            aria-label="Status filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
          >
            <option value="">{t('history.allStatuses')}</option>
            <option value="completed">{t('history.completed')}</option>
            <option value="failed">{t('history.failed')}</option>
            <option value="processing">{t('history.processing')}</option>
          </Select>

          <Select
            aria-label="Risk filter"
            value={risk}
            onChange={(event) => {
              setRisk(event.target.value);
              setPage(0);
            }}
          >
            <option value="">{t('history.allRisk')}</option>
            <option value="low">{t('history.lowRisk')}</option>
            <option value="medium">{t('history.mediumRisk')}</option>
            <option value="high">{t('history.highRisk')}</option>
            <option value="critical">{t('history.criticalRisk')}</option>
          </Select>

          <Select
            aria-label="Date filter"
            value={days}
            onChange={(event) => {
              setDays(event.target.value);
              setPage(0);
            }}
          >
            <option value="7">{t('history.days7')}</option>
            <option value="30">{t('history.days30')}</option>
            <option value="90">{t('history.days90')}</option>
            <option value="">{t('history.allDates')}</option>
          </Select>

          <Button variant="secondary" icon={<Filter className="h-4 w-4" />} onClick={reset}>{t('common.reset')}</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[980px] text-start text-sm">
            <thead className="bg-[var(--surface-2)] text-xs font-semibold text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3">{t('history.image')}</th>
                <th className="px-3 py-3">{t('history.prompt')}</th>
                <th>{t('history.model')}</th>
                <th>{t('history.cultural')}</th>
                <th>{t('history.safety')}</th>
                <th>{t('history.flags')}</th>
                <th>{t('history.risk')}</th>
                <th>{t('history.date')}</th>
                <th>{t('history.status')}</th>
                <th className="pe-5 text-end">{t('history.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((evaluation) => (
                <tr key={evaluation.id} className="border-t border-[var(--border)] hover:bg-blue-50/30 dark:hover:bg-blue-950/20">
                  <td className="px-5 py-3"><img src={assetUrl(evaluation.image_url)} alt="Evaluation" className="h-11 w-16 rounded-xl object-cover" /></td>
                  <td className="max-w-sm px-3 py-3"><p className="truncate font-semibold" dir="auto">{evaluation.prompt}</p></td>
                  <td>{evaluation.model_name}</td>
                  <td><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{evaluation.cultural_score != null ? `${Math.round(evaluation.cultural_score * 100)}%` : '—'}</span></td>
                  <td><span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">{evaluation.safety_score != null ? `${Math.round(evaluation.safety_score * 100)}%` : '—'}</span></td>
                  <td>{evaluation.flags}</td>
                  <td><RiskBadge risk={evaluation.bias_risk} /></td>
                  <td className="text-xs text-[var(--muted)]">{new Date(evaluation.created_at).toLocaleString(locale)}</td>
                  <td><EvalStatus status={evaluation.status} /></td>
                  <td className="pe-5">
                    <div className="flex justify-end gap-1 rtl:justify-start">
                      <button className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={() => navigate(`/app/evaluate?id=${evaluation.id}`)} title={t('common.view')} aria-label={t('common.view')}><Eye className="h-4 w-4" /></button>
                      <button className="rounded-lg p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30" onClick={() => report.mutate(evaluation.id)} title={t('common.exportPdf')} aria-label={t('common.exportPdf')}><Download className="h-4 w-4" /></button>
                      <button className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => confirmDelete(evaluation.id)} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--border)] lg:hidden">
          {items.map((evaluation) => (
            <article key={evaluation.id} className="p-4">
              <div className="flex gap-3">
                <img src={assetUrl(evaluation.image_url)} alt="Evaluation" className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1 text-start">
                  <p className="line-clamp-2 text-sm font-semibold" dir="auto">{evaluation.prompt}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{evaluation.model_name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{new Date(evaluation.created_at).toLocaleString(locale)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <EvalStatus status={evaluation.status} />
                <RiskBadge risk={evaluation.bias_risk} />
                {evaluation.cultural_score != null && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{t('history.cultural')} {Math.round(evaluation.cultural_score * 100)}%</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => navigate(`/app/evaluate?id=${evaluation.id}`)}>{t('common.view')}</Button>
                <Button variant="ghost" onClick={() => report.mutate(evaluation.id)}>{t('common.exportPdf')}</Button>
                <Button variant="ghost" onClick={() => confirmDelete(evaluation.id)}>{t('common.delete')}</Button>
              </div>
            </article>
          ))}
        </div>

        {items.length === 0 && <div className="p-10 text-center text-sm text-[var(--muted)]">{t('history.emptyLive')}</div>}

        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[var(--muted)]">{t('history.showing', { from, to, total })}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>{t('common.previous')}</Button>
            <Button variant="secondary" disabled={(page + 1) * limit >= total} onClick={() => setPage((value) => value + 1)}>{t('common.next')}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
