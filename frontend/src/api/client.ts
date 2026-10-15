import { useAuthStore } from '@/stores/authStore';

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  '/api/v1';

/* =========================================================
   API ERROR
========================================================= */

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/* =========================================================
   REFRESH RESPONSE
========================================================= */

/*
 * IMPORTANT:
 *
 * /auth/refresh ko full user session return karne ki
 * zarurat nahi hai.
 *
 * Usually backend returns:
 *
 * {
 *   access_token: "...",
 *   refresh_token: "...",
 *   token_type: "bearer",
 *   expires_in: 1800
 * }
 */
type RefreshTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
};

/* =========================================================
   SINGLE REFRESH REQUEST
========================================================= */

/*
 * Agar analytics, evaluations aur models ek hi waqt
 * 401 return karein, to 3 refresh requests nahi chalni
 * chahiye.
 *
 * Sab requests same refresh promise use karengi.
 */
let refreshInFlight: Promise<string | null> | null = null;

/* =========================================================
   ASSET URL
========================================================= */

export function assetUrl(
  path?: string | null,
): string {
  if (!path) {
    return '';
  }

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  const root = API_URL.replace(
    /\/api\/v1\/?$/,
    '',
  );

  return `${root}${path}`;
}

/* =========================================================
   ERROR HELPERS
========================================================= */

function getErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (
    !payload ||
    typeof payload !== 'object'
  ) {
    return fallback;
  }

  const data =
    payload as Record<string, any>;

  /*
   * {
   *   error: {
   *     message: "..."
   *   }
   * }
   */
  if (
    typeof data.error?.message === 'string'
  ) {
    return data.error.message;
  }

  /*
   * {
   *   detail: "..."
   * }
   */
  if (
    typeof data.detail === 'string'
  ) {
    return data.detail;
  }

  /*
   * {
   *   detail: {
   *     message: "..."
   *   }
   * }
   */
  if (
    data.detail &&
    typeof data.detail === 'object' &&
    typeof data.detail.message === 'string'
  ) {
    return data.detail.message;
  }

  /*
   * {
   *   message: "..."
   * }
   */
  if (
    typeof data.message === 'string'
  ) {
    return data.message;
  }

  return fallback;
}

function getErrorCode(
  payload: unknown,
): string | undefined {
  if (
    !payload ||
    typeof payload !== 'object'
  ) {
    return undefined;
  }

  const data =
    payload as Record<string, any>;

  if (
    typeof data.error?.code === 'string'
  ) {
    return data.error.code;
  }

  if (
    typeof data.detail?.code === 'string'
  ) {
    return data.detail.code;
  }

  return undefined;
}

function getErrorDetails(
  payload: unknown,
): unknown {
  if (
    !payload ||
    typeof payload !== 'object'
  ) {
    return undefined;
  }

  const data =
    payload as Record<string, any>;

  return (
    data.error?.details ??
    data.detail?.details
  );
}

/* =========================================================
   PUBLIC AUTH PATHS
========================================================= */

/*
 * In requests ke saath stale Bearer token attach nahi karna.
 */
function isPublicAuthPath(
  path: string,
): boolean {
  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
  ];

  return publicPaths.some(
    (publicPath) =>
      path.startsWith(publicPath),
  );
}

/* =========================================================
   REFRESH ACCESS TOKEN
========================================================= */

