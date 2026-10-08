import { describe, expect, it } from 'vitest';
import { decodeClaims, secondsUntilExpiry } from './jwt';
import { fakeToken } from './testing';

describe('decodeClaims', () => {
  it('decodes the claims DataGuard issues', () => {
    const claims = decodeClaims(
      fakeToken({ sub: 'user-1', org: 'org-1', roles: ['privacy_officer'], iat: 100, exp: 1000 }),
    );
    expect(claims).toEqual({
      subject: 'user-1',
      organizationId: 'org-1',
      roles: ['privacy_officer'],
      unknownRoles: [],
      issuedAt: 100,
      expiresAt: 1000,
    });
  });

  it('accepts the org_id claim used by external identity providers', () => {
    expect(decodeClaims(fakeToken({ sub: 'u', org_id: 'o', roles: [], exp: 5 }))?.organizationId).toBe('o');
  });

  it('separates unknown roles instead of trusting them', () => {
    const claims = decodeClaims(fakeToken({ sub: 'u', org: 'o', roles: ['analyst', 'superuser'], exp: 5 }));
    expect(claims?.roles).toEqual(['analyst']);
    expect(claims?.unknownRoles).toEqual(['superuser']);
  });

  it('handles non-ASCII subjects', () => {
    expect(decodeClaims(fakeToken({ sub: 'Zoë-é', org: 'o', roles: [], exp: 5 }))?.subject).toBe('Zoë-é');
  });

  it('rejects malformed or incomplete tokens', () => {
    expect(decodeClaims('')).toBeNull();
    expect(decodeClaims('abc.def')).toBeNull();
    expect(decodeClaims('a.!!!.c')).toBeNull();
    expect(decodeClaims(fakeToken({ org: 'o', roles: [], exp: 5 }))).toBeNull(); // no sub
    expect(decodeClaims(fakeToken({ sub: 'u', roles: [], exp: 5 }))).toBeNull(); // no org
    expect(decodeClaims(fakeToken({ sub: 'u', org: 'o', roles: [] }))).toBeNull(); // no exp
    expect(decodeClaims(fakeToken({ sub: 'u', org: 'o', roles: [], exp: 'soon' }))).toBeNull();
  });
});

describe('secondsUntilExpiry', () => {
  it('computes remaining lifetime and goes negative after expiry', () => {
    const claims = decodeClaims(fakeToken({ sub: 'u', org: 'o', roles: [], exp: 1000 }));
    if (!claims) throw new Error('claims expected');
    expect(secondsUntilExpiry(claims, 940_000)).toBe(60);
    expect(secondsUntilExpiry(claims, 1_010_000)).toBe(-10);
  });
});
