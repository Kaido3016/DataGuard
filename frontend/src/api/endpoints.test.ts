import { describe, expect, it } from 'vitest';
import { devLogin } from './auth';
import { getAuditIntegrity } from './audit';
import { getReadiness } from './health';
import { tokenStore } from './http';
import { analyzeDocument, analyzeText, getAnalysis } from './pii';
import { createPia, transitionPia } from './pia';
import { createRemediation } from './remediation';
import type { AnalysisContext } from '../types/analysis';

interface Recorded {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

/** Runs `fn` with a recording fetch stub; every request the API layer makes is captured. */
async function recording(fn: () => Promise<void>, respond: (path: string) => unknown): Promise<Recorded[]> {
  const calls: Recorded[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input), 'http://localhost').pathname;
    calls.push({
      method: init?.method ?? 'GET',
      path: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body instanceof FormData ? 'multipart' : init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify(respond(path)), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  tokenStore.set('test-token');
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
    tokenStore.clear();
  }
  return calls;
}

const risk = { score: 10, level: 'LOW', factors: [], explanation: '', recommendations: [] };
const context: AnalysisContext = {
  dataLocation: 'canada', accessScope: 'internal', exposure: 'internal', retentionDays: 30,
  encryptedAtRest: true, purposeDefined: true, framework: 'gdpr',
};
const draft = {
  projectName: 'P', systemDescription: 'S', personalInformation: ['a'], purposes: ['b'], dataSources: [],
  recipients: [], storageLocations: [], retention: '1y', risks: [{ title: 't', level: 'HIGH' as const, description: 'd', mitigation: 'm' }], safeguards: [],
};

const RESPONSES = (path: string): unknown => {
  if (path === '/api/v1/auth/login') return { access_token: 'a.b.c', token_type: 'bearer', expires_in: 900 };
  if (path.startsWith('/api/v1/analyses/')) return { id: 'x', organization_id: 'o', status: 'COMPLETED', result: { detections: [], risk, governance: null } };
  if (path === '/api/v1/analyze' || path === '/api/v1/analyze-document') return { analysis_id: 'x', organization_id: 'o', detections: [], risk, governance: null };
  if (path.startsWith('/api/v1/pias')) return { id: 'p', organization_id: 'o', project_name: 'P', status: 'DRAFT', version: 1 };
  if (path === '/api/v1/remediations') return { id: 'r', organization_id: 'o', status: 'OPEN', priority: 'HIGH' };
  if (path === '/api/v1/audit/integrity') return { valid: true, records_checked: 0, first_broken_link: null };
  return { status: 'ok', database: 'ok' };
};

describe('API layer only calls endpoints that exist in the backend', () => {
  it('uses exactly the documented method + path set, with the right credentials and bodies', async () => {
    const calls = await recording(async () => {
      await devLogin({ organizationSlug: ' acme ', email: ' a@b.test ', password: 'pw' });
      await analyzeText('hello', context);
      await analyzeDocument(new File(['x'], 'x.txt', { type: 'text/plain' }));
      await getAnalysis('id/with space');
      await createPia(draft);
      await transitionPia('abc', 'IN_REVIEW', 'ready');
      await createRemediation({ title: 't', description: 'd', analysisId: null, priority: 'HIGH', ownerId: null });
      await getAuditIntegrity();
      await getReadiness();
    }, RESPONSES);

    expect(calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /api/v1/auth/login',
      'POST /api/v1/analyze',
      'POST /api/v1/analyze-document',
      'GET /api/v1/analyses/id%2Fwith%20space',
      'POST /api/v1/pias',
      'POST /api/v1/pias/abc/transition',
      'POST /api/v1/remediations',
      'GET /api/v1/audit/integrity',
      'GET /health/ready',
    ]);
    // Public calls carry no token; every other call carries the bearer token.
    expect(calls.filter((call) => call.headers['Authorization'] === undefined).map((call) => call.path)).toEqual([
      '/api/v1/auth/login',
      '/health/ready',
    ]);
    expect(calls.filter((call) => call.headers['Authorization'] === 'Bearer test-token')).toHaveLength(7);

    expect(calls[0]?.body).toEqual({ organization_slug: 'acme', email: 'a@b.test', password: 'pw' });
    expect(calls[1]?.body).toEqual({
      text: 'hello', data_location: 'canada', access_scope: 'internal', exposure: 'internal',
      retention_days: 30, encrypted_at_rest: true, purpose_defined: true, framework: 'gdpr',
    });
    expect(calls[2]?.body).toBe('multipart');
    expect(calls[4]?.body).toMatchObject({ project_name: 'P', personal_information: ['a'], retention: '1y' });
    expect(calls[5]?.body).toEqual({ target: 'IN_REVIEW', reason: 'ready' });
    expect(calls[6]?.body).toEqual({ title: 't', description: 'd', analysis_id: null, priority: 'HIGH', owner_id: null });
  });
});
