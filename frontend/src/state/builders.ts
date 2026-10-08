import { contractError } from '../api/errors';
import type {
  AnalysisContext,
  AnalysisRecord,
  AnalyzeResult,
  ObservedVia,
  PersistedAnalysis,
} from '../types/analysis';
import type { ActivityEvent } from '../types/audit';
import type { DataOrigin } from '../types/common';
import { PIA_STATUSES } from '../types/pia';
import type { PiaDraft, PiaRecord, PiaStatus, PiaSummary } from '../types/pia';
import type { DocumentMeta, SourceRef } from '../types/pii';
import { REMEDIATION_WORKFLOW } from '../types/remediation';
import type {
  RemediationInput,
  RemediationRecord,
  RemediationStatus,
  RemediationSummary,
} from '../types/remediation';
import { localId } from '../utils/id';
import { buildRedactedPreview } from '../utils/redact';

export function toPiaStatus(raw: string): PiaStatus | null {
  return (PIA_STATUSES as readonly string[]).includes(raw) ? (raw as PiaStatus) : null;
}

export function toRemediationStatus(raw: string): RemediationStatus | null {
  return (REMEDIATION_WORKFLOW as readonly string[]).includes(raw) ? (raw as RemediationStatus) : null;
}

export interface AnalysisRecordInput {
  readonly result: AnalyzeResult;
  readonly source: SourceRef;
  readonly context: AnalysisContext | null;
  /** Submitted text. Only used to build the redacted preview; it is NOT retained. */
  readonly previewText: string | null;
  readonly now: Date;
  readonly origin?: DataOrigin;
}

export function buildAnalysisRecord(input: AnalysisRecordInput): AnalysisRecord {
  const { result, source } = input;
  const warnings = source.document?.warnings ?? [];
  return {
    key: result.analysisId ?? localId('local'),
    analysisId: result.analysisId,
    organizationId: result.organizationId || null,
    origin: input.origin ?? 'live',
    observedVia: 'this-session',
    source,
    createdAt: input.now.toISOString(),
    context: input.context,
    detections: result.detections,
    risk: result.risk,
    governance: result.governance,
    preview:
      input.previewText === null ? null : buildRedactedPreview(input.previewText, result.detections),
    partial: warnings.length > 0,
    warnings,
  };
}

/** Record for an analysis re-fetched by id: the API returns neither timestamp, context nor text. */
export function recordFromPersisted(persisted: PersistedAnalysis): AnalysisRecord {
  const document: DocumentMeta | null = persisted.document;
  const source: SourceRef = document
    ? { kind: 'document', label: document.filename, document }
    : { kind: 'text', label: '', document: null };
  const warnings = document?.warnings ?? [];
  const observedVia: ObservedVia = 'reloaded-by-id';
  return {
    key: persisted.id,
    analysisId: persisted.id,
    organizationId: persisted.organizationId || null,
    origin: 'live',
    observedVia,
    source,
    createdAt: null,
    context: null,
    detections: persisted.detections,
    risk: persisted.risk,
    governance: persisted.governance,
    preview: null,
    partial: warnings.length > 0,
    warnings,
  };
}

export function analysisActivity(record: AnalysisRecord, now: Date): ActivityEvent {
  return {
    id: localId('act'),
    at: now.toISOString(),
    action: 'ANALYSIS_COMPLETED',
    objectType: 'analysis',
    objectId: record.analysisId ?? record.key,
    details: [
      { key: 'risk', value: record.risk.level },
      { key: 'detections', value: String(record.detections.length) },
      { key: 'source', value: record.source.kind },
    ],
    origin: record.origin,
  };
}

export function buildPiaRecord(summary: PiaSummary, draft: PiaDraft, ownerId: string, now: Date): PiaRecord {
  const status = toPiaStatus(summary.status);
  if (!status) throw contractError('pia status');
  const at = now.toISOString();
  return {
    id: summary.id,
    organizationId: summary.organizationId,
    projectName: summary.projectName,
    status,
    version: summary.version,
    ownerId,
    createdAt: at,
    updatedAt: at,
    draft,
    history: [{ fromStatus: null, toStatus: status, reason: '', at, actorId: ownerId }],
    origin: 'live',
  };
}

export function applyPiaTransition(
  record: PiaRecord,
  summary: PiaSummary,
  reason: string,
  actorId: string,
  now: Date,
): PiaRecord {
  const status = toPiaStatus(summary.status);
  if (!status) throw contractError('pia status');
  const at = now.toISOString();
  return {
    ...record,
    status,
    version: summary.version,
    updatedAt: at,
    history: [...record.history, { fromStatus: record.status, toStatus: status, reason, at, actorId }],
  };
}

export function piaActivity(
  action: 'PIA_CREATED' | 'PIA_TRANSITIONED',
  record: PiaRecord,
  from: PiaStatus | null,
  now: Date,
): ActivityEvent {
  const details: ActivityEvent['details'] =
    action === 'PIA_CREATED'
      ? [
          { key: 'project', value: record.projectName },
          { key: 'status', value: record.status },
        ]
      : [
          { key: 'from', value: from ?? '' },
          { key: 'to', value: record.status },
          { key: 'version', value: String(record.version) },
        ];
  return {
    id: localId('act'),
    at: now.toISOString(),
    action,
    objectType: 'pia',
    objectId: record.id,
    details,
    origin: record.origin,
  };
}

export function buildRemediationRecord(
  summary: RemediationSummary,
  input: RemediationInput,
  findingId: string | null,
  ownerId: string,
  now: Date,
): RemediationRecord {
  const status = toRemediationStatus(summary.status);
  if (!status) throw contractError('remediation status');
  return {
    id: summary.id,
    organizationId: summary.organizationId,
    title: input.title,
    description: input.description,
    priority: input.priority,
    status,
    ownerId: input.ownerId ?? ownerId,
    analysisId: input.analysisId,
    findingId,
    createdAt: now.toISOString(),
    origin: 'live',
  };
}

export function remediationActivity(record: RemediationRecord, now: Date): ActivityEvent {
  return {
    id: localId('act'),
    at: now.toISOString(),
    action: 'REMEDIATION_CREATED',
    objectType: 'remediation',
    objectId: record.id,
    details: [
      { key: 'title', value: record.title },
      { key: 'priority', value: record.priority },
      { key: 'status', value: record.status },
    ],
    origin: record.origin,
  };
}
