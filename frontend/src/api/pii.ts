import { apiClient } from './http';
import { parseAnalyzeResult, parsePersistedAnalysis } from './parsers';
import type { AnalysisContext, AnalyzeResult, PersistedAnalysis } from '../types/analysis';

export interface CallOptions {
  readonly signal?: AbortSignal;
}

/** POST /api/v1/analyze — tenant-scoped text analysis (permission `analysis:write`). */
export async function analyzeText(
  text: string,
  context: AnalysisContext,
  options: CallOptions = {},
): Promise<AnalyzeResult> {
  const raw = await apiClient.request('/api/v1/analyze', {
    method: 'POST',
    signal: options.signal,
    json: {
      text,
      data_location: context.dataLocation,
      access_scope: context.accessScope,
      exposure: context.exposure,
      retention_days: context.retentionDays,
      encrypted_at_rest: context.encryptedAtRest,
      purpose_defined: context.purposeDefined,
      framework: context.framework,
    },
  });
  return parseAnalyzeResult(raw);
}

/** POST /api/v1/analyze-document — multipart upload (permission `analysis:write`). */
export async function analyzeDocument(file: File, options: CallOptions = {}): Promise<AnalyzeResult> {
  const form = new FormData();
  form.append('file', file, file.name);
  const raw = await apiClient.request('/api/v1/analyze-document', {
    method: 'POST',
    signal: options.signal,
    formData: form,
  });
  return parseAnalyzeResult(raw);
}

/** GET /api/v1/analyses/{id} — tenant-scoped; another tenant's id answers 404. */
export async function getAnalysis(id: string, options: CallOptions = {}): Promise<PersistedAnalysis> {
  const raw = await apiClient.request(`/api/v1/analyses/${encodeURIComponent(id)}`, {
    signal: options.signal,
  });
  return parsePersistedAnalysis(raw);
}
