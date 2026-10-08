import { config } from '../constants/config';
import { createApiClient } from './client';
import type { ApiError } from './errors';

/**
 * The bearer token lives in this module-level closure only: not in React state, not in
 * localStorage/sessionStorage/cookies, and never logged. A page reload therefore signs the user
 * out, which is the intended behaviour for a short-lived (15 min) access token.
 */
let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};

let unauthorizedHandler: ((error: ApiError) => void) | null = null;

/** Registered by the AuthProvider so a 401 anywhere signs the user out consistently. */
export function setUnauthorizedHandler(handler: ((error: ApiError) => void) | null): void {
  unauthorizedHandler = handler;
}

export const apiClient = createApiClient({
  baseUrl: config.apiBaseUrl,
  getToken: tokenStore.get,
  defaultTimeoutMs: config.requestTimeoutMs,
  onUnauthorized: (error) => unauthorizedHandler?.(error),
});
