import { ROLES } from '../types/auth';
import type { Role, TokenClaims } from '../types/auth';
import { asNumber, isRecord } from './guards';

const KNOWN_ROLES: ReadonlySet<string> = new Set<string>(ROLES);

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * Decodes the claims of a bearer token for DISPLAY and expiry handling only.
 * The signature is NOT verified here — the backend is the only authority and re-validates the
 * token on every request. Returns null when the token is not a well-formed JWT with the claims
 * DataGuard requires (`sub`, `org`/`org_id`, `exp`).
 */
export function decodeClaims(token: string): TokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
  if (!isRecord(payload)) return null;
  const subject = payload['sub'];
  const organization = payload['org'] ?? payload['org_id'];
  const exp = payload['exp'];
  if (typeof subject !== 'string' || typeof organization !== 'string') return null;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return null;
  const rawRoles = Array.isArray(payload['roles']) ? payload['roles'] : [];
  const roles: Role[] = [];
  const unknownRoles: string[] = [];
  for (const role of rawRoles) {
    if (typeof role !== 'string') continue;
    if (KNOWN_ROLES.has(role)) roles.push(role as Role);
    else unknownRoles.push(role);
  }
  const iat = payload['iat'];
  return {
    subject,
    organizationId: organization,
    roles,
    unknownRoles,
    issuedAt: typeof iat === 'number' ? asNumber(iat, 0) : null,
    expiresAt: exp,
  };
}

export function secondsUntilExpiry(claims: TokenClaims, nowMs: number): number {
  return Math.floor(claims.expiresAt - nowMs / 1000);
}
