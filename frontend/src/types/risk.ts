export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Ordering used for sorting (higher = more severe). */
export const RISK_RANK: Readonly<Record<RiskLevel, number>> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

/**
 * Score bands used by the backend RiskEngine (>=80 critical, >=60 high, >=30 medium).
 * The backend is authoritative: the UI only uses these to draw the gauge scale and as a
 * fallback when a response carries an unknown level string.
 */
export const RISK_BANDS: readonly {
  readonly level: RiskLevel;
  readonly min: number;
  readonly max: number;
}[] = [
  { level: 'LOW', min: 0, max: 30 },
  { level: 'MEDIUM', min: 30, max: 60 },
  { level: 'HIGH', min: 60, max: 80 },
  { level: 'CRITICAL', min: 80, max: 100 },
];

/** One contributor to the score as returned by the backend (`name`, `points`, `detail`). */
export interface RiskFactor {
  readonly name: string;
  readonly points: number;
  readonly detail: string;
}

export interface RiskAssessment {
  readonly score: number;
  readonly level: RiskLevel;
  readonly factors: readonly RiskFactor[];
  readonly explanation: string;
  readonly recommendations: readonly string[];
}

/** UI grouping of backend factors into the explanation categories shown to users. */
export type RiskFactorGroupId =
  | 'sensitivity'
  | 'exposure'
  | 'controls'
  | 'retention'
  | 'volume'
  | 'confidence'
  | 'location'
  | 'other';

export interface RiskFactorGroup {
  readonly id: RiskFactorGroupId;
  readonly points: number;
  /** Backend factors that were folded into this group. */
  readonly factors: readonly RiskFactor[];
}
