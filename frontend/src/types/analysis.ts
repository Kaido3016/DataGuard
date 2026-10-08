import type { DataOrigin } from './common';
import type { Detection, DocumentMeta, RedactedPreview, SourceRef } from './pii';
import type { RiskAssessment } from './risk';

/** Context the user supplies with an analysis (maps to RiskContext on the backend). */
export interface AnalysisContext {
  readonly dataLocation: string;
  readonly accessScope: string;
  readonly exposure: string;
  readonly retentionDays: number | null;
  readonly encryptedAtRest: boolean;
  readonly purposeDefined: boolean;
  readonly framework: string | null;
}

export const FRAMEWORK_IDS = ['quebec_privacy', 'canada_privacy', 'gdpr', 'ccpa'] as const;
export type FrameworkId = (typeof FRAMEWORK_IDS)[number];

/** Statuses emitted by dataguard/compliance/engine.py. */
export const COMPLIANCE_STATUSES = ['PASS', 'REQUIRES_REMEDIATION', 'REQUIRES_REVIEW'] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export interface ControlFinding {
  readonly ruleId: string;
  /**
   * NOTE: the backend currently puts the rule *version* (e.g. "0.1.0") in the per-finding
   * `framework` field. The framework name lives on `Governance.framework`.
   */
  readonly ruleVersion: string;
  /** Unknown strings are tolerated and rendered verbatim. */
  readonly status: string;
  readonly severity: string;
  readonly reason: string;
  readonly requiredEvidence: readonly string[];
  readonly remediation: readonly string[];
}

export interface Governance {
  readonly framework: string;
  readonly findings: readonly ControlFinding[];
}

/** Normalised result of POST /api/v1/analyze and /analyze-document. */
export interface AnalyzeResult {
  /** Null when the backend did not persist the analysis (test environment). */
  readonly analysisId: string | null;
  readonly organizationId: string;
  readonly detections: readonly Detection[];
  readonly risk: RiskAssessment;
  readonly governance: Governance | null;
}

/** Normalised result of GET /api/v1/analyses/{id}. */
export interface PersistedAnalysis {
  readonly id: string;
  readonly organizationId: string;
  readonly status: string;
  readonly detections: readonly Detection[];
  readonly risk: RiskAssessment;
  readonly governance: Governance | null;
  readonly document: DocumentMeta | null;
}

/** How this analysis entered the workspace. */
export type ObservedVia = 'this-session' | 'reloaded-by-id';

/** Workspace-level analysis record (in memory only; raw submitted text is never kept). */
export interface AnalysisRecord {
  /** `analysisId` when persisted, otherwise a local identifier. */
  readonly key: string;
  readonly analysisId: string | null;
  readonly organizationId: string | null;
  readonly origin: DataOrigin;
  readonly observedVia: ObservedVia;
  readonly source: SourceRef;
  /** ISO time on the client clock, or null if the API supplied none (reloaded records). */
  readonly createdAt: string | null;
  /** Inputs the user sent; null for records reloaded from the API. */
  readonly context: AnalysisContext | null;
  readonly detections: readonly Detection[];
  readonly risk: RiskAssessment;
  readonly governance: Governance | null;
  readonly preview: RedactedPreview | null;
  /** Document extraction produced warnings, so the result may be incomplete. */
  readonly partial: boolean;
  readonly warnings: readonly string[];
}
