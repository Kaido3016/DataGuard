import { RISK_LEVELS } from '../types/risk';
import type { RiskFactor, RiskFactorGroup, RiskFactorGroupId, RiskLevel } from '../types/risk';

/** Fallback only: the API's own `level` is authoritative. */
export function levelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && (RISK_LEVELS as readonly string[]).includes(value);
}

export function normalizeLevel(raw: unknown, score: number): RiskLevel {
  if (typeof raw === 'string') {
    const upper = raw.toUpperCase();
    if (isRiskLevel(upper)) return upper;
  }
  return levelFromScore(score);
}

/** Maps a backend factor name (dataguard/risk/engine.py) to the category shown to users. */
const FACTOR_GROUP: Readonly<Record<string, RiskFactorGroupId>> = {
  sensitivity: 'sensitivity',
  access_scope: 'exposure',
  exposure: 'exposure',
  encryption: 'controls',
  purpose: 'controls',
  retention: 'retention',
  quantity: 'volume',
  confidence: 'confidence',
  data_location: 'location',
};

/** Groups always listed (with 0 points when the engine added none), in display order. */
export const CORE_FACTOR_GROUPS: readonly RiskFactorGroupId[] = [
  'sensitivity',
  'exposure',
  'controls',
  'retention',
  'volume',
  'confidence',
  'location',
];

export function groupRiskFactors(factors: readonly RiskFactor[]): RiskFactorGroup[] {
  const buckets = new Map<RiskFactorGroupId, RiskFactor[]>();
  for (const factor of factors) {
    const id = FACTOR_GROUP[factor.name] ?? 'other';
    const list = buckets.get(id) ?? [];
    list.push(factor);
    buckets.set(id, list);
  }
  const ids: RiskFactorGroupId[] = [...CORE_FACTOR_GROUPS];
  if (buckets.has('other')) ids.push('other');
  return ids.map((id) => {
    const list = buckets.get(id) ?? [];
    return { id, points: list.reduce((sum, factor) => sum + factor.points, 0), factors: list };
  });
}

export function totalPoints(factors: readonly RiskFactor[]): number {
  return factors.reduce((sum, factor) => sum + factor.points, 0);
}
