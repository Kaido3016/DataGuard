import { apiClient } from './http';
import { parseAuditIntegrity } from './parsers';
import type { CallOptions } from './pii';
import type { AuditIntegrity } from '../types/audit';

/** GET /api/v1/audit/integrity — verifies the caller's tenant hash chain (permission `audit:read`). */
export async function getAuditIntegrity(options: CallOptions = {}): Promise<AuditIntegrity> {
  const raw = await apiClient.request('/api/v1/audit/integrity', { signal: options.signal });
  return parseAuditIntegrity(raw);
}
