import { apiClient } from './http';
import { parseRemediationSummary } from './parsers';
import type { CallOptions } from './pii';
import type { RemediationInput, RemediationSummary } from '../types/remediation';

/** POST /api/v1/remediations — creates an OPEN item (permission `analysis:write`). */
export async function createRemediation(
  input: RemediationInput,
  options: CallOptions = {},
): Promise<RemediationSummary> {
  const raw = await apiClient.request('/api/v1/remediations', {
    method: 'POST',
    signal: options.signal,
    json: {
      title: input.title,
      description: input.description,
      analysis_id: input.analysisId,
      priority: input.priority,
      owner_id: input.ownerId,
    },
  });
  return parseRemediationSummary(raw);
}
