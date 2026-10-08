import { useState } from 'react';
import { getAuditIntegrity } from '../../api/audit';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useI18n } from '../../i18n';
import { useAuth } from '../../state/auth';
import { useWorkspace } from '../../state/workspace';
import { formatDateTime } from '../../utils/format';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { ErrorState, Notice, Skeleton } from '../common/States';

export function IntegrityCard() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const { isDemo } = useWorkspace();
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const verify = useAsyncAction(async (signal) => {
    const result = await getAuditIntegrity({ signal });
    setCheckedAt(new Date().toISOString());
    return result;
  });
  const allowed = can('audit:read') && !isDemo;

  return (
    <div className="stack">
      <p>{t('audit.integrity.body')}</p>
      {!allowed ? <Notice tone="warning">{isDemo ? t('demo.live') : t('audit.forbidden')}</Notice> : null}
      <div className="inline-actions">
        <Button variant="primary" icon="audit" onClick={() => void verify.run()} busy={verify.state.status === 'loading'} disabled={!allowed}>
          {t('audit.verify')}
        </Button>
      </div>
      <div aria-live="polite">
        {verify.state.status === 'loading' ? <Skeleton lines={2} label={t('audit.verifying')} /> : null}
        {verify.state.status === 'error' ? <ErrorState error={verify.state.error} onRetry={() => void verify.run()} /> : null}
        {verify.state.status === 'success' ? (
          verify.state.data.valid ? (
            <div className="integrity integrity-ok" role="status">
              <Icon name="check" size={20} />
              <div>
                <strong>{t('audit.valid')}</strong>
                <p>{t('audit.checked', { n: verify.state.data.recordsChecked })}{checkedAt ? ` · ${formatDateTime(checkedAt, locale)}` : ''}</p>
              </div>
            </div>
          ) : (
            <div className="integrity integrity-bad" role="alert">
              <Icon name="xCircle" size={20} />
              <div>
                <strong>{t('audit.invalid')}</strong>
                <p>{t('audit.checked', { n: verify.state.data.recordsChecked })}</p>
                {verify.state.data.firstBrokenLink ? (
                  <dl className="kv">
                    <dt>{t('audit.broken.index')}</dt><dd>{verify.state.data.firstBrokenLink.index}</dd>
                    <dt>{t('audit.broken.event')}</dt><dd><code>{verify.state.data.firstBrokenLink.eventId}</code></dd>
                    <dt>{t('audit.broken.reason')}</dt><dd><code>{verify.state.data.firstBrokenLink.reason}</code></dd>
                  </dl>
                ) : null}
                <p className="small">{t('audit.invalid.action')}</p>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
