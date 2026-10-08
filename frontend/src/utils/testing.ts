import type { AnalysisRecord } from '../types/analysis';
import type { Detection } from '../types/pii';
import type { RiskLevel } from '../types/risk';
import { buildRedactedPreview } from './redact';

/** Builds an unsigned JWT-shaped string for tests (signature is irrelevant to claim decoding). */
export function fakeToken(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

export function detection(partial: Partial<Detection> = {}): Detection {
  return {
    type: 'EMAIL',
    start: 0,
    end: 5,
    confidence: 0.98,
    detector: 'regex',
    redactedValue: '[REDACTED]',
    ...partial,
  };
}

export function record(
  key: string,
  level: RiskLevel,
  score: number,
  detections: Detection[],
  text?: string,
  createdAt: string | null = '2026-10-05T14:00:00.000Z',
): AnalysisRecord {
  return {
    key,
    analysisId: key.startsWith('local-') ? null : key,
    organizationId: 'org-1',
    origin: 'live',
    observedVia: 'this-session',
    source: { kind: 'text', label: 'Pasted text', document: null },
    createdAt,
    context: null,
    detections,
    risk: { score, level, factors: [], explanation: '', recommendations: [] },
    governance: null,
    preview: text === undefined ? null : buildRedactedPreview(text, detections),
    partial: false,
    warnings: [],
  };
}
