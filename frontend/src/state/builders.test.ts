import { describe, expect, it } from 'vitest';
import {
  analysisActivity,
  applyPiaTransition,
  buildAnalysisRecord,
  buildPiaRecord,
  buildRemediationRecord,
  recordFromPersisted,
  toPiaStatus,
} from './builders';
import { detection } from '../utils/testing';
import type { AnalyzeResult } from '../types/analysis';

const NOW = new Date('2026-10-05T15:00:00.000Z');
const result: AnalyzeResult = {
  analysisId: 'abc',
  organizationId: 'org-1',
  detections: [detection({ type: 'EMAIL', start: 6, end: 23 })],
  risk: { score: 55, level: 'MEDIUM', factors: [], explanation: '', recommendations: ['Review retention'] },
  governance: null,
};

describe('buildAnalysisRecord', () => {
  it('stores a redacted preview and never the submitted text', () => {
    const record = buildAnalysisRecord({
      result,
      source: { kind: 'text', label: 'Pasted text', document: null },
      context: null,
      previewText: 'Email: someone@example.invalid.',
      now: NOW,
    });
    const serialised = JSON.stringify(record);
    expect(serialised).not.toContain('someone@example.invalid');
    expect(serialised).toContain('[EMAIL]');
    expect(record.key).toBe('abc');
    expect(record.partial).toBe(false);
  });

  it('uses a local key when the backend did not persist the analysis', () => {
    const record = buildAnalysisRecord({
      result: { ...result, analysisId: null },
      source: { kind: 'text', label: 'x', document: null },
      context: null,
      previewText: null,
      now: NOW,
    });
    expect(record.key.startsWith('local-')).toBe(true);
    expect(record.analysisId).toBeNull();
    expect(record.preview).toBeNull();
  });

  it('flags document analyses with extractor warnings as partial', () => {
    const record = buildAnalysisRecord({
      result,
      source: {
        kind: 'document',
        label: 'hr.pdf',
        document: { filename: 'hr.pdf', documentType: 'pdf', pageCount: 2, warnings: ['Page 2 had no extractable text'] },
      },
      context: null,
      previewText: null,
      now: NOW,
    });
    expect(record.partial).toBe(true);
    expect(record.warnings).toEqual(['Page 2 had no extractable text']);
  });
});

describe('recordFromPersisted', () => {
  it('does not invent a timestamp, context or preview', () => {
    const record = recordFromPersisted({
      id: 'abc',
      organizationId: 'org-1',
      status: 'COMPLETED',
      detections: result.detections,
      risk: result.risk,
      governance: null,
      document: null,
    });
    expect(record.createdAt).toBeNull();
    expect(record.context).toBeNull();
    expect(record.preview).toBeNull();
    expect(record.observedVia).toBe('reloaded-by-id');
  });
});

describe('activity and governance builders', () => {
  it('mirrors the server audit action for an analysis', () => {
    const record = buildAnalysisRecord({
      result,
      source: { kind: 'text', label: 'x', document: null },
      context: null,
      previewText: null,
      now: NOW,
    });
    const event = analysisActivity(record, NOW);
    expect(event.action).toBe('ANALYSIS_COMPLETED');
    expect(event.objectId).toBe('abc');
    expect(event.details.find((detail) => detail.key === 'risk')?.value).toBe('MEDIUM');
  });

  it('tracks PIA history across transitions', () => {
    const draft = {
      projectName: 'CRM',
      systemDescription: '',
      personalInformation: [],
      purposes: [],
      dataSources: [],
      recipients: [],
      storageLocations: [],
      retention: '',
      risks: [],
      safeguards: [],
    };
    const created = buildPiaRecord({ id: 'p1', organizationId: 'org-1', projectName: 'CRM', status: 'DRAFT', version: 1 }, draft, 'u1', NOW);
    const moved = applyPiaTransition(created, { id: 'p1', organizationId: 'org-1', projectName: 'CRM', status: 'IN_REVIEW', version: 2 }, 'Ready', 'u1', NOW);
    expect(moved.status).toBe('IN_REVIEW');
    expect(moved.version).toBe(2);
    expect(moved.history.map((item) => item.toStatus)).toEqual(['DRAFT', 'IN_REVIEW']);
    expect(moved.history[1]?.fromStatus).toBe('DRAFT');
  });

  it('rejects statuses the UI does not know instead of guessing', () => {
    expect(toPiaStatus('APPROVED')).toBe('APPROVED');
    expect(toPiaStatus('SOMETHING_NEW')).toBeNull();
    expect(() =>
      buildPiaRecord({ id: 'p', organizationId: 'o', projectName: 'x', status: 'SOMETHING_NEW', version: 1 }, {} as never, 'u', NOW),
    ).toThrow();
  });

  it('defaults the owner to the current user', () => {
    const record = buildRemediationRecord(
      { id: 'r1', organizationId: 'org-1', status: 'OPEN', priority: 'HIGH' },
      { title: 'Encrypt', description: 'x', analysisId: null, priority: 'HIGH', ownerId: null },
      null,
      'user-1',
      NOW,
    );
    expect(record.ownerId).toBe('user-1');
    expect(record.status).toBe('OPEN');
  });
});
