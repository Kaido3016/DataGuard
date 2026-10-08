import { ROUTES } from '../../constants/routes';
import type { RoutePath } from '../../constants/routes';
import type { MessageKey } from '../../i18n';
import type { IconName } from '../common/Icon';

export interface NavItem {
  readonly path: RoutePath;
  readonly label: MessageKey;
  readonly icon: IconName;
  readonly group: 'main' | 'workspace';
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: ROUTES.overview, label: 'nav.overview', icon: 'overview', group: 'main' },
  { path: ROUTES.discovery, label: 'nav.discovery', icon: 'discovery', group: 'main' },
  { path: ROUTES.findings, label: 'nav.findings', icon: 'findings', group: 'main' },
  { path: ROUTES.pia, label: 'nav.pia', icon: 'pia', group: 'main' },
  { path: ROUTES.remediation, label: 'nav.remediation', icon: 'remediation', group: 'main' },
  { path: ROUTES.audit, label: 'nav.audit', icon: 'audit', group: 'main' },
  { path: ROUTES.settings, label: 'nav.settings', icon: 'settings', group: 'workspace' },
];
