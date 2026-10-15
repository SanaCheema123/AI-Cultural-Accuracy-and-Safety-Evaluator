import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  full_name: string;
  preferred_language: string;
  theme: string;
  workspace_id?: string;
  role?: string;
}

export interface SessionPayload {
  access_token: string;
  refresh_token: string;
  user: User;
  workspace_id: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;

  setSession: (session: SessionPayload) => void;

  setTokens: (
    accessToken: string,
    refreshToken: string,
  ) => void;

  logout: () => void;
}

/* -------------------------------------------------------
   STORAGE HELPERS
------------------------------------------------------- */

const ACCESS_KEY = 'cg-access';
const REFRESH_KEY = 'cg-refresh';
const USER_KEY = 'cg-user';

function storageAvailable() {
  return typeof window !== 'undefined';
}

function removeStoredSession() {
  if (!storageAvailable()) {
    return;
  }

  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

function readStoredUser(): User | null {
  if (!storageAvailable()) {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<User>;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.id !== 'string' ||
      typeof parsed.email !== 'string'
    ) {
      removeStoredSession();
      return null;
    }

    return parsed as User;
  } catch {
    removeStoredSession();
    return null;
  }
}

function readInitialSession() {
  if (!storageAvailable()) {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  const accessToken =
    localStorage.getItem(ACCESS_KEY);

  const refreshToken =
    localStorage.getItem(REFRESH_KEY);

  const user = readStoredUser();

  /*
   * Avoid half-valid sessions.
   *
   * Example:
   * access token exists
   * but user/refresh token missing
   *
   * This should not be treated as authenticated.
   */
  if (
    !accessToken ||
    !refreshToken ||
    !user
  ) {
    removeStoredSession();

    return {
      accessToken: null,
      refreshToken: null,
      user: null,
    };
  }

  return {
    accessToken,
    refreshToken,
    user,
  };
}

const initialSession =
  readInitialSession();

/* -------------------------------------------------------
   STORE
------------------------------------------------------- */

export const useAuthStore =
  create<AuthState>((set) => ({
    accessToken:
      initialSession.accessToken,

    refreshToken:
      initialSession.refreshToken,

    user:
      initialSession.user,

    /*
     * Use after LOGIN / REGISTER when backend returns
     * full user + workspace session.
     */
    setSession: (session) => {
      const nextUser: User = {
        ...session.user,
        workspace_id:
          session.workspace_id,
        role:
          session.role,
      };

      if (storageAvailable()) {
        localStorage.setItem(
          ACCESS_KEY,
          session.access_token,
        );

        localStorage.setItem(
          REFRESH_KEY,
          session.refresh_token,
        );

        localStorage.setItem(
          USER_KEY,
          JSON.stringify(nextUser),
        );
      }

      set({
        accessToken:
          session.access_token,

        refreshToken:
          session.refresh_token,

        user:
          nextUser,
      });
    },

    /*
     * Use after /auth/refresh when backend returns
     * only access_token + refresh_token.
     *
     * Existing user information is preserved.
     */
    setTokens: (
      accessToken,
      refreshToken,
    ) => {
      if (storageAvailable()) {
        localStorage.setItem(
          ACCESS_KEY,
          accessToken,
        );

        localStorage.setItem(
          REFRESH_KEY,
          refreshToken,
        );
      }

      set({
        accessToken,
        refreshToken,
      });
    },

    logout: () => {
      removeStoredSession();

      set({
        accessToken: null,
        refreshToken: null,
        user: null,
      });
    },
  }));