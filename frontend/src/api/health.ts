import { apiClient } from './http';
import { parseHealth } from './parsers';
import type { CallOptions } from './pii';
import type { HealthStatus } from '../types/audit';

/** GET /health/ready — unauthenticated readiness (database / cache). */
export async function getReadiness(options: CallOptions = {}): Promise<HealthStatus> {
  const raw = await apiClient.request('/health/ready', {
    auth: false,
    timeoutMs: 8000,
    signal: options.signal,
  });
  return parseHealth(raw);
}
