import type { DataOrigin } from './common';
import type { RiskLevel } from './risk';

/** PII classes known to the backend (dataguard/domain/models.py `PIIType`). */
export const KNOWN_PII_TYPES = [
  'PERSON',
  'EMAIL',
  'PHONE',
  'ADDRESS',
  'DATE_OF_BIRTH',
  'GOVERNMENT_ID',
  'HEALTH_INSURANCE_ID',
  'PASSPORT',
  'DRIVER_LICENSE',
  'HEALTH_INFORMATION',
  'FINANCIAL_INFORMATION',
  'BANK_ACCOUNT',
  'CREDIT_CARD',
  'IP_ADDRESS',
  'LOCATION',
  'ORGANIZATION',
  'EMPLOYEE_ID',
  'CUSTOMER_ID',
  'TAX_ID',
  'SOCIAL_INSURANCE_NUMBER',
  'BIOMETRIC_DATA',
  'OTHER_SENSITIVE_INFORMATION',
] as const;
export type KnownPiiType = (typeof KNOWN_PII_TYPES)[number];

/**
 * A detection as returned by the API. `type` stays a plain string so a newer backend that
 * adds a class never breaks the UI; labels fall back to the raw value.
 * The API never returns the raw detected value, only `redactedValue`.
 */
export interface Detection {
  readonly type: string;
  /** Start offset in Unicode code points (Python string index). */
  readonly start: number;
  /** End offset (exclusive) in Unicode code points. */
  readonly end: number;
  /** 0..1 */
  readonly confidence: number;
  /** Detector provenance, e.g. `regex`, `ner`, `ensemble`. */
  readonly detector: string;
  readonly redactedValue: string;
}

/** A segment of the redacted preview: plain text or a masked PII tag. */
export type PreviewSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'tag'; readonly text: string; readonly detectionIndex: number };

/**
 * Locally produced, redacted rendering of what the user submitted. Every detected span is
 * replaced by a `[TYPE]` tag; raw submitted text is never stored in the workspace.
 */
export interface RedactedPreview {
  readonly segments: readonly PreviewSegment[];
  /** True if the preview was cut to the configured length limit. */
  readonly truncated: boolean;
}

export type SourceKind = 'text' | 'document';

export interface DocumentMeta {
  readonly filename: string;
  readonly documentType: string;
  readonly pageCount: number | null;
  readonly warnings: readonly string[];
}

export interface SourceRef {
  readonly kind: SourceKind;
  readonly label: string;
  readonly document: DocumentMeta | null;
}

/**
 * Flattened, UI-level finding derived from one detection of one analysis.
 * Severity is INHERITED from the analysis-level risk: the backend scores analyses, not
 * individual detections.
 */
export interface Finding {
  readonly id: string;
  readonly analysisKey: string;
  readonly analysisId: string | null;
  readonly index: number;
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly confidence: number;
  readonly detector: string;
  readonly redactedValue: string;
  /** Redacted context snippet around the detection, if available. */
  readonly context: readonly PreviewSegment[] | null;
  readonly severity: RiskLevel;
  readonly riskScore: number;
  readonly source: SourceRef;
  /** Client clock time at which the analysis was observed; null when the API gave none. */
  readonly detectedAt: string | null;
  readonly persisted: boolean;
  readonly origin: DataOrigin;
}
