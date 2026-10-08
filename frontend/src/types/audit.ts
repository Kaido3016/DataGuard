import type { DataOrigin } from './common';

/** Result of GET /api/v1/audit/integrity. */
export interface AuditIntegrity {
  readonly valid: boolean;
  readonly recordsChecked: number;
  readonly firstBrokenLink: {
    readonly index: number;
    readonly eventId: string;
    readonly previousEventId: string | null;
    readonly reason: string;
  } | null;
}

/** Server-side audit actions the frontend can correlate with operations it performed. */
export const OBSERVED_AUDIT_ACTIONS = [
  'ANALYSIS_COMPLETED',
  'PIA_CREATED',
  'PIA_TRANSITIONED',
  'REMEDIATION_CREATED',
] as const;
export type ObservedAuditAction = (typeof OBSERVED_AUDIT_ACTIONS)[number];

export type ActivityDetailKey =
  | 'risk'
  | 'detections'
  | 'source'
  | 'project'
  | 'status'
  | 'from'
  | 'to'
  | 'priority'
  | 'title'
  | 'version';

/**
 * Operation observed by THIS browser session. It is not the audit record (which is stored
 * server-side in an append-only hash chain and has no list endpoint yet); it mirrors the
 * audit action the backend writes for the same operation.
 */
export interface ActivityEvent {
  readonly id: string;
  /** ISO time on the client clock. */
  readonly at: string;
  readonly action: ObservedAuditAction;
  readonly objectType: 'analysis' | 'pia' | 'remediation';
  readonly objectId: string;
  /** Non-sensitive facts about the event; `key` is translated by the UI, `value` is shown as-is. */
  readonly details: readonly { readonly key: ActivityDetailKey; readonly value: string }[];
  readonly origin: DataOrigin;
}

export interface HealthStatus {
  readonly status: 'ok' | 'degraded';
  readonly checks: Readonly<Record<string, string>>;
}
