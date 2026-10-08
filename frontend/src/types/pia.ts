import type { DataOrigin } from './common';
import type { RiskLevel } from './risk';

/** PIA workflow states (dataguard/pia/models.py). */
export const PIA_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'REQUIRES_REMEDIATION',
  'APPROVED',
  'ARCHIVED',
] as const;
export type PiaStatus = (typeof PIA_STATUSES)[number];

/** Mirror of dataguard/pia/workflow.py `_ALLOWED`; the backend answers 409 on invalid moves. */
export const PIA_TRANSITIONS: Readonly<Record<PiaStatus, readonly PiaStatus[]>> = {
  DRAFT: ['IN_REVIEW'],
  IN_REVIEW: ['REQUIRES_REMEDIATION', 'APPROVED', 'DRAFT'],
  REQUIRES_REMEDIATION: ['IN_REVIEW'],
  APPROVED: ['ARCHIVED'],
  ARCHIVED: [],
};

/** The API accepts `risks` as free-form objects. The UI uses this shape by convention. */
export interface PiaRisk {
  readonly title: string;
  readonly level: RiskLevel;
  readonly description: string;
  readonly mitigation: string;
}

/** Content of a PIA (maps to PIARequest). */
export interface PiaDraft {
  readonly projectName: string;
  readonly systemDescription: string;
  readonly personalInformation: readonly string[];
  readonly purposes: readonly string[];
  readonly dataSources: readonly string[];
  readonly recipients: readonly string[];
  readonly storageLocations: readonly string[];
  readonly retention: string;
  readonly risks: readonly PiaRisk[];
  readonly safeguards: readonly string[];
}

export interface PiaHistoryItem {
  readonly fromStatus: PiaStatus | null;
  readonly toStatus: PiaStatus;
  readonly reason: string;
  /** Client clock. */
  readonly at: string;
  readonly actorId: string;
}

/** Result of POST /api/v1/pias and POST /api/v1/pias/{id}/transition. */
export interface PiaSummary {
  readonly id: string;
  readonly organizationId: string;
  readonly projectName: string;
  readonly status: string;
  readonly version: number;
}

/** Workspace-level PIA record: only items created in this session (no list endpoint exists). */
export interface PiaRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly projectName: string;
  readonly status: PiaStatus;
  readonly version: number;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly draft: PiaDraft | null;
  readonly history: readonly PiaHistoryItem[];
  readonly origin: DataOrigin;
}

/** Limits enforced by PIARequest on the backend (used for client-side hints only). */
export const PIA_LIMITS = {
  projectName: 255,
  systemDescription: 4000,
  retention: 1000,
  listItems: 100,
  transitionReason: 2000,
} as const;
