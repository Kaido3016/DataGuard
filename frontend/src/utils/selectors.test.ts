import { describe, expect, it } from 'vitest';
import {
  countControls,
  EMPTY_FILTERS,
  filterFindings,
  latestGovernanceByFramework,
  paginate,
  recordsToFindings,
  remediationCounts,
  sortFindings,
  summarize,
  topRiskRecord,
} from './selectors';
import { detection, record } from './testing';

const critical = record(
  'a1',
  'CRITICAL',
  88,
  [detection({ type: 'SOCIAL_INSURANCE_NUMBER', start: 6, end: 17, confidence: 0.97 }), detection({ type: 'EMAIL', start: 20, end: 30, confidence: 0.99 })],
  'SIN:  123456789 ... me@x.co ...',
);
const low = record('local-2', 'LOW', 12, [detection({ type: 'PERSON', confidence: 0.6, detector: 'ner' })], undefined, null);
const records = [low, critical];

describe('recordsToFindings', () => {
  const findings = recordsToFindings(records);

  it('creates one finding per detection with severity inherited from its analysis', () => {
    expect(findings).toHaveLength(3);
    expect(findings.map((finding) => finding.id)).toEqual(['local-2#0', 'a1#0', 'a1#1']);
    expect(findings.filter((finding) => finding.severity === 'CRITICAL')).toHaveLength(2);
  });

  it('marks persistence from the presence of an analysis id', () => {
    expect(findings[0]?.persisted).toBe(false);
    expect(findings[1]?.persisted).toBe(true);
  });

  it('carries redacted context only when a preview exists', () => {
    expect(findings[0]?.context).toBeNull();
    const context = (findings[1]?.context ?? []).map((segment) => segment.text).join('');
    expect(context).toContain('[SOCIAL_INSURANCE_NUMBER]');
    expect(context).not.toContain('123456789');
  });
});

describe('summarize / topRiskRecord', () => {
  it('computes derived KPIs without inventing data', () => {
    const summary = summarize(records);
    expect(summary.analyses).toBe(2);
    expect(summary.findings).toBe(3);
    expect(summary.critical).toBe(2);
    expect(summary.meanConfidence).toBeCloseTo((0.6 + 0.97 + 0.99) / 3, 6);
  });

  it('returns null confidence when nothing was detected', () => {
    expect(summarize([]).meanConfidence).toBeNull();
    expect(topRiskRecord([])).toBeNull();
  });

  it('picks the highest-scoring analysis', () => {
    expect(topRiskRecord(records)?.key).toBe('a1');
  });
});

describe('findings table helpers', () => {
  const findings = recordsToFindings(records);

  it('filters by severity, type and free text', () => {
    expect(filterFindings(findings, { ...EMPTY_FILTERS, severity: 'LOW' })).toHaveLength(1);
    expect(filterFindings(findings, { ...EMPTY_FILTERS, type: 'EMAIL' })).toHaveLength(1);
    expect(filterFindings(findings, { ...EMPTY_FILTERS, detector: 'ner' })).toHaveLength(1);
    // Free text matches a finding's own type/context only, never a neighbour's tag in its window.
    const social = filterFindings(findings, { ...EMPTY_FILTERS, search: 'social' });
    expect(social.map((finding) => finding.type)).toEqual(['SOCIAL_INSURANCE_NUMBER']);
    expect(filterFindings(findings, { ...EMPTY_FILTERS, search: 'email' }).map((finding) => finding.type)).toEqual(['EMAIL']);
    // Localized labels are searchable too.
    const labelled = filterFindings(findings, { ...EMPTY_FILTERS, search: 'courriel' }, (type) => (type === 'EMAIL' ? 'Courriel' : type));
    expect(labelled.map((finding) => finding.type)).toEqual(['EMAIL']);
    expect(filterFindings(findings, { ...EMPTY_FILTERS, type: 'SOCIAL_INSURANCE_NUMBER' })).toHaveLength(1);
    expect(filterFindings(findings, { ...EMPTY_FILTERS, search: 'zzz' })).toHaveLength(0);
  });

  it('sorts by severity and confidence in both directions', () => {
    expect(sortFindings(findings, 'severity', 'desc')[0]?.severity).toBe('CRITICAL');
    expect(sortFindings(findings, 'severity', 'asc')[0]?.severity).toBe('LOW');
    expect(sortFindings(findings, 'confidence', 'asc')[0]?.confidence).toBe(0.6);
  });

  it('treats missing timestamps as oldest when sorting by detection time', () => {
    expect(sortFindings(findings, 'detectedAt', 'asc')[0]?.analysisKey).toBe('local-2');
  });

  it('paginates and clamps out-of-range pages', () => {
    const items = Array.from({ length: 23 }, (_, i) => i);
    expect(paginate(items, 1, 10).items).toHaveLength(10);
    expect(paginate(items, 3, 10).items).toEqual([20, 21, 22]);
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate([], 1, 10).pageCount).toBe(1);
  });
});

describe('remediationCounts', () => {
  it('counts by priority', () => {
    const counts = remediationCounts([
      { priority: 'HIGH' },
      { priority: 'HIGH' },
      { priority: 'LOW' },
    ] as never);
    expect(counts).toEqual({ LOW: 1, MEDIUM: 0, HIGH: 2, CRITICAL: 0 });
  });
});

describe('governance helpers', () => {
  const governance = (framework: string, statuses: string[]) => ({
    framework,
    findings: statuses.map((status, index) => ({
      ruleId: `R-${index}`, ruleVersion: '0.1.0', status, severity: 'high', reason: '', requiredEvidence: [], remediation: [],
    })),
  });

  it('keeps the newest evaluation per framework and counts statuses', () => {
    const newest = { ...record('n', 'LOW', 5, []), governance: governance('gdpr', ['PASS', 'REQUIRES_REVIEW']) };
    const older = { ...record('o', 'LOW', 5, []), governance: governance('gdpr', ['REQUIRES_REMEDIATION']) };
    const other = { ...record('q', 'LOW', 5, []), governance: governance('ccpa', ['PASS']) };
    const latest = latestGovernanceByFramework([newest, older, other]);
    expect([...latest.keys()].sort()).toEqual(['ccpa', 'gdpr']);
    expect(countControls(latest.get('gdpr') ?? governance('x', []))).toEqual({ total: 2, pass: 1, review: 1, remediation: 0 });
  });
});
