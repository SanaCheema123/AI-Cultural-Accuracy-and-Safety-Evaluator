import type { ReactNode } from 'react';

import {
  Navigate,
  useLocation,
} from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const accessToken =
    useAuthStore(
      (state) => state.accessToken,
    );

  const refreshToken =
    useAuthStore(
      (state) => state.refreshToken,
    );

  const user =
    useAuthStore(
      (state) => state.user,
    );

  const location =
    useLocation();

  /*
   * A complete session requires:
   *
   * access token
   * refresh token
   * user
   *
   * A stale token string alone is NOT enough.
   */
  const hasSession =
    Boolean(
      accessToken &&
      refreshToken &&
      user,
    );

  if (!hasSession) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{
          from:
            location.pathname +
            location.search,
        }}
      />
    );
  }

  return <>{children}</>;
}