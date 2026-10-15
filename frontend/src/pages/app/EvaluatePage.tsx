import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  CircleAlert,
  History as HistoryIcon,
  Languages,
  Loader2,
  Radio,
  RotateCcw,
  Scale,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { evaluationApi } from '@/api/evaluations';
import { ApiError, assetUrl } from '@/api/client';
import { PageHeader } from '@/components/common/PageHeader';
import { RiskBadge } from '@/components/common/Status';
import { ErrorState } from '@/components/common/States';
import { FindingCard } from '@/components/evaluation/FindingCard';
import { ImageUploader } from '@/components/evaluation/ImageUploader';
import { ScoreGauge } from '@/components/evaluation/ScoreGauge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Label, Select, Textarea } from '@/components/ui/Form';
import type { EvaluationDetail, Finding } from '@/types/domain';

type ModelStatus = {
  id: string;
  name: string;
  provider: string;
  configured: boolean;
};

export default function EvaluatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const evaluationId = params.get('id') ?? '';

  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [translation, setTranslation] = useState('');
  const [focus, setFocus] = useState('balanced');
  const [error, setError] = useState('');
  const [created, setCreated] = useState<EvaluationDetail | null>(null);
  const [decision, setDecision] = useState('approve');
  const [comment, setComment] = useState('');

  const models = useQuery<ModelStatus[]>({
    queryKey: ['models'],
    queryFn: evaluationApi.models,
  });
  const liveModel = models.data?.find((item) => item.configured) ?? null;

  const existing = useQuery({
    queryKey: ['evaluation', evaluationId],
    queryFn: () => evaluationApi.get(evaluationId),
    enabled: Boolean(evaluationId),
  });

  const mutation = useMutation({
    mutationFn: evaluationApi.create,
    onSuccess: (data) => {
      setCreated(data);
      setParams({ id: data.id }, { replace: true });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : t('evaluate.failed')),
  });

  const activeEvaluation = existing.data ?? (created?.id === evaluationId ? created : null);
  const result = activeEvaluation?.result ?? null;

  const review = useMutation({
    mutationFn: () =>
      evaluationApi.createReview(activeEvaluation!.id, {
        decision,
        comment,
        explanation: 'Reviewer decision submitted from the Evaluate workspace.',
        annotations: [],
      }),
  });

  const findings = useMemo(() => {
    if (!activeEvaluation) return [] as Array<Finding & { kind: 'cultural' | 'safety' | 'bias' }>;
    const all = [
      ...activeEvaluation.cultural_findings.map((item) => ({ ...item, kind: 'cultural' as const })),
      ...activeEvaluation.safety_findings.map((item) => ({ ...item, kind: 'safety' as const })),
      ...activeEvaluation.bias_findings.map((item) => ({ ...item, kind: 'bias' as const })),
    ];
    const weight = { critical: 4, high: 3, medium: 2, low: 1 } as const;
    return all.sort((a, b) => weight[b.severity] - weight[a.severity]).slice(0, 6);
  }, [activeEvaluation]);

  function run() {
    setError('');
    if (!liveModel) {
      setError(t('evaluate.providerMissing'));
      return;
    }
    if (!file) {
      setError(t('evaluate.missingImage'));
      return;
    }
    if (!prompt.trim()) {
      setError(t('evaluate.missingPrompt'));
      return;
    }

    const form = new FormData();
    form.append('image', file);
    form.append('prompt', prompt);
    form.append('evaluation_focus', focus);
    if (translation.trim()) form.append('prompt_translation', translation.trim());
    mutation.mutate(form);
  }

  function startNew() {
    setParams({}, { replace: true });
    setCreated(null);
    setFile(null);
    setPrompt('');
    setTranslation('');
    setError('');
    setComment('');
    setDecision('approve');
  }

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={t('evaluate.eyebrow')}
        title={t('evaluate.title')}
        subtitle={t('evaluate.subtitle')}
        actions={
          activeEvaluation ? (
            <Button variant="secondary" onClick={startNew} icon={<RotateCcw className="h-4 w-4" />}>
              {t('evaluate.new')}
            </Button>
          ) : undefined
        }
      />

      {/* Horizontal evaluation workspace. The real ImageUploader component is used here; this is not a static dropzone. */}
      {!activeEvaluation && !mutation.isPending && (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_1.45fr_.95fr]">
          <Card className="p-5 md:p-6">
            <h2 className="text-xl font-extrabold">{t('evaluate.upload')}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t('evaluate.inputDesc')}</p>
            <div className="mt-5">
              <ImageUploader file={file} onChange={setFile} />
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold">{t('evaluate.prompt')}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{t('evaluate.languageHint')}</p>
              </div>
              <span className="text-xs text-[var(--muted)]">{prompt.length}/8000</span>
            </div>

            <Textarea
              id="arabic-prompt"
              dir="rtl"
              lang="ar"
              className="mt-5 min-h-[245px] font-arabic text-base leading-8"
              value={prompt}
              maxLength={8000}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t('evaluate.promptPlaceholder')}
            />

            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
              <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t('evaluate.languageHint')}</span>
            </div>

            <details className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold">{t('evaluate.translation')}</summary>
              <Textarea
                id="translation"
                dir="ltr"
                className="mt-3 min-h-20 text-left"
                value={translation}
                onChange={(event) => setTranslation(event.target.value)}
                placeholder={t('evaluate.translationPlaceholder')}
              />
            </details>
          </Card>

          <Card className="p-5 md:p-6">
            <h2 className="text-xl font-extrabold">{t('evaluate.focus')}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{t('evaluate.liveNote')}</p>

            <div className="mt-5">
              <Label htmlFor="focus">{t('evaluate.focus')}</Label>
              <Select id="focus" value={focus} onChange={(event) => setFocus(event.target.value)}>
                <option value="balanced">{t('evaluate.balanced')}</option>
                <option value="cultural_accuracy">{t('evaluate.focusCultural')}</option>
                <option value="safety">{t('evaluate.focusSafety')}</option>
                <option value="bias">{t('evaluate.focusBias')}</option>
                <option value="similarity">{t('evaluate.focusSimilarity')}</option>
              </Select>
            </div>

            <div
              className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
                liveModel
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200'
                  : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {liveModel ? <Radio className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                <span>{liveModel ? t('evaluate.providerConnected') : t('evaluate.providerNotConfigured')}</span>
              </div>
              {liveModel ? (
                <div className="mt-2">
                  <p>{liveModel.name}</p>
                  <p className="text-xs opacity-80">{liveModel.provider}</p>
                </div>
              ) : (
                <p className="mt-2">{t('evaluate.providerSetupHint')}</p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
              >
                {error}
              </div>
            )}

            <Button
              onClick={run}
              loading={mutation.isPending}
              disabled={!liveModel || models.isLoading}
              className="mt-5 h-12 w-full text-base"
              icon={<Sparkles className="h-4 w-4" />}
            >
              {t('evaluate.run')}
            </Button>
          </Card>
        </div>
      )}

      <section className="mt-5 min-w-0 space-y-5">
        {mutation.isPending || (Boolean(evaluationId) && existing.isLoading && !created) ? (
          <Card className="grid min-h-[360px] place-items-center p-8 text-center">
            <div className="max-w-md">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold">{t('evaluate.processing')}</h2>
              <p className="mt-2 leading-7 text-[var(--muted)]">{t('evaluate.processingDesc')}</p>
              <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-violet-600" />
              </div>
            </div>
          </Card>
        ) : existing.isError ? (
          <ErrorState message={(existing.error as Error).message} onRetry={() => void existing.refetch()} />
        ) : activeEvaluation && !result ? (
          <ErrorState message={activeEvaluation.failure_reason || t('evaluate.failed')} onRetry={() => void existing.refetch()} />
        ) : activeEvaluation && result ? (
          <>
            <Card className="p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-xl font-extrabold">{t('evaluate.resultTitle')}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">{t('evaluate.resultSubtitle')}</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/app/history')}
                  icon={<HistoryIcon className="h-4 w-4" />}
                >
                  {t('evaluate.history')}
                </Button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ScoreGauge score={result.similarity_score} confidence={result.similarity_confidence} label={t('evaluate.similarity')} color="blue" />
                <ScoreGauge score={result.cultural_score} confidence={result.cultural_confidence} label={t('evaluate.cultural')} color="green" />
                <ScoreGauge score={result.safety_score} confidence={result.safety_confidence} label={t('evaluate.appropriate')} color="purple" />
                <div className="cg-card-flat flex flex-col items-center justify-center p-4 text-center">
                  <Scale className="h-8 w-8 text-amber-500" />
                  <p className="mt-3 text-sm font-bold">{t('evaluate.biasRisk')}</p>
                  <div className="mt-2"><RiskBadge risk={result.bias_risk} /></div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {Math.round(result.bias_confidence * 100)}% {t('evaluate.confidence')}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50 p-5 dark:border-blue-900 dark:from-blue-950/30 dark:to-violet-950/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-bold">{t('evaluate.summary')}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{result.summary}</p>
                    {result.limitations && <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{result.limitations}</p>}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-5 lg:grid-cols-[.78fr_1.22fr]">
              <Card className="overflow-hidden">
                <div className="border-b border-[var(--border)] p-5"><h3 className="font-bold">{t('evaluate.promptImage')}</h3></div>
                <img src={assetUrl(activeEvaluation.input.image_url)} alt="Evaluated AI-generated image" className="max-h-72 w-full bg-slate-50 object-contain dark:bg-slate-900" />
                <div className="p-5">
                  <p dir="rtl" lang="ar" className="font-arabic text-base leading-8">{activeEvaluation.input.prompt}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{activeEvaluation.model_name}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{activeEvaluation.evaluation_focus}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{t('evaluate.findings')}</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">{t('evaluate.findingsSubtitle')}</p>
                  </div>
                  <RiskBadge risk={result.review_recommendation} />
                </div>

                {findings.some((item) => item.severity !== 'low') ? (
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {findings.filter((item) => item.severity !== 'low').slice(0, 4).map((finding) => (
                      <FindingCard key={`${finding.kind}-${finding.id}`} finding={finding} type={finding.kind} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-5 text-sm leading-6 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200">
                    <CheckCircle2 className="mb-2 h-5 w-5" />
                    {t('evaluate.noElevated')}
                  </div>
                )}
              </Card>
            </div>

            <Card className="p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/30">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">{t('evaluate.review')}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{t('evaluate.reviewDesc')}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[.38fr_.62fr]">
                <div>
                  <Label htmlFor="decision">{t('evaluate.decision')}</Label>
                  <Select id="decision" value={decision} onChange={(event) => setDecision(event.target.value)}>
                    <option value="approve">{t('evaluate.decisionApprove')}</option>
                    <option value="confirm">{t('evaluate.decisionConfirm')}</option>
                    <option value="reject">{t('evaluate.decisionReject')}</option>
                    <option value="modify">{t('evaluate.decisionModify')}</option>
                    <option value="re_evaluate">{t('evaluate.decisionReevaluate')}</option>
                    <option value="escalate">{t('evaluate.decisionEscalate')}</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="review-comment">{t('evaluate.comment')}</Label>
                  <Textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('evaluate.commentPlaceholder')} className="min-h-24" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={() => review.mutate()} loading={review.isPending}>{t('evaluate.saveReview')}</Button>
                {review.isSuccess && <span className="text-sm font-semibold text-emerald-600">{t('evaluate.reviewSaved')}</span>}
              </div>
            </Card>
          </>
        ) : null}
      </section>
    </div>
  );
}
