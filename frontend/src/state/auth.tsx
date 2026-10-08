import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { devLogin } from '../api/auth';
import { setUnauthorizedHandler, tokenStore } from '../api/http';
import type { AuthMethod, DevLoginInput, Permission, Session, SignOutReason } from '../types/auth';
import { decodeClaims, secondsUntilExpiry } from '../utils/jwt';
import { hasPermission } from '../utils/permissions';

/** Raised when a pasted/issued token cannot be used. */
export class AuthInputError extends Error {
  readonly code: 'invalid_token' | 'expired_token';
  constructor(code: 'invalid_token' | 'expired_token') {
    super(code);
    this.name = 'AuthInputError';
    this.code = code;
  }
}

interface AuthContextValue {
  readonly session: Session | null;
  readonly signOutReason: SignOutReason | null;
  readonly signInWithPassword: (input: DevLoginInput, signal?: AbortSignal) => Promise<void>;
  readonly signInWithToken: (rawToken: string) => void;
  readonly signOut: (reason?: SignOutReason) => void;
  /** UX hint only; the backend authorizes every request. */
  readonly can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [signOutReason, setSignOutReason] = useState<SignOutReason | null>(null);

  const signOut = useCallback((reason: SignOutReason = 'user') => {
    tokenStore.clear();
    setSession(null);
    setSignOutReason(reason);
  }, []);

  const establish = useCallback(
    (token: string, method: AuthMethod, organizationSlug: string | null, email: string | null) => {
      const claims = decodeClaims(token);
      if (!claims) throw new AuthInputError('invalid_token');
      if (secondsUntilExpiry(claims, Date.now()) <= 0) throw new AuthInputError('expired_token');
      tokenStore.set(token);
      setSignOutReason(null);
      setSession({ claims, method, organizationSlug, email, authenticatedAt: Date.now() });
    },
    [],
  );

  const signInWithPassword = useCallback(
    async (input: DevLoginInput, signal?: AbortSignal) => {
      const result = await devLogin(input, signal);
      establish(result.accessToken, 'dev-login', input.organizationSlug.trim(), input.email.trim());
    },
    [establish],
  );

  const signInWithToken = useCallback(
    (rawToken: string) => {
      const token = rawToken.trim().replace(/^Bearer\s+/i, '');
      establish(token, 'bearer-token', null, null);
    },
    [establish],
  );

  // A 401 on any authenticated call ends the session consistently.
  useEffect(() => {
    setUnauthorizedHandler(() => signOut('unauthorized'));
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Sign out when the access token expires (there is no refresh endpoint).
  useEffect(() => {
    if (!session) return undefined;
    const check = (): void => {
      if (secondsUntilExpiry(session.claims, Date.now()) <= 0) signOut('expired');
    };
    check();
    const id = window.setInterval(check, 5000);
    return () => window.clearInterval(id);
  }, [session, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signOutReason,
      signInWithPassword,
      signInWithToken,
      signOut,
      can: (permission) => (session ? hasPermission(session.claims.roles, permission) : false),
    }),
    [session, signOutReason, signInWithPassword, signInWithToken, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** Seconds left on the access token, updated every second (isolated so only the clock re-renders). */
export function useSessionSecondsLeft(): number | null {
  const { session } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!session) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);
  return session ? Math.max(0, secondsUntilExpiry(session.claims, now)) : null;
}
