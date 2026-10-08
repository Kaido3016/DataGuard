import { useState } from 'react';
import { useI18n } from '../i18n';
import { useAuth } from '../state/auth';
import { useWorkspace } from '../state/workspace';
import { PIA_STATUSES } from '../types/pia';
import { formatDateTime, shortId } from '../utils/format';
import { piaCounts } from '../utils/selectors';
import { DemoTag, SeverityBadge, StatusBadge } from '../components/common/Badges';
import { Button } from '../components/common/Button';
import { Panel, StatCard } from '../components/common/Panel';
import { EmptyState, Notice } from '../components/common/States';
import { highestRisk, openIssues, PIA_TONE, PiaDetail } from '../components/pia/PiaDetail';
import { PiaWizard } from '../components/pia/PiaWizard';

export function PIAPage() {
  const { t, td, locale } = useI18n();
  const { can } = useAuth();
  const { pias, isDemo } = useWorkspace();
  const [mode, setMode] = useState<'list' | 'wizard'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const counts = piaCounts(pias);
  const selected = pias.find((item) => item.id === selectedId) ?? pias[0] ?? null;
  const canManage = can('pia:manage') && !isDemo;

  return (
    <div className="page">
      <p className="page-intro">{t('pia.intro')}</p>
      <Notice tone="info">{isDemo ? t('demo.banner') : t('pia.scope')}</Notice>

      <div className="kpi-grid kpi-grid-5">
        {PIA_STATUSES.map((status) => (
          <StatCard key={status} label={td('pia.status', status)} value={String(counts[status])} caption={t('pia.count.caption')} />
        ))}
      </div>

      {mode === 'wizard' ? (
        <Panel title={t('pia.wizard.title')} id="pia-wizard">
          <PiaWizard onCancel={() => setMode('list')} onOpen={(record) => { setSelectedId(record.id); setMode('list'); }} />
        </Panel>
      ) : (
        <>
          <Panel title={t('pia.list')} id="pia-list" actions={
            <Button variant="primary" icon="plus" onClick={() => setMode('wizard')} disabled={!canManage} title={canManage ? undefined : t('pia.forbidden')}>{t('pia.new')}</Button>
          }>
            {!can('pia:manage') && !isDemo ? <Notice tone="warning">{t('pia.forbidden')}</Notice> : null}
            {pias.length === 0 ? (
              <EmptyState icon="pia" title={t('pia.empty.title')}>{t('pia.empty.body')}</EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="table table-stack">
                  <caption className="sr-only">{t('pia.list')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('pia.col.project')}</th>
                      <th scope="col">{t('pia.status')}</th>
                      <th scope="col">{t('pia.riskLevel')}</th>
                      <th scope="col">{t('pia.openIssues')}</th>
                      <th scope="col">{t('pia.col.updated')}</th>
                      <th scope="col"><span className="sr-only">{t('col.actions')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pias.map((item) => {
                      const risk = highestRisk(item);
                      return (
                        <tr key={item.id} className={item.id === selected?.id ? 'is-selected' : undefined}>
                          <td data-label={t('pia.col.project')}><strong>{item.projectName}</strong> {item.origin === 'demo' ? <DemoTag /> : <span className="muted small">{shortId(item.id)}</span>}</td>
                          <td data-label={t('pia.status')}><StatusBadge tone={PIA_TONE[item.status]}>{td('pia.status', item.status)}</StatusBadge></td>
                          <td data-label={t('pia.riskLevel')}>{risk ? <SeverityBadge level={risk} /> : '—'}</td>
                          <td data-label={t('pia.openIssues')}>{openIssues(item)}</td>
                          <td data-label={t('pia.col.updated')}>{formatDateTime(item.updatedAt, locale)}</td>
                          <td data-label={t('col.actions')}>
                            <Button small onClick={() => setSelectedId(item.id)} ariaLabel={`${t('pia.select')}: ${item.projectName}`}>{t('pia.select')}</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
          {selected ? (
            <Panel title={selected.projectName} eyebrow={t('pia.evaluation')} id="pia-detail">
              <PiaDetail key={selected.id} record={selected} />
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}
