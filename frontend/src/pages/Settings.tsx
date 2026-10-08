import { config } from '../constants/config';
import { useApiHealth } from '../hooks/useApiHealth';
import { useI18n } from '../i18n';
import { useAuth, useSessionSecondsLeft } from '../state/auth';
import { useWorkspace } from '../state/workspace';
import { PERMISSIONS, ROLES } from '../types/auth';
import { PERMISSION_ROLES } from '../utils/permissions';
import { formatCountdown } from '../utils/format';
import { Button } from '../components/common/Button';
import { Icon } from '../components/common/Icon';
import { Panel } from '../components/common/Panel';
import { Notice } from '../components/common/States';

export function SettingsPage() {
  const { t, td, locale, setLocale } = useI18n();
  const { session, signOut } = useAuth();
  const { isDemo, demoAvailable, setDemoMode } = useWorkspace();
  const { state, refresh } = useApiHealth();
  const left = useSessionSecondsLeft();
  if (!session) return null;
  const roles = session.claims.roles;

  return (
    <div className="page">
      <p className="page-intro">{t('settings.intro')}</p>
      <div className="grid-two">
        <Panel title={t('settings.session')} id="set-session">
          <dl className="kv kv-wide">
            <dt>{t('settings.user')}</dt><dd><code>{session.claims.subject}</code></dd>
            <dt>{t('settings.org')}</dt><dd><code>{session.claims.organizationId}</code></dd>
            {session.organizationSlug ? (<><dt>{t('settings.slug')}</dt><dd>{session.organizationSlug}</dd></>) : null}
            <dt>{t('settings.roles')}</dt><dd>{roles.length ? roles.map((role) => td('role', role)).join(', ') : t('role.none')}</dd>
            <dt>{t('settings.method')}</dt><dd>{t(session.method === 'dev-login' ? 'settings.method.dev' : 'settings.method.token')}</dd>
            <dt>{t('settings.expires')}</dt><dd>{left === null ? '—' : formatCountdown(left)}</dd>
          </dl>
          {session.claims.unknownRoles.length > 0 ? <Notice tone="warning">{t('settings.unknownRoles')}</Notice> : null}
          <p className="muted small">{t('settings.session.note')}</p>
          <Button icon="logout" onClick={() => signOut('user')}>{t('action.signOut')}</Button>
        </Panel>

        <Panel title={t('settings.preferences')} id="set-prefs">
          <div className="stack">
            <div className="inline-actions">
              <Button icon="globe" onClick={() => setLocale('fr-CA')} variant={locale === 'fr-CA' ? 'primary' : 'secondary'}>Français (Canada)</Button>
              <Button icon="globe" onClick={() => setLocale('en-CA')} variant={locale === 'en-CA' ? 'primary' : 'secondary'}>English (Canada)</Button>
            </div>
            {demoAvailable ? (
              <div className="stack">
                <h3 className="detail-title">{t('settings.demo')}</h3>
                <p className="muted">{t('settings.demo.body')}</p>
                <Button onClick={() => void setDemoMode(!isDemo)} variant={isDemo ? 'secondary' : 'primary'}>{isDemo ? t('demo.exit') : t('settings.demo.enable')}</Button>
              </div>
            ) : (
              <p className="muted small">{t('settings.demo.off')}</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel title={t('settings.api')} id="set-api" actions={<Button small icon="refresh" onClick={refresh}>{t('action.refresh')}</Button>}>
        <dl className="kv kv-wide">
          <dt>{t('settings.api.base')}</dt><dd><code>{config.apiBaseUrl || t('settings.api.sameOrigin')}</code></dd>
          <dt>{t('settings.api.status')}</dt>
          <dd>{state.status === 'checking' ? t('api.checking') : state.status === 'unreachable' ? t('api.unreachable') : state.status === 'ok' ? t('api.ok') : t('api.degraded')}</dd>
          {state.status === 'ok' || state.status === 'degraded'
            ? Object.entries(state.health.checks).map(([name, value]) => (<><dt key={`${name}-k`}>{name}</dt><dd key={`${name}-v`}>{value}</dd></>))
            : null}
        </dl>
      </Panel>

      <Panel title={t('settings.permissions')} id="set-perms">
        <p className="muted">{t('settings.permissions.note')}</p>
        <div className="table-wrap">
          <table className="table table-matrix">
            <caption className="sr-only">{t('settings.permissions')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('settings.permission')}</th>
                {ROLES.map((role) => <th key={role} scope="col" className={roles.includes(role) ? 'is-you' : undefined}>{td('role', role)}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission}>
                  <th scope="row"><code>{permission}</code></th>
                  {ROLES.map((role) => {
                    const yes = PERMISSION_ROLES[permission].includes(role);
                    return (
                      <td key={role} className={roles.includes(role) ? 'is-you' : undefined}>
                        {yes ? <><Icon name="check" size={14} /><span className="sr-only">{t('settings.yes')}</span></> : <span aria-hidden="true">–</span>}
                        {yes ? null : <span className="sr-only">{t('settings.no')}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={t('settings.data')} id="set-data">
        <ul className="bullets">
          <li>{t('settings.data.token')}</li>
          <li>{t('settings.data.text')}</li>
          <li>{t('settings.data.ids')}</li>
          <li>{t('settings.data.tenant')}</li>
        </ul>
      </Panel>
    </div>
  );
}
