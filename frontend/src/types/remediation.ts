import type { DataOrigin } from './common';
import type { RiskLevel } from './risk';

/** Priorities the UI submits. The backend upper-cases any string up to 32 characters. */
export type RemediationPriority = RiskLevel;

/** Target workflow. Only `OPEN` is produced by the API today. */
export const REMEDIATION_WORKFLOW = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFIED',
] as const;
export type RemediationStatus = (typeof REMEDIATION_WORKFLOW)[number];

/**
 * Statuses the backend can currently produce. A transition schema exists
 * (RemediationTransitionRequest) but no route is exposed yet, so the UI does not offer moves.
 */
export const REMEDIATION_SUPPORTED_STATUSES: readonly RemediationStatus[] = ['OPEN'];

export interface RemediationInput {
  readonly title: string;
  readonly description: string;
  readonly analysisId: string | null;
  readonly priority: RemediationPriority;
  readonly ownerId: string | null;
}

/** Result of POST /api/v1/remediations. */
export interface RemediationSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly status: string;
  readonly priority: string;
}

/** Workspace-level remediation record: only items created in this session. */
export interface RemediationRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly title: string;
  readonly description: string;
  readonly priority: RemediationPriority;
  readonly status: RemediationStatus;
  readonly ownerId: string;
  readonly analysisId: string | null;
  /** Finding that motivated the item (client-side link only). */
  readonly findingId: string | null;
  readonly createdAt: string;
  readonly origin: DataOrigin;
}

export const REMEDIATION_LIMITS = { title: 255, description: 4000 } as const;
