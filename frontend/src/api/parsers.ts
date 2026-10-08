import { contractError } from './errors';
import type { AnalyzeResult, ControlFinding, Governance, PersistedAnalysis } from '../types/analysis';
import type { AuditIntegrity, HealthStatus } from '../types/audit';
import type { LoginResult } from '../types/auth';
import type { Detection, DocumentMeta } from '../types/pii';
import type { PiaSummary } from '../types/pia';
import type { RemediationSummary } from '../types/remediation';
import type { RiskAssessment, RiskFactor } from '../types/risk';
import { asNumber, asRecordArray, asString, asStringArray, clamp, isRecord } from '../utils/guards';
import type { JsonRecord } from '../utils/guards';
import { normalizeLevel } from '../utils/risk';

/**
 * Runtime validation of API payloads. TypeScript types are erased at runtime, so every response
 * is checked before it reaches the UI; a malformed payload becomes a typed `contract` error
 * instead of a crash deep inside a component.
 */

function requireRecord(value: unknown, what: string): JsonRecord {
  if (!isRecord(value)) throw contractError(what);
  return value;
}

export function parseDetection(raw: unknown): Detection {
  const item = requireRecord(raw, 'detection');
  const type = asString(item['type']);
  const start = asNumber(item['start'], -1);
  const end = asNumber(item['end'], -1);
  if (!type || start < 0 || end < start) throw contractError('detection fields');
  return {
    type,
    start,
    end,
    confidence: clamp(asNumber(item['confidence']), 0, 1),
    detector: asString(item['detector'], 'unknown'),
    // The API only ever returns a redacted placeholder; never trust it to be raw-free either.
    redactedValue: asString(item['redacted_value'], '[REDACTED]'),
  };
}

function parseFactor(raw: JsonRecord): RiskFactor {
  return {
    name: asString(raw['name'], 'other'),
    points: asNumber(raw['points']),
    detail: asString(raw['detail']),
  };
}

export function parseRisk(raw: unknown): RiskAssessment {
  const item = requireRecord(raw, 'risk');
  const score = clamp(asNumber(item['score'], Number.NaN), 0, 100);
  if (Number.isNaN(score)) throw contractError('risk score');
  return {
    score,
    level: normalizeLevel(item['level'], score),
    factors: asRecordArray(item['factors']).map(parseFactor),
    explanation: asString(item['explanation']),
    recommendations: asStringArray(item['recommendations']),
  };
}

function parseControl(raw: JsonRecord): ControlFinding {
  return {
    ruleId: asString(raw['rule_id'], 'unknown'),
    // Backend quirk: this field carries the rule version, not the framework name.
    ruleVersion: asString(raw['framework']),
    status: asString(raw['status'], 'UNKNOWN'),
    severity: asString(raw['severity'], 'unknown'),
    reason: asString(raw['reason']),
    requiredEvidence: asStringArray(raw['required_evidence']),
    remediation: asStringArray(raw['remediation']),
  };
}

export function parseGovernance(raw: unknown): Governance | null {
  if (raw === null || raw === undefined) return null;
  const item = requireRecord(raw, 'governance');
  return {
    framework: asString(item['framework'], 'unknown'),
    findings: asRecordArray(item['findings']).map(parseControl),
  };
}

export function parseAnalyzeResult(raw: unknown): AnalyzeResult {
  const item = requireRecord(raw, 'analysis');
  if (!Array.isArray(item['detections'])) throw contractError('detections');
  const analysisId = item['analysis_id'];
  return {
    analysisId: typeof analysisId === 'string' && analysisId ? analysisId : null,
    organizationId: asString(item['organization_id']),
    detections: item['detections'].map(parseDetection),
    risk: parseRisk(item['risk']),
    governance: parseGovernance(item['governance']),
  };
}

export function parseDocumentMeta(raw: unknown): DocumentMeta | null {
  if (!isRecord(raw)) return null;
  const pageCount = raw['page_count'];
  return {
    filename: asString(raw['filename'], 'document'),
    documentType: asString(raw['document_type'], 'unknown'),
    pageCount: typeof pageCount === 'number' && Number.isFinite(pageCount) ? pageCount : null,
    warnings: asStringArray(raw['warnings']),
  };
}

/** GET /api/v1/analyses/{id} wraps the stored payload in `result`. */
export function parsePersistedAnalysis(raw: unknown): PersistedAnalysis {
  const item = requireRecord(raw, 'persisted analysis');
  const id = asString(item['id']);
  if (!id) throw contractError('analysis id');
  const result = requireRecord(item['result'], 'analysis result');
  if (!Array.isArray(result['detections'])) throw contractError('detections');
  return {
    id,
    organizationId: asString(item['organization_id']),
    status: asString(item['status'], 'UNKNOWN'),
    detections: result['detections'].map(parseDetection),
    risk: parseRisk(result['risk']),
    governance: parseGovernance(result['governance']),
    document: parseDocumentMeta(result['document']),
  };
}

export function parsePiaSummary(raw: unknown): PiaSummary {
  const item = requireRecord(raw, 'pia');
  const id = asString(item['id']);
  if (!id) throw contractError('pia id');
  return {
    id,
    organizationId: asString(item['organization_id']),
    projectName: asString(item['project_name']),
    status: asString(item['status'], 'UNKNOWN'),
    version: asNumber(item['version'], 1),
  };
}

export function parseRemediationSummary(raw: unknown): RemediationSummary {
  const item = requireRecord(raw, 'remediation');
  const id = asString(item['id']);
  if (!id) throw contractError('remediation id');
  return {
    id,
    organizationId: asString(item['organization_id']),
    status: asString(item['status'], 'OPEN'),
    priority: asString(item['priority'], 'MEDIUM'),
  };
}

export function parseAuditIntegrity(raw: unknown): AuditIntegrity {
  const item = requireRecord(raw, 'audit integrity');
  if (typeof item['valid'] !== 'boolean') throw contractError('audit validity');
  const link = item['first_broken_link'];
  let firstBrokenLink: AuditIntegrity['firstBrokenLink'] = null;
  if (isRecord(link)) {
    const previous = link['previous_event_id'];
    firstBrokenLink = {
      index: asNumber(link['index']),
      eventId: asString(link['event_id']),
      previousEventId: typeof previous === 'string' ? previous : null,
      reason: asString(link['reason'], 'unknown'),
    };
  }
  return {
    valid: item['valid'],
    recordsChecked: asNumber(item['records_checked']),
    firstBrokenLink,
  };
}

export function parseHealth(raw: unknown): HealthStatus {
  const item = requireRecord(raw, 'health');
  const checks: Record<string, string> = {};
  for (const [key, value] of Object.entries(item)) {
    if (key !== 'status' && typeof value === 'string') checks[key] = value;
  }
  return { status: item['status'] === 'ok' ? 'ok' : 'degraded', checks };
}

export function parseLoginResult(raw: unknown): LoginResult {
  const item = requireRecord(raw, 'login');
  const token = asString(item['access_token']);
  if (!token) throw contractError('access token');
  return { accessToken: token, expiresInSeconds: asNumber(item['expires_in'], 900) };
}
