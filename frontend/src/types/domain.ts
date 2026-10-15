export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Finding {
  id: string;
  category: string;
  severity: Severity;
  confidence: number;
  evidence: string;
  explanation: string;
  recommendation: string;
  status: string;
  uncertainty?: string;
  risk_level?: string;
  finding?: string;
}

export interface EvaluationResult {
  id: string;
  similarity_score: number;
  similarity_confidence: number;
  similarity_status: string;
  cultural_score: number;
  cultural_confidence: number;
  safety_score: number;
  safety_confidence: number;
  bias_risk: string;
  bias_confidence: number;
  overall_status: string;
  overall_confidence: number;
  review_recommendation: string;
  summary: string;
  limitations: string;
}

export interface EvaluationInput {
  prompt: string;
  prompt_language: string;
  prompt_translation?: string | null;
  image_url: string;
  image_filename: string;
  image_mime: string;
  image_size_bytes: number;
  image_width?: number;
  image_height?: number;
}

export interface EvaluationDetail {
  id: string;
  model_name: string;
  status: string;
  mode: string;
  evaluation_focus: string;
  progress_step: string;
  progress_percent: number;
  created_at: string;
  completed_at?: string | null;
  failure_reason?: string | null;
  input: EvaluationInput;
  result?: EvaluationResult | null;
  cultural_findings: Finding[];
  safety_findings: Finding[];
  bias_findings: Finding[];
}

export interface EvaluationListItem {
  id: string;
  prompt: string;
  image_url: string;
  model_name: string;
  status: string;
  mode: string;
  evaluation_focus: string;
  cultural_score?: number | null;
  safety_score?: number | null;
  similarity_score?: number | null;
  bias_risk?: string | null;
  flags: number;
  review_recommendation?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface AnalyticsData {
  period_days: number;
  kpis: {
    total_evaluations: number;
    average_cultural_accuracy: number;
    safety_pass_rate: number;
    human_reviews_pending: number;
  };
  volume: Array<{ date: string; count: number }>;
  model_performance: Array<{ model: string; count: number; cultural: number; safety: number; similarity: number }>;
  flag_distribution: Array<{ category: string; count: number }>;
}
