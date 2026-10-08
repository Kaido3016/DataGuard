import { useState } from 'react';
import { ROUTES } from '../constants/routes';
import { hrefFor } from '../hooks/useRoute';
import { useI18n } from '../i18n';
import { useAuth } from '../state/auth';
import { useWorkspace } from '../state/workspace';
import { REMEDIATION_SUPPORTED_STATUSES, REMEDIATION_WORKFLOW } from '../types/remediation';
import type { RemediationRecord } from '../types/remediation';
import { RISK_LEVELS } from '../types/risk';
import type { RiskLevel } from '../types/risk';
import { formatDateTime, shortId } from '../utils/format';
import { remediationCounts } from '../utils/selectors';
import { DemoTag, SeverityBadge, StatusBadge } from '../components/common/Badges';
import { Button } from '../components/common/Button';
import { Panel, StatCard } from '../components/common/Panel';
import { EmptyState, Notice } from '../components/common/States';
import { EMPTY_REMEDIATION, RemediationDialog } from '../components/remediation/RemediationDialog';
import type { RemediationDraft } from '../components/remediation/RemediationDialog';

function RemediationDetail({ item }: { item: RemediationRecord }) {
  const { t, td, locale } = useI18n();
  const { session } = useAuth();
  const owner = session && item.ownerId === session.claims.subject ? t('pia.owner.you') : shortId(item.ownerId);
  return (
    <div className="stack">
      <p>{item.description}</p>
      <dl className="kv kv-grid">
        <div><dt>{t('rem.col.priority')}</dt><dd><SeverityBadge level={item.priority} /></dd></div>
        <div><dt>{t('rem.col.owner')}</dt><dd>{owner}</dd></div>
        <div><dt>{t('rem.col.created')}</dt><dd>{formatDateTime(item.createdAt, locale)}</dd></div>
        <div><dt>{t('rem.detail.analysis')}</dt><dd>{item.analysisId ? <code>{shortId(item.analysisId)}</code> : t('rem.detail.none')}</dd></div>
        <div><dt>{t('rem.detail.finding')}</dt><dd>{item.findingId ? <a href={hrefFor(ROUTES.findings, { finding: item.findingId })}>{t('rem.detail.openFinding')}</a> : t('rem.detail.none')}</dd></div>
        <div><dt>{t('rem.detail.pia')}</dt><dd className="muted">{t('rem.detail.unsupported')}</dd></div>
        <div><dt>{t('rem.detail.evidence')}</dt><dd className="muted">{t('rem.detail.unsupported')}</dd></div>
        <div><dt>{t('rem.detail.due')}</dt><dd className="muted">{t('rem.detail.unsupported')}</dd></div>
      </dl>
      <div>
        <h3 className="detail-title">{t('rem.workflow')}</h3>
        <ol className="workflow-track" aria-label={t('rem.workflow')}>
          {REMEDIATION_WORKFLOW.map((status) => {
            const supported = REMEDIATION_SUPPORTED_STATUSES.includes(status);
            const current = status === item.status;
            return (
              <li key={status} className={`wf ${current ? 'wf-current' : supported ? 'wf-other' : 'wf-disabled'}`} aria-current={current ? 'step' : undefined}>
                <span className="wf-name">{td('rem.status', status)}</span>
                <span className="wf-state">{current ? t('pia.wf.current') : supported ? '' : t('rem.wf.unavailable')}</span>
              </li>
            );
          })}
        </ol>
        <p className="muted small">{t('rem.workflow.note')}</p>
      </div>
    </div>
  );
}

export function RemediationPage() {
  const { t, td, locale } = useI18n();
  const { can } = useAuth();
  const { remediations, analyses, isDemo } = useWorkspace();
  const [draft, setDraft] = useState<RemediationDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const counts = remediationCounts(remediations);
  const selected = remediations.find((item) => item.id === selectedId) ?? remediations[0] ?? null;
  const canWrite = can('analysis:write') && !isDemo;

  const existing = new Set(remediations.map((item) => item.title));
  const seen = new Set<string>();
  const suggestions: { text: string; level: RiskLevel; analysisId: string | null }[] = [];
  for (const record of analyses) {
    for (const text of record.risk.recommendations) {
      const title = text.slice(0, 255);
      if (seen.has(text) || existing.has(title)) continue;
      seen.add(text);
      suggestions.push({ text, level: record.risk.level, analysisId: record.analysisId });
    }
  }

  return (
    <div className="page">
      <p className="page-intro">{t('rem.intro')}</p>
      <Notice tone="info">{isDemo ? t('demo.banner') : t('rem.scope')}</Notice>

      <div className="kpi-grid">
        {([...RISK_LEVELS].reverse() as RiskLevel[]).map((level) => (
          <StatCard key={level} label={td('risk.level', level)} value={String(counts[level])} caption={t('rem.items', { n: counts[level] })}
            tone={level === 'CRITICAL' ? 'danger' : level === 'HIGH' ? 'warning' : 'neutral'} />
        ))}
      </div>

      {suggestions.length > 0 ? (
        <Panel title={t('rem.suggested')} id="rem-suggested">
          <ul className="reco-list">
            {suggestions.slice(0, 6).map((item) => (
              <li key={item.text} className="reco">
                <span><SeverityBadge level={item.level} /> <span lang="en">{item.text}</span></span>
                <Button small icon="plus" disabled={!canWrite} onClick={() => setDraft({ title: item.text.slice(0, 255), description: item.text, priority: item.level, analysisId: item.analysisId, findingId: null })}>
                  {t('result.createRemediation')}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title={t('rem.list')} id="rem-list" actions={
        <Button variant="primary" icon="plus" disabled={!canWrite} title={canWrite ? undefined : t('rem.form.forbidden')} onClick={() => setDraft(EMPTY_REMEDIATION)}>{t('rem.new')}</Button>
      }>
        {remediations.length === 0 ? (
          <EmptyState icon="remediation" title={t('rem.empty.title')}>{t('rem.empty.body')}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table table-stack">
              <caption className="sr-only">{t('rem.list')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('rem.col.issue')}</th>
                  <th scope="col">{t('rem.col.priority')}</th>
                  <th scope="col">{t('rem.col.status')}</th>
                  <th scope="col">{t('rem.col.created')}</th>
                  <th scope="col"><span className="sr-only">{t('col.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {remediations.map((item) => (
                  <tr key={item.id} className={item.id === selected?.id ? 'is-selected' : undefined}>
                    <td data-label={t('rem.col.issue')}><strong>{item.title}</strong> {item.origin === 'demo' ? <DemoTag /> : null}</td>
                    <td data-label={t('rem.col.priority')}><SeverityBadge level={item.priority} /></td>
                    <td data-label={t('rem.col.status')}><StatusBadge tone="info">{td('rem.status', item.status)}</StatusBadge></td>
                    <td data-label={t('rem.col.created')}>{formatDateTime(item.createdAt, locale)}</td>
                    <td data-label={t('col.actions')}><Button small onClick={() => setSelectedId(item.id)} ariaLabel={`${t('pia.select')}: ${item.title}`}>{t('pia.select')}</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selected ? (
        <Panel title={selected.title} eyebrow={t('rem.detail.heading')} id="rem-detail">
          <RemediationDetail item={selected} />
        </Panel>
      ) : null}
      <RemediationDialog open={draft !== null} initial={draft ?? EMPTY_REMEDIATION} onClose={() => setDraft(null)} />
    </div>
  );
}
