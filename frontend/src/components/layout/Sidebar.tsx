import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import { hrefFor } from '../../hooks/useRoute';
import type { RoutePath } from '../../constants/routes';
import { Icon } from '../common/Icon';
import { NAV_ITEMS } from './nav';

export function Sidebar({
  open,
  current,
  onClose,
}: {
  open: boolean;
  current: RoutePath | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const firstLink = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    firstLink.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const renderItems = (group: 'main' | 'workspace') =>
    NAV_ITEMS.filter((item) => item.group === group).map((item, index) => (
      <li key={item.path}>
        <a
          ref={group === 'main' && index === 0 ? firstLink : undefined}
          className={`nav-link${current === item.path ? ' is-active' : ''}`}
          href={hrefFor(item.path)}
          aria-current={current === item.path ? 'page' : undefined}
          onClick={onClose}
        >
          <Icon name={item.icon} size={18} />
          <span>{t(item.label)}</span>
        </a>
      </li>
    ));

  return (
    <>
      {open ? <button type="button" className="scrim" tabIndex={-1} aria-label={t('action.close')} onClick={onClose} /> : null}
      <aside id="primary-nav" className={`sidebar${open ? ' is-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">DG</span>
          <div className="brand-text">
            <strong>DataGuard</strong>
            <span>Québec</span>
          </div>
        </div>
        <nav aria-label={t('nav.label')}>
          <ul className="nav-list">{renderItems('main')}</ul>
          <p className="nav-group">{t('nav.workspace')}</p>
          <ul className="nav-list">{renderItems('workspace')}</ul>
        </nav>
        <div className="sidebar-foot">
          <p className="sidebar-foot-title">{t('sidebar.secure')}</p>
          <p className="sidebar-foot-sub">{t('sidebar.tagline')}</p>
        </div>
      </aside>
    </>
  );
}
