import { api } from './client';
import type { AnalyticsData, EvaluationDetail, EvaluationListItem } from '@/types/domain';

export interface EvaluationFilters {
  search?: string;
  status?: string;
  model?: string;
  days?: number;
  min_score?: number;
  max_score?: number;
  risk?: string;
  limit?: number;
  offset?: number;
}

export interface ModelStatus {
  id: string;
  name: string;
  provider: string;
  model_type?: string;
  configured: boolean;
}

export const evaluationApi = {
  create: (form: FormData) => api.post<EvaluationDetail>('/evaluations', form),
  get: (id: string) => api.get<EvaluationDetail>(`/evaluations/${id}`),
  list: (filters: EvaluationFilters = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return api.get<{ items: EvaluationListItem[]; total: number; limit: number; offset: number }>(
      `/evaluations?${query}`,
    );
  },
  remove: (id: string) => api.delete(`/evaluations/${id}`),
  analytics: (days = 30) => api.get<AnalyticsData>(`/analytics?days=${days}`),
  createReview: (id: string, body: unknown) => api.post(`/evaluations/${id}/reviews`, body),
  createReport: (evaluationId: string, format = 'pdf') =>
    api.post<any>(`/reports?evaluation_id=${evaluationId}&format=${format}`, {}),
  models: () => api.get<ModelStatus[]>('/models'),
};
