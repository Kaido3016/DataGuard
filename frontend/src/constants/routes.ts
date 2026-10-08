export const ROUTES = {
  overview: '/',
  discovery: '/discovery',
  findings: '/findings',
  pia: '/pia',
  remediation: '/remediation',
  audit: '/audit',
  settings: '/settings',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

const ROUTE_VALUES: readonly string[] = Object.values(ROUTES);

export function isRoutePath(value: string): value is RoutePath {
  return ROUTE_VALUES.includes(value);
}
