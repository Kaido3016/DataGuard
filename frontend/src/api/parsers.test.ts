import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import {
  parseAnalyzeResult,
  parseAuditIntegrity,
  parseHealth,
  parseLoginResult,
  parsePersistedAnalysis,
  parsePiaSummary,
} from './parsers';

const analyzeBody = {
  analysis_id: '11111111-1111-4111-8111-111111111111',
  organization_id: '22222222-2222-4222-8222-222222222222',
  detections: [
    { type: 'EMAIL', start: 6, end: 23, confidence: 0.98, detector: 'regex', redacted_value: '[REDACTED]' },
  ],
  risk: {
    score: 61.8,
    level: 'HIGH',
    factors: [{ name: 'sensitivity', points: 25, detail: 'highest detected sensitivity class' }],
    explanation: 'Risk score 61.8/100 (HIGH) …',
    recommendations: ['Confirm encryption at rest and key-management controls.'],
  },
  governance: {
    framework: 'quebec_privacy',
    findings: [
      {
        rule_id: 'DG-QC-PI-001',
        framework: '0.1.0',
        status: 'REQUIRES_REVIEW',
        severity: 'high',
        reason: 'Applicability requires authorized human/legal review.',
        required_evidence: ['privacy_policy'],
        remediation: ['Assign an accountable owner.'],
      },
    ],
  },
};

function contractKind(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return error instanceof ApiError ? error.kind : 'other';
  }
  return 'none';
}

describe('parseAnalyzeResult', () => {
  it('maps the backend shape, including the rule-version quirk', () => {
    const result = parseAnalyzeResult(analyzeBody);
    expect(result.analysisId).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.detections[0]?.redactedValue).toBe('[REDACTED]');
    expect(result.risk.level).toBe('HIGH');
    expect(result.governance?.framework).toBe('quebec_privacy');
    expect(result.governance?.findings[0]?.ruleVersion).toBe('0.1.0');
    expect(result.governance?.findings[0]?.requiredEvidence).toEqual(['privacy_policy']);
  });

  it('accepts a missing analysis id (non-persisting environments) and null governance', () => {
    const result = parseAnalyzeResult({ ...analyzeBody, analysis_id: null, governance: null });
    expect(result.analysisId).toBeNull();
    expect(result.governance).toBeNull();
  });

  it('clamps out-of-range confidence and derives a level when the API sends an unknown one', () => {
    const result = parseAnalyzeResult({
      ...analyzeBody,
      detections: [{ ...analyzeBody.detections[0], confidence: 1.7 }],
      risk: { ...analyzeBody.risk, level: 'SEVERE', score: 92 },
    });
    expect(result.detections[0]?.confidence).toBe(1);
    expect(result.risk.level).toBe('CRITICAL');
  });

  it('rejects malformed payloads with a typed contract error', () => {
    expect(contractKind(() => parseAnalyzeResult(null))).toBe('contract');
    expect(contractKind(() => parseAnalyzeResult({ ...analyzeBody, detections: 'nope' }))).toBe('contract');
    expect(contractKind(() => parseAnalyzeResult({ ...analyzeBody, detections: [{ type: 'EMAIL', start: 5, end: 1 }] }))).toBe('contract');
    expect(contractKind(() => parseAnalyzeResult({ ...analyzeBody, risk: { level: 'HIGH' } }))).toBe('contract');
  });
});

describe('parsePersistedAnalysis', () => {
  it('unwraps the stored result and exposes document metadata', () => {
    const persisted = parsePersistedAnalysis({
      id: analyzeBody.analysis_id,
      organization_id: analyzeBody.organization_id,
      status: 'COMPLETED',
      result: {
        detections: analyzeBody.detections,
        risk: analyzeBody.risk,
        governance: analyzeBody.governance,
        document: { filename: 'hr.docx', document_type: 'docx', page_count: 3, warnings: ['Table skipped'] },
      },
    });
    expect(persisted.status).toBe('COMPLETED');
    expect(persisted.document).toEqual({
      filename: 'hr.docx',
      documentType: 'docx',
      pageCount: 3,
      warnings: ['Table skipped'],
    });
  });

  it('treats a missing document block as null', () => {
    const persisted = parsePersistedAnalysis({
      id: 'x',
      organization_id: 'o',
      status: 'COMPLETED',
      result: { detections: [], risk: analyzeBody.risk, governance: null },
    });
    expect(persisted.document).toBeNull();
  });
});

describe('governance workflow payloads', () => {
  it('parses PIA summaries', () => {
    expect(parsePiaSummary({ id: 'p1', organization_id: 'o', project_name: 'CRM', status: 'DRAFT', version: 1 })).toEqual({
      id: 'p1',
      organizationId: 'o',
      projectName: 'CRM',
      status: 'DRAFT',
      version: 1,
    });
    expect(contractKind(() => parsePiaSummary({}))).toBe('contract');
  });

  it('parses audit integrity results including the first broken link', () => {
    expect(parseAuditIntegrity({ valid: true, records_checked: 12, first_broken_link: null })).toEqual({
      valid: true,
      recordsChecked: 12,
      firstBrokenLink: null,
    });
    const broken = parseAuditIntegrity({
      valid: false,
      records_checked: 3,
      first_broken_link: { index: 2, event_id: 'e2', previous_event_id: 'e1', reason: 'integrity_hash_mismatch' },
    });
    expect(broken.valid).toBe(false);
    expect(broken.firstBrokenLink?.reason).toBe('integrity_hash_mismatch');
    expect(contractKind(() => parseAuditIntegrity({ records_checked: 1 }))).toBe('contract');
  });

  it('parses health and login payloads', () => {
    expect(parseHealth({ status: 'degraded', database: 'ok', redis: 'degraded' })).toEqual({
      status: 'degraded',
      checks: { database: 'ok', redis: 'degraded' },
    });
    expect(parseLoginResult({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 900 }).expiresInSeconds).toBe(900);
    expect(contractKind(() => parseLoginResult({ token_type: 'bearer' }))).toBe('contract');
  });
});
