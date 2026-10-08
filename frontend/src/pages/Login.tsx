import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { config } from '../constants/config';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n';
import { AuthInputError, useAuth } from '../state/auth';
import { Button } from '../components/common/Button';
import { TextField } from '../components/common/Fields';
import { Icon } from '../components/common/Icon';
import { Notice } from '../components/common/States';

type Tab = 'dev' | 'token';

export function LoginPage() {
  const { t, locale, setLocale } = useI18n();
  const { signInWithPassword, signInWithToken, signOutReason } = useAuth();
  const [tab, setTab] = useState<Tab>(config.enableDevLogin ? 'dev' : 'token');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<MessageKey | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ slug?: string; email?: string; password?: string; token?: string }>({});

  useEffect(() => {
    document.title = `${t('login.title')} — DataGuard Québec`;
  }, [t]);

  const login = useAsyncAction(async (signal, input: { slug: string; email: string; password: string }) => {
    await signInWithPassword({ organizationSlug: input.slug, email: input.email, password: input.password }, signal);
  });

  const submitDev = async (): Promise<void> => {
    const errors: typeof fieldErrors = {};
    if (!slug.trim()) errors.slug = t('login.required');
    if (!email.trim()) errors.email = t('login.required');
    if (!password) errors.password = t('login.required');
    setFieldErrors(errors);
    setMessage(null);
    if (Object.keys(errors).length > 0) return;
    await login.run({ slug, email, password });
    setPassword('');
  };

  const submitToken = (): void => {
    setMessage(null);
    if (!token.trim()) {
      setFieldErrors({ token: t('login.required') });
      return;
    }
    setFieldErrors({});
    try {
      signInWithToken(token);
      setToken('');
    } catch (error) {
      if (error instanceof AuthInputError) setMessage(error.code === 'expired_token' ? 'login.token.expired' : 'login.token.invalid');
      else setMessage('error.unknown');
    }
  };

  let devError: MessageKey | null = null;
  if (login.state.status === 'error') {
    const error = login.state.error;
    devError =
      error.kind === 'unauthorized' ? 'login.error.invalid'
      : error.kind === 'rate_limited' ? 'login.error.locked'
      : error.kind === 'not_found' ? 'login.error.devDisabled'
      : error.kind === 'network' || error.kind === 'timeout' ? 'error.network'
      : error.kind === 'contract' ? 'error.contract'
      : 'error.server';
  }

  const reasonKey: MessageKey | null =
    signOutReason === 'expired' ? 'login.reason.expired'
    : signOutReason === 'unauthorized' ? 'login.reason.unauthorized'
    : signOutReason === 'user' ? 'login.reason.user'
    : null;

  return (
    <div className="login">
      <section className="login-brand" aria-label={t('login.brand')}>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">DG</span>
          <div className="brand-text"><strong>DataGuard</strong><span>Québec</span></div>
        </div>
        <h1 className="login-headline">{t('dashboard.headline')}</h1>
        <p className="login-sub">{t('dashboard.subtitle')}</p>
        <ol className="login-flow" aria-label={t('flow.label')}>
          {(['flow.discovery', 'flow.risk', 'flow.compliance', 'flow.pia', 'flow.remediation', 'flow.audit'] as const).map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ol>
        <ul className="login-points">
          <li><Icon name="lock" size={16} />{t('login.point.tenant')}</li>
          <li><Icon name="shield" size={16} />{t('login.point.explainable')}</li>
          <li><Icon name="audit" size={16} />{t('login.point.audit')}</li>
        </ul>
      </section>

      <main id="main-content" className="login-panel" tabIndex={-1}>
        <div className="login-card">
          <div className="login-card-head">
            <h2>{t('login.title')}</h2>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setLocale(locale === 'fr-CA' ? 'en-CA' : 'fr-CA')} lang={locale === 'fr-CA' ? 'en' : 'fr'}>
              <Icon name="globe" size={14} />{locale === 'fr-CA' ? 'EN' : 'FR'}
            </button>
          </div>
          {reasonKey ? <Notice tone={signOutReason === 'user' ? 'info' : 'warning'} live>{t(reasonKey)}</Notice> : null}

          {config.enableDevLogin ? (
            <div className="tabs" role="tablist" aria-label={t('login.method')}>
              {(['dev', 'token'] as const).map((item) => (
                <button key={item} type="button" role="tab" id={`login-tab-${item}`} aria-selected={tab === item} aria-controls={`login-panel-${item}`}
                  tabIndex={tab === item ? 0 : -1} className={`tab${tab === item ? ' is-active' : ''}`} onClick={() => { setTab(item); setMessage(null); }}>
                  {t(item === 'dev' ? 'login.tab.dev' : 'login.tab.token')}
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'dev' && config.enableDevLogin ? (
            <form className="form-stack" id="login-panel-dev" role="tabpanel" aria-labelledby="login-tab-dev" noValidate
              onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submitDev(); }}>
              <p className="muted small">{t('login.dev.note')}</p>
              <TextField id="login-slug" label={t('login.slug')} value={slug} onChange={setSlug} autoComplete="organization" error={fieldErrors.slug} required />
              <TextField id="login-email" label={t('login.email')} type="email" value={email} onChange={setEmail} autoComplete="username" error={fieldErrors.email} required />
              <TextField id="login-password" label={t('login.password')} type="password" value={password} onChange={setPassword} autoComplete="current-password" error={fieldErrors.password} required />
              {devError ? <Notice tone="danger" live>{t(devError)}</Notice> : null}
              <Button type="submit" variant="primary" busy={login.state.status === 'loading'} icon="lock">{t('login.submit')}</Button>
            </form>
          ) : (
            <form className="form-stack" id="login-panel-token" role={config.enableDevLogin ? 'tabpanel' : undefined} aria-labelledby={config.enableDevLogin ? 'login-tab-token' : undefined} noValidate
              onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); submitToken(); }}>
              <p className="muted small">{t('login.token.note')}</p>
              <TextField id="login-token" label={t('login.token')} type="password" value={token} onChange={setToken} autoComplete="off" error={fieldErrors.token} required />
              {message ? <Notice tone="danger" live>{t(message)}</Notice> : null}
              <Button type="submit" variant="primary" icon="lock">{t('login.submit')}</Button>
            </form>
          )}
          <p className="muted small login-foot">{t('login.memory')}</p>
        </div>
      </main>
    </div>
  );
}
