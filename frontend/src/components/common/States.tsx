import type { ReactNode } from 'react';
import { isApiError } from '../../api/errors';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
import { Button } from './Button';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export function Skeleton({ lines = 3, label }: { lines?: number; label?: string }) {
  const { t } = useI18n();
  return (
    <div className="skeleton-block" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label ?? t('state.loading')}</span>
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} className={`skeleton-line${index === lines - 1 ? ' is-short' : ''}`} aria-hidden="true" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon = 'info',
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="state state-empty">
      <span className="state-icon" aria-hidden="true">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="state-title">{title}</h3>
      {children ? <p className="state-body">{children}</p> : null}
      {action ? <div className="state-action">{action}</div> : null}
    </div>
  );
}

const ERROR_BODY: Record<string, MessageKey> = {
  network: 'error.network',
  timeout: 'error.timeout',
  unauthorized: 'error.unauthorized',
  forbidden: 'error.forbidden',
  not_found: 'error.notFound',
  conflict: 'error.conflict',
  validation: 'error.validation',
  rate_limited: 'error.rateLimited',
  payload_too_large: 'error.tooLarge',
  server: 'error.server',
  contract: 'error.contract',
};

/** Human-readable message for any thrown value, never leaking more than the typed error carries. */
export function useErrorText(): (error: unknown) => { body: string; detail: string | null; reference: string | null } {
  const { t } = useI18n();
  return (error) => {
    if (!isApiError(error)) return { body: t('error.unknown'), detail: null, reference: null };
    const key = ERROR_BODY[error.kind] ?? 'error.unknown';
    const showDetail = error.kind === 'conflict' || error.kind === 'validation' || error.kind === 'not_found';
    return {
      body: t(key, { seconds: error.retryAfterSeconds ?? 30 }),
      detail: showDetail ? error.detail : null,
      reference: error.requestId,
    };
  };
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const { t } = useI18n();
  const describe = useErrorText();
  const { body, detail, reference } = describe(error);
  const forbidden = isApiError(error) && error.kind === 'forbidden';
  return (
    <div className="state state-error" role="alert">
      <span className="state-icon" aria-hidden="true">
        <Icon name={forbidden ? 'lock' : 'alert'} size={22} />
      </span>
      <h3 className="state-title">{title ?? (forbidden ? t('state.forbidden.title') : t('state.error.title'))}</h3>
      <p className="state-body">{body}</p>
      {detail ? <p className="state-detail">{detail}</p> : null}
      {reference ? (
        <p className="state-ref">
          {t('state.reference')} <code>{reference}</code>
        </p>
      ) : null}
      {onRetry && !forbidden ? (
        <div className="state-action">
          <Button icon="refresh" onClick={onRetry}>
            {t('action.retry')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export type NoticeTone = 'info' | 'warning' | 'danger' | 'success';

const NOTICE_ICON: Record<NoticeTone, IconName> = {
  info: 'info',
  warning: 'alert',
  danger: 'xCircle',
  success: 'check',
};

export function Notice({
  tone = 'info',
  title,
  children,
  live = false,
}: {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
  live?: boolean;
}) {
  return (
    <div className={`notice notice-${tone}`} role={live ? (tone === 'danger' ? 'alert' : 'status') : undefined}>
      <Icon name={NOTICE_ICON[tone]} size={18} />
      <div>
        {title ? <strong className="notice-title">{title}</strong> : null}
        <div className="notice-body">{children}</div>
      </div>
    </div>
  );
}
