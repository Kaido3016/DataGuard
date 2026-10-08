/** Roles recognised by the backend authorization policy (dataguard/security/policy.py). */
export const ROLES = [
  'viewer',
  'analyst',
  'privacy_officer',
  'security_admin',
  'org_admin',
] as const;
export type Role = (typeof ROLES)[number];

/** Permissions enforced by the backend. The UI mirrors them only to hide/disable controls. */
export const PERMISSIONS = [
  'analysis:read',
  'analysis:write',
  'pii:review',
  'pia:manage',
  'security:manage',
  'organization:manage',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Claims decoded (NOT verified) from the bearer token for display and expiry handling only. */
export interface TokenClaims {
  /** User identifier (`sub`). */
  readonly subject: string;
  /** Tenant / organization identifier (`org` or `org_id`). */
  readonly organizationId: string;
  readonly roles: readonly Role[];
  /** Role strings the UI does not recognise (forward compatibility). */
  readonly unknownRoles: readonly string[];
  /** Issued-at, epoch seconds, if present. */
  readonly issuedAt: number | null;
  /** Expiry, epoch seconds. */
  readonly expiresAt: number;
}

export type AuthMethod = 'dev-login' | 'bearer-token';

/** Authenticated session metadata. The token itself is kept out of React state. */
export interface Session {
  readonly claims: TokenClaims;
  readonly method: AuthMethod;
  /** Organization slug typed at dev sign-in (the token only carries the id). */
  readonly organizationSlug: string | null;
  /** E-mail typed at dev sign-in, kept in memory for display only. */
  readonly email: string | null;
  readonly authenticatedAt: number;
}

export type SignOutReason = 'user' | 'expired' | 'unauthorized';

export interface DevLoginInput {
  readonly organizationSlug: string;
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  readonly accessToken: string;
  readonly expiresInSeconds: number;
}
