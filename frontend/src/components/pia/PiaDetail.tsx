import { useId, useState } from 'react';
import { transitionPia } from '../../api/pia';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
import { useAuth } from '../../state/auth';
import { useWorkspace } from '../../state/workspace';
import { PIA_LIMITS, PIA_STATUSES, PIA_TRANSITIONS } from '../../types/pia';
import type { PiaRecord, PiaStatus } from '../../types/pia';
import { RISK_RANK } from '../../types/risk';
import type { RiskLevel } from '../../types/risk';
import { formatDateTime, shortId } from '../../utils/format';
import { Button } from '../common/Button';
import { DemoTag, SeverityBadge, StatusBadge } from '../common/Badges';
import type { Tone } from '../common/Badges';
import { TextAreaField } from '../common/Fields';
import { Icon } from '../common/Icon';
import { ErrorState, Notice } from '../common/States';

export const PIA_TONE: Record<PiaStatus, Tone> = {
  DRAFT: 'neutral',
  IN_REVIEW: 'info',
  REQUIRES_REMEDIATION: 'danger',
  APPROVED: 'success',
  ARCHIVED: 'neutral',
};

export function highestRisk(record: PiaRecord): RiskLevel | null {
  let top: RiskLevel | null = null;
  for (const risk of record.draft?.risks ?? []) {
    if (top === null || RISK_RANK[risk.level] > RISK_RANK[top]) top = risk.level;
  }
  return top;
}

export function openIssues(record: PiaRecord): number {
  return (record.draft?.risks ?? []).filter((risk) => risk.mitigation === '').length;
}

export function PiaDetail({ record }: { record: PiaRecord }) {
  const { t, td, locale } = useI18n();
  const uid = useId();
  const { session, can } = useAuth();
  const { updatePia, isDemo } = useWorkspace();
  const [reason, setReason] = useState('');
  const move = useAsyncAction(async (signal, target: PiaStatus) => {
    const summary = await transitionPia(record.id, target, reason.trim(), { signal });
    return updatePia(record, summary, reason.trim());
  });

  const allowed = can('pia:manage') && !isDemo;
  const targets = PIA_TRANSITIONS[record.status];
  const risk = highestRisk(record);
  const issues = openIssues(record);
  const owner = session && record.ownerId === session.claims.subject ? t('pia.owner.you') : shortId(record.ownerId);

  return (
    <div className="stack">
      <dl className="kv kv-grid">
        <div><dt>{t('pia.status')}</dt><dd><StatusBadge tone={PIA_TONE[record.status]}>{td('pia.status', record.status)}</StatusBadge></dd></div>
        <div><dt>{t('pia.owner')}</dt><dd>{owner}</dd></div>
        <div><dt>{t('pia.riskLevel')}</dt><dd>{risk ? <SeverityBadge level={risk} /> : <span className="muted">{t('pia.review.none')}</span>}</dd></div>
        <div><dt>{t('pia.openIssues')}</dt><dd>{issues}</dd></div>
        <div><dt>{t('pia.reviewState')}</dt><dd>{td('pia.review', record.status)}</dd></div>
        <div><dt>{t('pia.version')}</dt><dd>v{record.version}</dd></div>
      </dl>
      {record.origin === 'demo' ? <p><DemoTag /></p> : null}

      <div>
        <h3 className="detail-title">{t('pia.workflow')}</h3>
        <ol className="workflow-track" aria-label={t('pia.workflow')}>
          {PIA_STATUSES.map((status) => {
            const state = status === record.status ? 'current' : targets.includes(status) ? 'next' : 'other';
            return (
              <li key={status} className={`wf wf-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                <span className="wf-name">{td('pia.status', status)}</span>
                <span className="wf-state">{state === 'current' ? t('pia.wf.current') : state === 'next' ? t('pia.wf.next') : ''}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <Notice tone="info" title={t('pia.requiredActions')}>{t(`pia.next.${record.status}` as MessageKey)}</Notice>

      {targets.length > 0 ? (
        <div className="form-stack">
          <h3 className="detail-title">{t('pia.transition')}</h3>
          {!allowed ? <Notice tone="warning">{isDemo ? t('demo.readonly') : t('pia.forbidden')}</Notice> : null}
          <TextAreaField id={`${uid}-reason`} label={t('pia.transition.reason')} value={reason} onChange={setReason} rows={2} maxLength={PIA_LIMITS.transitionReason} disabled={!allowed} hint={t('pia.transition.hint')} />
          <div className="inline-actions">
            {targets.map((target) => (
              <Button key={target} variant={target === 'APPROVED' ? 'primary' : 'secondary'} disabled={!allowed} busy={move.state.status === 'loading'} onClick={() => void move.run(target)}>
                {t('pia.moveTo', { status: td('pia.status', target) })}
              </Button>
            ))}
          </div>
          {move.state.status === 'error' ? <ErrorState error={move.state.error} /> : null}
        </div>
      ) : (
        <p className="muted">{t('pia.terminal')}</p>
      )}

      <div>
        <h3 className="detail-title">{t('pia.history')}</h3>
        <p className="muted small">{t('pia.history.note')}</p>
        <ol className="timeline timeline-compact">
          {[...record.history].reverse().map((item) => (
            <li key={item.at + item.toStatus} className="timeline-item">
              <span className="timeline-time">{formatDateTime(item.at, locale)}</span>
              <span className="timeline-body">
                <Icon name="chevronRight" size={14} />
                {item.fromStatus ? `${td('pia.status', item.fromStatus)} → ` : ''}{td('pia.status', item.toStatus)}
                {item.reason ? <span className="muted"> — {item.reason}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
