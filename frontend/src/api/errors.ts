export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'payload_too_large'
  | 'server'
  | 'contract'
  | 'http';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface ApiErrorInit {
  readonly kind: ApiErrorKind;
  readonly status?: number | null;
  /** Short, server-provided explanation. Never contains tokens or PII (backend returns generic text). */
  readonly detail?: string | null;
  readonly requestId?: string | null;
  readonly retryAfterSeconds?: number | null;
  readonly fieldErrors?: readonly FieldError[];
}

/**
 * Single error type thrown by the API layer. Components switch on `kind`, so every failure mode
 * (expired session, missing permission, validation, outage, ...) has a distinct, typed path.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly detail: string | null;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;
  readonly fieldErrors: readonly FieldError[];

  constructor(init: ApiErrorInit) {
    super(init.detail ?? init.kind);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.detail = init.detail ?? null;
    this.requestId = init.requestId ?? null;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
    this.fieldErrors = init.fieldErrors ?? [];
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isKind(error: unknown, ...kinds: ApiErrorKind[]): error is ApiError {
  return isApiError(error) && kinds.includes(error.kind);
}

export function contractError(what: string): ApiError {
  return new ApiError({ kind: 'contract', detail: `Unexpected API response: ${what}` });
}

/** Maps an HTTP status to an error kind. */
export function kindForStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 413) return 'payload_too_large';
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 422) return 'validation';
  if (status >= 500) return 'server';
  return 'http';
}
