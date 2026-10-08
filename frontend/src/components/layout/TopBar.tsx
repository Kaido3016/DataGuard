import { useApiHealth } from '../../hooks/useApiHealth';
import { useI18n } from '../../i18n';
import { useAuth, useSessionSecondsLeft } from '../../state/auth';
import { formatCountdown, shortId } from '../../utils/format';
import { Icon } from '../common/Icon';

function ApiStatus() {
  const { t } = useI18n();
  const { state } = useApiHealth();
  const key = state.status === 'checking' ? 'api.checking' : state.status === 'ok' ? 'api.ok' : state.status === 'degraded' ? 'api.degraded' : 'api.unreachable';
  return (
    <span className={`status-chip status-${state.status}`} role="status">
      <span className="status-dot" aria-hidden="true" />
      {t(key)}
    </span>
  );
}

function SessionClock() {
  const { t } = useI18n();
  const left = useSessionSecondsLeft();
  if (left === null) return null;
  return (
    <span className="chip-plain" title={t('session.expires')}>
      <Icon name="clock" size={14} />
      <span className="sr-only">{t('session.expires')} </span>
      {formatCountdown(left)}
    </span>
  );
}

export function SessionBanner() {
  const { t } = useI18n();
  const left = useSessionSecondsLeft();
  if (left === null || left > 120) return null;
  return (
    <div className="session-banner" role="status">
      <Icon name="alert" size={16} />
      {t('session.banner', { time: formatCountdown(left) })}
    </div>
  );
}

export function TopBar({
  title,
  navOpen,
  onToggleNav,
  menuRef,
}: {
  title: string;
  navOpen: boolean;
  onToggleNav: () => void;
  menuRef: { current: HTMLButtonElement | null };
}) {
  const { t, td, locale, setLocale } = useI18n();
  const { session, signOut } = useAuth();
  const roles = session?.claims.roles ?? [];
  const workspace = session?.organizationSlug ?? (session ? shortId(session.claims.organizationId) : '');
  const identity = session?.email ?? (session ? shortId(session.claims.subject) : '');
  const roleLabel = roles.length > 0 ? td('role', roles[0] ?? '') + (roles.length > 1 ? ` +${roles.length - 1}` : '') : t('role.none');
  return (
    <header className="topbar">
      <button
        ref={menuRef as { current: HTMLButtonElement | null }}
        type="button"
        className="icon-btn menu-btn"
        onClick={onToggleNav}
        aria-expanded={navOpen}
        aria-controls="primary-nav"
        aria-label={t('nav.toggle')}
      >
        <Icon name="menu" size={20} />
      </button>
      <div className="topbar-title">
        <p className="eyebrow">{t('app.platform')}</p>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <ApiStatus />
        <span className="chip-plain" title={t('topbar.workspace')}>
          <Icon name="shield" size={14} />
          <span className="sr-only">{t('topbar.workspace')}: </span>
          {workspace}
        </span>
        <span className="chip-plain chip-user" title={t('topbar.user')}>
          <Icon name="user" size={14} />
          <span className="sr-only">{t('topbar.user')}: </span>
          <span className="chip-user-id">{identity}</span>
          <span className="chip-role">{roleLabel}</span>
        </span>
        <SessionClock />
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => setLocale(locale === 'fr-CA' ? 'en-CA' : 'fr-CA')}
          lang={locale === 'fr-CA' ? 'en' : 'fr'}
          aria-label={t('topbar.language')}
        >
          <Icon name="globe" size={14} />
          {locale === 'fr-CA' ? 'EN' : 'FR'}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => signOut('user')}>
          <Icon name="logout" size={14} />
          {t('action.signOut')}
        </button>
      </div>
    </header>
  );
}
