import { useTranslation } from 'react-i18next';

export function ScoreGauge({
  score,
  label,
  confidence,
  color = 'green',
}: {
  score: number;
  label: string;
  confidence?: number;
  color?: 'green' | 'blue' | 'purple' | 'amber';
}) {
  const { t } = useTranslation();
  const ring = { green: '#10b981', blue: '#2563eb', purple: '#7c3aed', amber: '#f59e0b' }[color];

  return (
    <div className="cg-card-flat p-4 text-center">
      <div
        className="score-ring mx-auto"
        style={{ '--score': Math.round(score * 100), '--ring': ring } as React.CSSProperties}
      >
        <span>{Math.round(score * 100)}%</span>
      </div>
      <p className="mt-3 text-sm font-bold">{label}</p>
      {confidence !== undefined && (
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t('common.confidence')} {Math.round(confidence * 100)}%
        </p>
      )}
    </div>
  );
}
