import { useMemo, useSyncExternalStore } from 'react';
import { isRoutePath } from '../constants/routes';
import type { RoutePath } from '../constants/routes';

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function snapshot(): string {
  return window.location.hash;
}

export function parseHash(hash: string): { path: string; query: URLSearchParams } {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [pathPart = '', queryPart = ''] = raw.split('?', 2);
  let path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return { path: path || '/', query: new URLSearchParams(queryPart) };
}

export interface RouteState {
  /** Null when the hash does not match a known route. */
  readonly route: RoutePath | null;
  readonly rawPath: string;
  readonly query: URLSearchParams;
}

export function useRoute(): RouteState {
  const hash = useSyncExternalStore(subscribe, snapshot, () => '');
  return useMemo(() => {
    const { path, query } = parseHash(hash);
    return { route: isRoutePath(path) ? path : null, rawPath: path, query };
  }, [hash]);
}

export function hrefFor(path: RoutePath, query?: Record<string, string>): string {
  const search = query ? `?${new URLSearchParams(query).toString()}` : '';
  return `#${path}${search}`;
}

export function navigate(path: RoutePath, query?: Record<string, string>): void {
  window.location.hash = hrefFor(path, query).slice(1);
}
