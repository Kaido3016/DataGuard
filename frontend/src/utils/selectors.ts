import { RISK_RANK } from '../types/risk';
import type { RiskLevel } from '../types/risk';
import type { AnalysisRecord, Governance } from '../types/analysis';
import type { Finding } from '../types/pii';
import type { PiaRecord, PiaStatus } from '../types/pia';
import type { RemediationRecord } from '../types/remediation';
import { contextAround } from './redact';

/** Flattens analysis records into one finding per detection (severity inherited from the analysis). */
export function recordsToFindings(records: readonly AnalysisRecord[]): Finding[] {
  const findings: Finding[] = [];
  for (const record of records) {
    record.detections.forEach((detection, index) => {
      findings.push({
        id: `${record.key}#${index}`,
        analysisKey: record.key,
        analysisId: record.analysisId,
        index,
        type: detection.type,
        start: detection.start,
        end: detection.end,
        confidence: detection.confidence,
        detector: detection.detector,
        redactedValue: detection.redactedValue,
        context: record.preview ? contextAround(record.preview, index) : null,
        severity: record.risk.level,
        riskScore: record.risk.score,
        source: record.source,
        detectedAt: record.createdAt,
        persisted: record.analysisId !== null,
        origin: record.origin,
      });
    });
  }
  return findings;
}

export interface KpiSummary {
  readonly analyses: number;
  readonly findings: number;
  readonly critical: number;
  readonly high: number;
  /** Mean detection confidence (0..1), or null when there are no detections. */
  readonly meanConfidence: number | null;
}

export function summarize(records: readonly AnalysisRecord[]): KpiSummary {
  let findings = 0;
  let critical = 0;
  let high = 0;
  let confidenceSum = 0;
  for (const record of records) {
    const count = record.detections.length;
    findings += count;
    if (record.risk.level === 'CRITICAL') critical += count;
    if (record.risk.level === 'HIGH') high += count;
    for (const detection of record.detections) confidenceSum += detection.confidence;
  }
  return {
    analyses: records.length,
    findings,
    critical,
    high,
    meanConfidence: findings > 0 ? confidenceSum / findings : null,
  };
}

/** Record with the highest score (ties: first in list, i.e. the most recent). */
export function topRiskRecord(records: readonly AnalysisRecord[]): AnalysisRecord | null {
  let best: AnalysisRecord | null = null;
  for (const record of records) {
    if (best === null || record.risk.score > best.risk.score) best = record;
  }
  return best;
}

export function countByLevel<T>(items: readonly T[], levelOf: (item: T) => RiskLevel): Record<RiskLevel, number> {
  const counts: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const item of items) counts[levelOf(item)] += 1;
  return counts;
}

export function remediationCounts(items: readonly RemediationRecord[]): Record<RiskLevel, number> {
  return countByLevel(items, (item) => item.priority);
}

export function piaCounts(items: readonly PiaRecord[]): Record<PiaStatus, number> {
  const counts: Record<PiaStatus, number> = {
    DRAFT: 0,
    IN_REVIEW: 0,
    REQUIRES_REMEDIATION: 0,
    APPROVED: 0,
    ARCHIVED: 0,
  };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

/** PIAs that are being worked on (in review or needing remediation). */
export function piaInProgress(counts: Record<PiaStatus, number>): number {
  return counts.IN_REVIEW + counts.REQUIRES_REMEDIATION;
}

// ---- Findings table: filter / sort / paginate ------------------------------------------

export type FindingSortKey = 'type' | 'confidence' | 'severity' | 'detectedAt';
export type SortDirection = 'asc' | 'desc';

export interface FindingFilters {
  readonly search: string;
  readonly severity: RiskLevel | 'ALL';
  readonly type: string | 'ALL';
  readonly detector: string | 'ALL';
}

export const EMPTY_FILTERS: FindingFilters = { search: '', severity: 'ALL', type: 'ALL', detector: 'ALL' };

/**
 * Free text matches a finding's OWN data: its type (raw and localized label), detector, source,
 * analysis id and its own context (surrounding text plus its own tag, never other findings' tags).
 */
export function filterFindings(
  findings: readonly Finding[],
  filters: FindingFilters,
  labelOf: (type: string) => string = (type) => type,
): Finding[] {
  const needle = filters.search.trim().toLowerCase();
  return findings.filter((finding) => {
    if (filters.severity !== 'ALL' && finding.severity !== filters.severity) return false;
    if (filters.type !== 'ALL' && finding.type !== filters.type) return false;
    if (filters.detector !== 'ALL' && finding.detector !== filters.detector) return false;
    if (needle) {
      const haystack = [
        finding.type,
        labelOf(finding.type),
        finding.detector,
        finding.source.label,
        finding.analysisId ?? '',
        (finding.context ?? [])
          .filter((segment) => segment.kind === 'text' || segment.detectionIndex === finding.index)
          .map((segment) => segment.text)
          .join(''),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

export function sortFindings(
  findings: readonly Finding[],
  key: FindingSortKey,
  direction: SortDirection,
): Finding[] {
  const factor = direction === 'asc' ? 1 : -1;
  const compare = (a: Finding, b: Finding): number => {
    switch (key) {
      case 'type':
        return a.type.localeCompare(b.type);
      case 'confidence':
        return a.confidence - b.confidence;
      case 'severity':
        return RISK_RANK[a.severity] - RISK_RANK[b.severity] || a.riskScore - b.riskScore;
      case 'detectedAt': {
        const left = a.detectedAt ? Date.parse(a.detectedAt) : 0;
        const right = b.detectedAt ? Date.parse(b.detectedAt) : 0;
        return left - right;
      }
    }
  };
  // Array.prototype.sort is stable, so ties keep their original (newest-first) order.
  return [...findings].sort((a, b) => factor * compare(a, b));
}

export interface Page<T> {
  readonly items: T[];
  readonly page: number;
  readonly pageCount: number;
  readonly total: number;
}

export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, pageCount, total: items.length };
}

export function distinct(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}


/** Latest governance evaluation per framework (records are newest first). */
export function latestGovernanceByFramework(records: readonly AnalysisRecord[]): Map<string, Governance> {
  const latest = new Map<string, Governance>();
  for (const record of records) {
    if (record.governance && !latest.has(record.governance.framework)) {
      latest.set(record.governance.framework, record.governance);
    }
  }
  return latest;
}

export interface ControlCounts {
  readonly total: number;
  readonly pass: number;
  readonly review: number;
  readonly remediation: number;
}

export function countControls(governance: Governance): ControlCounts {
  let pass = 0;
  let review = 0;
  let remediation = 0;
  for (const finding of governance.findings) {
    if (finding.status === 'PASS') pass += 1;
    else if (finding.status === 'REQUIRES_REVIEW') review += 1;
    else if (finding.status === 'REQUIRES_REMEDIATION') remediation += 1;
  }
  return { total: governance.findings.length, pass, review, remediation };
}
