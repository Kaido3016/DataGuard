import { ApiError, kindForStatus } from './errors';
import type { FieldError } from './errors';
import { isRecord } from '../utils/guards';
import { requestId as newRequestId } from '../utils/id';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  readonly method?: HttpMethod;
  /** JSON body (serialised by the client). */
  readonly json?: unknown;
  /** Multipart body, e.g. a document upload. The browser sets the boundary header. */
  readonly formData?: FormData;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** Attach the bearer token (default true). Public endpoints and sign-in set this to false. */
  readonly auth?: boolean;
}

export interface ApiClientDeps {
  readonly baseUrl: string;
  readonly getToken: () => string | null;
  readonly defaultTimeoutMs: number;
  /** Called when an authenticated request is rejected with 401 (session expired / revoked). */
  readonly onUnauthorized?: (error: ApiError) => void;
  /** Injectable for tests. */
  readonly fetchImpl?: typeof fetch;
}

export interface ApiClient {
  /** Performs a request and returns the parsed JSON body (null for 204). */
  request(path: string, options?: RequestOptions): Promise<unknown>;
}

const MAX_DETAIL_CHARS = 300;

function sanitizeDetail(detail: string): string {
  return detail.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_DETAIL_CHARS);
}

/** Extracts a short message and field errors from FastAPI-style `{ "detail": ... }` bodies. */
export function parseErrorBody(body: unknown): { detail: string | null; fieldErrors: FieldError[] } {
  if (!isRecord(body)) return { detail: null, fieldErrors: [] };
  const raw = body['detail'];
  if (typeof raw === 'string') return { detail: sanitizeDetail(raw), fieldErrors: [] };
  if (Array.isArray(raw)) {
    const fieldErrors: FieldError[] = [];
    for (const item of raw) {
      if (!isRecord(item)) continue;
      const message = typeof item['msg'] === 'string' ? sanitizeDetail(item['msg']) : '';
      const loc = Array.isArray(item['loc']) ? item['loc'] : [];
      const field = loc.filter((part) => part !== 'body').map(String).join('.');
      if (message) fieldErrors.push({ field, message });
    }
    return { detail: fieldErrors[0]?.message ?? null, fieldErrors };
  }
  return { detail: null, fieldErrors: [] };
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined; // not JSON
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds) : null;
}

export function createApiClient(deps: ApiClientDeps): ApiClient {
  const fetchImpl = deps.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
    if (!path.startsWith('/')) throw new Error('API paths must start with "/"');
    const useAuth = options.auth ?? true;
    const correlationId = newRequestId();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-ID': correlationId,
    };
    if (useAuth) {
      const token = deps.getToken();
      if (!token) {
        throw new ApiError({ kind: 'unauthorized', status: 401, requestId: correlationId });
      }
      headers['Authorization'] = `Bearer ${token}`;
    }
    let body: BodyInit | undefined;
    if (options.formData) {
      body = options.formData;
    } else if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.json);
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeoutMs = options.timeoutMs ?? deps.defaultTimeoutMs;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = (): void => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      let response: Response;
      try {
        response = await fetchImpl(`${deps.baseUrl}${path}`, {
          method: options.method ?? 'GET',
          headers,
          body,
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
        });
      } catch (cause) {
        if (timedOut) throw new ApiError({ kind: 'timeout', requestId: correlationId });
        if (controller.signal.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) {
          throw new ApiError({ kind: 'aborted', requestId: correlationId });
        }
        throw new ApiError({ kind: 'network', requestId: correlationId });
      }

      const serverRequestId = response.headers.get('x-request-id');
      let parsed: unknown;
      try {
        parsed = await readBody(response);
      } catch {
        if (timedOut) throw new ApiError({ kind: 'timeout', requestId: correlationId });
        throw new ApiError({ kind: 'network', requestId: correlationId });
      }

      if (!response.ok) {
        const { detail, fieldErrors } = parseErrorBody(parsed);
        const error = new ApiError({
          kind: kindForStatus(response.status),
          status: response.status,
          detail,
          fieldErrors,
          requestId: serverRequestId ?? correlationId,
          retryAfterSeconds: parseRetryAfter(response.headers.get('retry-after')),
        });
        if (error.kind === 'unauthorized' && useAuth) deps.onUnauthorized?.(error);
        throw error;
      }
      if (parsed === undefined) {
        throw new ApiError({
          kind: 'contract',
          status: response.status,
          detail: 'Response was not valid JSON',
          requestId: serverRequestId ?? correlationId,
        });
      }
      return parsed;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  return { request };
}
