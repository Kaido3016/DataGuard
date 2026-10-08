import { describe, expect, it } from 'vitest';
import { createApiClient, parseErrorBody } from './client';
import { ApiError } from './errors';

interface Call {
  url: string;
  init: RequestInit;
}

function harness(respond: (call: Call) => Promise<Response> | Response, token: string | null = 'tok-123') {
  const calls: Call[] = [];
  const unauthorized: ApiError[] = [];
  const client = createApiClient({
    baseUrl: 'https://api.test',
    getToken: () => token,
    defaultTimeoutMs: 1000,
    onUnauthorized: (error) => unauthorized.push(error),
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = { url: String(input), init: init ?? {} };
      calls.push(call);
      return respond(call);
    }) as typeof fetch,
  });
  return { client, calls, unauthorized };
}

const json = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init });

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('expected the request to fail');
}

describe('createApiClient', () => {
  it('sends the bearer token, a request id, and never credentials/cookies', async () => {
    const { client, calls } = harness(() => json({ ok: true }));
    expect(await client.request('/api/v1/ping')).toEqual({ ok: true });
    const call = calls[0];
    expect(call?.url).toBe('https://api.test/api/v1/ping');
    const headers = call?.init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer tok-123');
    expect(headers['X-Request-ID']?.length).toBeGreaterThan(8);
    expect(call?.init.credentials).toBe('omit');
    expect(call?.init.cache).toBe('no-store');
  });

  it('omits the token for public calls', async () => {
    const { client, calls } = harness(() => json({}));
    await client.request('/health/ready', { auth: false });
    expect((calls[0]?.init.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });

  it('refuses to call authenticated endpoints without a token', async () => {
    const { client, calls } = harness(() => json({}), null);
    const error = await failure(client.request('/api/v1/analyze'));
    expect(error.kind).toBe('unauthorized');
    expect(calls).toHaveLength(0);
  });

  it('serialises JSON bodies and lets the browser set multipart boundaries', async () => {
    const { client, calls } = harness(() => json({}));
    await client.request('/a', { method: 'POST', json: { x: 1 } });
    expect(calls[0]?.init.body).toBe('{"x":1}');
    expect((calls[0]?.init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    const form = new FormData();
    form.append('file', new Blob(['x']), 'x.txt');
    await client.request('/b', { method: 'POST', formData: form });
    expect((calls[1]?.init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });

  it('rejects relative paths', async () => {
    const { client } = harness(() => json({}));
    await expect(client.request('api/v1/x')).rejects.toThrow();
  });

  it('maps HTTP statuses to typed errors and keeps backend detail', async () => {
    const cases: [number, string][] = [
      [401, 'unauthorized'],
      [403, 'forbidden'],
      [404, 'not_found'],
      [409, 'conflict'],
      [413, 'payload_too_large'],
      [429, 'rate_limited'],
      [400, 'validation'],
      [422, 'validation'],
      [503, 'server'],
      [418, 'http'],
    ];
    for (const [status, kind] of cases) {
      const { client } = harness(() => json({ detail: 'Insufficient privileges' }, { status }));
      const error = await failure(client.request('/x'));
      expect(error.kind).toBe(kind);
      expect(error.status).toBe(status);
      expect(error.detail).toBe('Insufficient privileges');
    }
  });

  it('notifies the session layer on 401 for authenticated calls only', async () => {
    const authed = harness(() => json({ detail: 'Invalid access token' }, { status: 401 }));
    await failure(authed.client.request('/api/v1/analyze'));
    expect(authed.unauthorized).toHaveLength(1);

    const login = harness(() => json({ detail: 'Invalid credentials' }, { status: 401 }));
    const error = await failure(login.client.request('/api/v1/auth/login', { method: 'POST', auth: false, json: {} }));
    expect(error.kind).toBe('unauthorized');
    expect(login.unauthorized).toHaveLength(0);
  });

  it('parses validation errors into field errors and retry-after hints', async () => {
    const body = { detail: [{ loc: ['body', 'text'], msg: 'String should have at least 1 character', type: 'x' }] };
    const { client } = harness(() => json(body, { status: 422, headers: { 'content-type': 'application/json', 'retry-after': '7' } }));
    const error = await failure(client.request('/x'));
    expect(error.fieldErrors).toEqual([{ field: 'text', message: 'String should have at least 1 character' }]);
    expect(error.retryAfterSeconds).toBe(7);
  });

  it('prefers the server request id when present', async () => {
    const { client } = harness(() => json({ detail: 'x' }, { status: 500, headers: { 'x-request-id': 'srv-1', 'content-type': 'application/json' } }));
    expect((await failure(client.request('/x'))).requestId).toBe('srv-1');
  });

  it('reports network failures, timeouts and caller aborts distinctly', async () => {
    const down = harness(() => {
      throw new TypeError('Failed to fetch');
    });
    expect((await failure(down.client.request('/x'))).kind).toBe('network');

    const hang = (call: Call): Promise<Response> =>
      new Promise((_resolve, reject) => {
        call.init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    const slow = harness(hang);
    expect((await failure(slow.client.request('/x', { timeoutMs: 20 }))).kind).toBe('timeout');

    const controller = new AbortController();
    const aborted = harness(hang);
    const pending = failure(aborted.client.request('/x', { signal: controller.signal }));
    controller.abort();
    expect((await pending).kind).toBe('aborted');
  });

  it('turns non-JSON success bodies into contract errors and handles 204', async () => {
    const html = harness(() => new Response('<html>', { status: 200 }));
    expect((await failure(html.client.request('/x'))).kind).toBe('contract');
    const empty = harness(() => new Response(null, { status: 204 }));
    expect(await empty.client.request('/x')).toBeNull();
  });
});

describe('parseErrorBody', () => {
  it('strips control characters and caps length', () => {
    const { detail } = parseErrorBody({ detail: `bad\u0000\u001bthing${'x'.repeat(500)}` });
    expect(detail?.includes('\u0000')).toBe(false);
    expect(detail?.length).toBeLessThanOrEqual(300);
  });
  it('tolerates unexpected shapes', () => {
    expect(parseErrorBody(null)).toEqual({ detail: null, fieldErrors: [] });
    expect(parseErrorBody({ detail: 42 })).toEqual({ detail: null, fieldErrors: [] });
  });
});
