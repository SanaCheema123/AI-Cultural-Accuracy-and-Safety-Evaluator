import { AlertTriangle, CheckCircle2, Clock3, Info, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';

export function RiskBadge({ risk }: { risk?: string | null }) {
  const { t } = useTranslation();
  const raw = (risk || 'unknown').toLowerCase();
  const normalized = raw.includes('high') || raw === 'critical'
    ? raw === 'critical' ? 'critical' : 'high'
    : raw.includes('medium') || raw.includes('recommended')
      ? raw.includes('recommended') ? 'recommended' : 'medium'
      : raw.includes('low') || raw.includes('optional')
        ? raw.includes('optional') ? 'optional' : 'low'
        : raw.includes('required')
          ? 'required'
          : raw === 'approve'
            ? 'approve'
            : 'unknown';
  const tone = normalized === 'low' || normalized === 'optional' || normalized === 'approve'
    ? 'green'
    : normalized === 'medium' || normalized === 'recommended'
      ? 'amber'
      : normalized === 'high' || normalized === 'critical' || normalized === 'required'
        ? 'red'
        : 'neutral';
  const Icon = tone === 'green' ? CheckCircle2 : tone === 'red' ? ShieldAlert : tone === 'amber' ? AlertTriangle : Info;
  const label = t(`status.${normalized}`, { defaultValue: raw.replaceAll('_', ' ') });
  return <Badge tone={tone}><Icon className="h-3 w-3" />{label}</Badge>;
}

export function EvalStatus({ status }: { status: string }) {
  const { t } = useTranslation();
  const value = status.toLowerCase();
  const tone = value === 'completed' ? 'green' : value === 'failed' ? 'red' : value === 'processing' ? 'blue' : 'neutral';
  const Icon = value === 'completed' ? CheckCircle2 : value === 'failed' ? AlertTriangle : Clock3;
  return <Badge tone={tone}><Icon className="h-3 w-3" />{t(`status.${value}`, { defaultValue: value })}</Badge>;
}