async function doRefresh():
  Promise<string | null> {
  const {
    refreshToken,
    setTokens,
    logout,
  } = useAuthStore.getState();

  /*
   * Refresh token hi nahi hai.
   * Session recover nahi ho sakti.
   */
  if (!refreshToken) {
    logout();
    return null;
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL}/auth/refresh`,
      {
        method: 'POST',

        headers: {
          Accept: 'application/json',
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          refresh_token:
            refreshToken,
        }),
      },
    );
  } catch {
    /*
     * Network error par session delete nahi karte.
     * Ho sakta hai backend temporarily unavailable ho.
     */
    throw new ApiError(
      'Unable to refresh your CulturalGuard session. Check your connection and backend service.',
      0,
      'network_error',
    );
  }

  const payload =
    await response
      .json()
      .catch(() => null);

  /*
   * Refresh token bhi expired/invalid hai.
   */
  if (
    response.status === 401 ||
    response.status === 403
  ) {
    logout();
    return null;
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(
        payload,
        `Session refresh failed (${response.status}).`,
      ),
      response.status,
      getErrorCode(payload),
      getErrorDetails(payload),
    );
  }

  const tokens =
    (payload?.data ??
      payload) as RefreshTokenResponse | null;

  /*
   * Backend response validate karo.
   */
  if (
    !tokens ||
    typeof tokens.access_token !== 'string' ||
    !tokens.access_token ||
    typeof tokens.refresh_token !== 'string' ||
    !tokens.refresh_token
  ) {
    logout();

    return null;
  }

  /*
   * IMPORTANT:
   *
   * Yahan setSession() nahi use karna.
   *
   * Refresh endpoint sirf token pair return karta hai.
   * Existing user state ko preserve rakho.
   */
  setTokens(
    tokens.access_token,
    tokens.refresh_token,
  );

  return tokens.access_token;
}

async function refreshAccessToken():
  Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight =
      doRefresh().finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

/* =========================================================
   REQUEST
========================================================= */

async function request<T>(
  path: string,
  init: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  /*
   * Actual fetch helper.
   *
   * Isko second attempt mein newly refreshed token ke
   * saath dobara call kiya ja sakta hai.
   */
  const performFetch = async (
    token?: string | null,
  ): Promise<Response> => {
    const headers =
      new Headers(init.headers);

    headers.set(
      'Accept',
      'application/json',
    );

    /*
     * Protected API requests ke saath access token bhejo.
     *
     * Login/Register waghera ke saath stale token nahi.
     */
    if (
      token &&
      !isPublicAuthPath(path)
    ) {
      headers.set(
        'Authorization',
        `Bearer ${token}`,
      );
    }

    /*
     * FormData ke liye manually Content-Type set nahi karna.
     * Browser multipart boundary khud generate karega.
     */
    if (
      init.body &&
      !(init.body instanceof FormData) &&
      !headers.has('Content-Type')
    ) {
      headers.set(
        'Content-Type',
        'application/json',
      );
    }

    try {
      return await fetch(
        `${API_URL}${path}`,
        {
          ...init,
          headers,
        },
      );
    } catch {
      throw new ApiError(
        'Unable to reach CulturalGuard API. Check your connection and backend service.',
        0,
        'network_error',
      );
    }
  };

  /* ---------------------------------------------------------
     FIRST REQUEST
  --------------------------------------------------------- */

  let response =
    await performFetch(
      useAuthStore.getState()
        .accessToken,
    );

  /* ---------------------------------------------------------
     ACCESS TOKEN EXPIRED
  --------------------------------------------------------- */

  /*
   * Flow:
   *
   * protected request
   *      ↓
   *     401
   *      ↓
   * /auth/refresh
   *      ↓
   * new access/refresh token
   *      ↓
   * retry original request ONCE
   */
  if (
    response.status === 401 &&
    allowRefresh &&
    !isPublicAuthPath(path) &&
    path !== '/auth/refresh'
  ) {
    const newAccessToken =
      await refreshAccessToken();

    if (!newAccessToken) {
      /*
       * Refresh token bhi invalid tha.
       */
      useAuthStore
        .getState()
        .logout();

      throw new ApiError(
        'Your session has expired. Please sign in again.',
        401,
        'session_expired',
      );
    }

    /*
     * Original request ko new access token ke saath
     * sirf once retry karo.
     */
    response =
      await performFetch(
        newAccessToken,
      );
  }

  /* ---------------------------------------------------------
     NO CONTENT
  --------------------------------------------------------- */

  if (
    response.status === 204
  ) {
    return undefined as T;
  }

  /* ---------------------------------------------------------
     RESPONSE BODY
  --------------------------------------------------------- */

  const payload =
    await response
      .json()
      .catch(() => null);

  /* ---------------------------------------------------------
     API ERROR
  --------------------------------------------------------- */

  if (!response.ok) {
    /*
     * Refresh ke baad bhi 401 aa raha hai.
     *
     * Session valid nahi hai.
     */
    if (
      response.status === 401 &&
      !isPublicAuthPath(path)
    ) {
      useAuthStore
        .getState()
        .logout();
    }

    throw new ApiError(
      getErrorMessage(
        payload,
        `Request failed (${response.status}).`,
      ),
      response.status,
      getErrorCode(payload),
      getErrorDetails(payload),
    );
  }

  /* ---------------------------------------------------------
     SUCCESS RESPONSE
  --------------------------------------------------------- */

  return (
    payload?.data ??
    payload
  ) as T;
}

/* =========================================================
   PUBLIC API CLIENT
========================================================= */

export const api = {
  get: <T>(
    path: string,
  ) =>
    request<T>(
      path,
    ),

  post: <T>(
    path: string,
    body?: unknown,
  ) =>
    request<T>(
      path,
      {
        method: 'POST',

        body:
          body instanceof FormData
            ? body
            : JSON.stringify(
                body ?? {},
              ),
      },
    ),

  patch: <T>(
    path: string,
    body: unknown,
  ) =>
    request<T>(
      path,
      {
        method: 'PATCH',

        body:
          JSON.stringify(body),
      },
    ),

  delete: <T>(
    path: string,
  ) =>
    request<T>(
      path,
      {
        method: 'DELETE',
      },
    ),
};