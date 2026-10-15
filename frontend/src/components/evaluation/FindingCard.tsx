import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Finding } from '@/types/domain';
import { RiskBadge } from '@/components/common/Status';

export function FindingCard({ finding, type = 'cultural' }: { finding: Finding; type?: 'cultural' | 'safety' | 'bias' }) {
  const { t } = useTranslation();
  const ok = finding.severity === 'low';
  const Icon = ok ? CheckCircle2 : finding.severity === 'medium' ? Info : AlertTriangle;

  return (
    <article className="cg-card-flat p-5 text-start">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${ok ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold capitalize">{finding.category.replaceAll('_', ' ')}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{t('common.confidence')} {Math.round(finding.confidence * 100)}%</p>
          </div>
        </div>
        <RiskBadge risk={finding.severity} />
      </div>
      <div className="mt-4 grid gap-3 text-sm leading-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{t('finding.evidence')}</p>
          <p>{finding.evidence}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{t('finding.explanation')}</p>
          <p>{finding.explanation}</p>
        </div>
        <div className="rounded-xl bg-blue-50/70 p-3 dark:bg-blue-950/20">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">{t('finding.recommendation')}</p>
          <p className="mt-1">{finding.recommendation}</p>
        </div>
        {type === 'cultural' && finding.uncertainty && (
          <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 text-violet-800 dark:border-violet-900 dark:bg-violet-950/20 dark:text-violet-200">
            <strong>{t('finding.uncertainty')}:</strong> {finding.uncertainty}
          </div>
        )}
      </div>
    </article>
  );
}
