import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

export const authService = {
  async login(email: string, password: string) {
    const session = await api.post<any>('/auth/login', { email, password });
    useAuthStore.getState().setSession(session);
    return session;
  },
  async register(data: { email: string; password: string; full_name: string }) {
    const session = await api.post<any>('/auth/register', data);
    useAuthStore.getState().setSession(session);
    return session;
  },
  async me() {
    return api.get<any>('/auth/me');
  },
  async preferences(preferences: { preferred_language?: string; theme?: string }) {
    return api.patch<any>('/auth/me/preferences', preferences);
  },
};
