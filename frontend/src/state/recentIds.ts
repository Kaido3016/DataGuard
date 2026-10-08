import { config } from '../constants/config';

/**
 * Persisted analysis ids (opaque UUIDs, no PII, useless without a valid tenant token) are kept
 * in sessionStorage per organization so a page reload can re-fetch those analyses from the API
 * after sign-in. Everything else stays in memory.
 */
const keyFor = (organizationId: string): string => `dg.recent-analyses.v1:${organizationId}`;

export function readRecentIds(organizationId: string): string[] {
  try {
    const raw = window.sessionStorage.getItem(keyFor(organizationId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, config.recentAnalysisLimit)
      : [];
  } catch {
    return [];
  }
}

function write(organizationId: string, ids: string[]): void {
  try {
    window.sessionStorage.setItem(keyFor(organizationId), JSON.stringify(ids.slice(0, config.recentAnalysisLimit)));
  } catch {
    /* storage unavailable: reload simply starts empty */
  }
}

export function rememberAnalysisId(organizationId: string, id: string): void {
  write(organizationId, [id, ...readRecentIds(organizationId).filter((existing) => existing !== id)]);
}

export function forgetAnalysisId(organizationId: string, id: string): void {
  write(organizationId, readRecentIds(organizationId).filter((existing) => existing !== id));
}

export function clearRecentIds(organizationId: string): void {
  try {
    window.sessionStorage.removeItem(keyFor(organizationId));
  } catch {
    /* ignore */
  }
}
