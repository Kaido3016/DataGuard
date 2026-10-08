import { apiClient } from './http';
import { parseLoginResult } from './parsers';
import type { DevLoginInput, LoginResult } from '../types/auth';

/**
 * Local-development sign-in. The backend only serves this route when
 * DATAGUARD_ENVIRONMENT=development (otherwise 404); production identity is delegated to an
 * external OIDC provider and the SPA receives a bearer token from it.
 */
export async function devLogin(input: DevLoginInput, signal?: AbortSignal): Promise<LoginResult> {
  const raw = await apiClient.request('/api/v1/auth/login', {
    method: 'POST',
    auth: false,
    signal,
    json: {
      organization_slug: input.organizationSlug.trim(),
      email: input.email.trim(),
      password: input.password,
    },
  });
  return parseLoginResult(raw);
}
