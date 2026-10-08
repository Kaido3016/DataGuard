import { ROLES } from '../types/auth';
import type { Permission, Role } from '../types/auth';

/**
 * UX-ONLY mirror of dataguard/security/policy.py. It decides which controls are shown or
 * disabled. The backend re-checks every request, so editing this table in the browser grants
 * nothing; a 403 response is always handled.
 */
const ALL_ROLES: readonly Role[] = ROLES;

export const PERMISSION_ROLES: Readonly<Record<Permission, readonly Role[]>> = {
  'analysis:read': ALL_ROLES,
  'analysis:write': ['analyst', 'privacy_officer', 'org_admin'],
  'pii:review': ['analyst', 'privacy_officer', 'security_admin', 'org_admin'],
  'pia:manage': ['privacy_officer', 'org_admin'],
  'security:manage': ['security_admin', 'org_admin'],
  'organization:manage': ['org_admin'],
  'audit:read': ['privacy_officer', 'security_admin', 'org_admin'],
};

export function hasPermission(roles: readonly Role[], permission: Permission): boolean {
  const allowed = PERMISSION_ROLES[permission];
  return roles.some((role) => allowed.includes(role));
}
