import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ROUTES } from '../constants/routes';
import { hrefFor, navigate, useRoute } from '../hooks/useRoute';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useI18n } from '../i18n';
import { useWorkspace } from '../state/workspace';
import { RISK_LEVELS } from '../types/risk';
import type { RiskLevel } from '../types/risk';
import { formatDateTime } from '../utils/format';
import { distinct, EMPTY_FILTERS, filterFindings, paginate, sortFindings } from '../utils/selectors';
import type { FindingFilters, FindingSortKey, SortDirection } from '../utils/selectors';
import { ConfidenceMeter, DemoTag, SeverityBadge, TypeChip } from '../components/common/Badges';
import { Button, ButtonLink } from '../components/common/Button';
import { SelectField, TextField } from '../components/common/Fields';
import { Icon } from '../components/common/Icon';
import { Panel } from '../components/common/Panel';
import { EmptyState, ErrorState, Notice } from '../components/common/States';
import { FindingDialog } from '../components/pii/FindingDialog';
import { PreviewSegments } from '../components/pii/RedactedPreviewView';
import { useSourceLabel } from '../components/pii/sourceLabel';
import { EMPTY_REMEDIATION, RemediationDialog } from '../components/remediation/RemediationDialog';
import type { RemediationDraft } from '../components/remediation/RemediationDialog';

const PAGE_SIZE = 10;

function SortHeader({
  keyName,
  label,
  sortKey,
  direction,
  onSort,
}: {
  keyName: FindingSortKey;
  label: string;
  sortKey: FindingSortKey;
  direction: SortDirection;
  onSort: (key: FindingSortKey) => void;
}) {
  return (
    <th scope="col" aria-sort={sortKey === keyName ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="sort-btn" onClick={() => onSort(keyName)}>
        {label}
        {sortKey === keyName ? <Icon name={direction === 'asc' ? 'arrowUp' : 'arrowDown'} size={14} /> : null}
      </button>
    </th>
  );
}

export function PIIFindingsPage() {
  const { t, td, locale } = useI18n();
  const { findings, analyses, isDemo, loadAnalysisById } = useWorkspace();
  const sourceLabel = useSourceLabel();
  const { query } = useRoute();
  const [filters, setFilters] = useState<FindingFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<FindingSortKey>('severity');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<RemediationDraft | null>(null);
  const [lookupId, setLookupId] = useState('');
  const lookup = useAsyncAction((signal, id: string) => loadAnalysisById(id, signal));

  const selectedId = query.get('finding');
  const selected = selectedId ? (findings.find((item) => item.id === selectedId) ?? null) : null;
  const selectedRecord = selected ? (analyses.find((record) => record.key === selected.analysisKey) ?? null) : null;

  const filtered = useMemo(() => filterFindings(findings, filters, (type) => td('pii.type', type)), [findings, filters, td]);
  const sorted = useMemo(() => sortFindings(filtered, sortKey, direction), [filtered, sortKey, direction]);
  const current = paginate(sorted, page, PAGE_SIZE);
  const types = useMemo(() => distinct(findings.map((item) => item.type)), [findings]);
  const detectors = useMemo(() => distinct(findings.map((item) => item.detector)), [findings]);

  const update = (next: Partial<FindingFilters>): void => {
    setFilters((previous) => ({ ...previous, ...next }));
    setPage(1);
  };
  const sortBy = (key: FindingSortKey): void => {
    if (key === sortKey) setDirection((value) => (value === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setDirection(key === 'type' ? 'asc' : 'desc');
    }
  };
  const filtersActive = filters.search !== '' || filters.severity !== 'ALL' || filters.type !== 'ALL' || filters.detector !== 'ALL';

  return (
    <div className="page">
      <p className="page-intro">{t('findings.intro')}</p>
      <Notice tone="info">{isDemo ? t('demo.banner') : t('findings.scope')}</Notice>

      <Panel title={t('findings.load.title')} id="find-load">
        <form className="inline-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (lookupId.trim()) void lookup.run(lookupId); }}>
          <TextField id="lookup-id" label={t('findings.load.label')} value={lookupId} onChange={setLookupId} hint={t('findings.load.hint')} disabled={isDemo} />
          <Button type="submit" icon="search" busy={lookup.state.status === 'loading'} disabled={isDemo || !lookupId.trim()}>{t('findings.load.submit')}</Button>
        </form>
        {lookup.state.status === 'error' ? <ErrorState error={lookup.state.error} /> : null}
        {lookup.state.status === 'success' ? <Notice tone="success" live>{t('findings.load.done', { n: lookup.state.data.detections.length })}</Notice> : null}
      </Panel>

      {findings.length === 0 ? (
        <Panel id="find-empty">
          <EmptyState icon="findings" title={t('findings.empty.title')} action={<ButtonLink href={hrefFor(ROUTES.discovery)} variant="primary" icon="discovery">{t('findings.empty.cta')}</ButtonLink>}>
            {t('findings.empty.body')}
          </EmptyState>
        </Panel>
      ) : (
        <Panel title={t('findings.table')} id="find-table">
          <form className="filter-bar" role="search" aria-label={t('findings.filters')} onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
            <TextField id="f-search" label={t('findings.search')} type="text" value={filters.search} onChange={(value) => update({ search: value })} placeholder={t('findings.search.placeholder')} />
            <SelectField id="f-sev" label={t('col.risk')} value={filters.severity} onChange={(value) => update({ severity: value as RiskLevel | 'ALL' })}
              options={[{ value: 'ALL', label: t('filter.all') }, ...RISK_LEVELS.map((level) => ({ value: level, label: td('risk.level', level) }))]} />
            <SelectField id="f-type" label={t('col.type')} value={filters.type} onChange={(value) => update({ type: value })}
              options={[{ value: 'ALL', label: t('filter.all') }, ...types.map((type) => ({ value: type, label: td('pii.type', type) }))]} />
            <SelectField id="f-det" label={t('col.detector')} value={filters.detector} onChange={(value) => update({ detector: value })}
              options={[{ value: 'ALL', label: t('filter.all') }, ...detectors.map((item) => ({ value: item, label: item }))]} />
            <Button icon="filter" disabled={!filtersActive} onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>{t('filter.reset')}</Button>
          </form>

          <p className="result-count" role="status">{t('findings.count', { shown: sorted.length, total: findings.length })}</p>

          {sorted.length === 0 ? (
            <EmptyState icon="search" title={t('findings.noMatch.title')}>{t('findings.noMatch.body')}</EmptyState>
          ) : (
            <>
              <div className="table-wrap">
                <table className="table table-stack table-findings">
                  <caption className="sr-only">{t('findings.table')}</caption>
                  <thead>
                    <tr>
                      <SortHeader keyName="type" label={t('col.finding')} sortKey={sortKey} direction={direction} onSort={sortBy} />
                      <SortHeader keyName="confidence" label={t('col.confidence')} sortKey={sortKey} direction={direction} onSort={sortBy} />
                      <SortHeader keyName="severity" label={t('col.risk')} sortKey={sortKey} direction={direction} onSort={sortBy} />
                      <th scope="col">{t('col.source')}</th>
                      <th scope="col">{t('col.persistence')}</th>
                      <SortHeader keyName="detectedAt" label={t('col.detected')} sortKey={sortKey} direction={direction} onSort={sortBy} />
                      <th scope="col"><span className="sr-only">{t('col.actions')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.items.map((finding) => (
                      <tr key={finding.id}>
                        <td data-label={t('col.finding')}>
                          <TypeChip type={finding.type} />
                          {finding.context ? <span className="ctx"><PreviewSegments segments={finding.context} /></span> : null}
                        </td>
                        <td data-label={t('col.confidence')}><ConfidenceMeter value={finding.confidence} /></td>
                        <td data-label={t('col.risk')}><SeverityBadge level={finding.severity} /></td>
                        <td data-label={t('col.source')}>{sourceLabel(finding.source)} {finding.origin === 'demo' ? <DemoTag /> : null}</td>
                        <td data-label={t('col.persistence')}>{finding.persisted ? t('persist.yes') : t('persist.no')}</td>
                        <td data-label={t('col.detected')}>{formatDateTime(finding.detectedAt, locale)}</td>
                        <td data-label={t('col.actions')}>
                          <Button small icon="chevronRight" onClick={() => navigate(ROUTES.findings, { finding: finding.id })}>{t('findings.view')}</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <nav className="pager" aria-label={t('pager.label')}>
                <Button small icon="chevronLeft" disabled={current.page <= 1} onClick={() => setPage(current.page - 1)}>{t('pager.prev')}</Button>
                <span className="pager-status">{t('pager.status', { page: current.page, pages: current.pageCount })}</span>
                <Button small icon="chevronRight" disabled={current.page >= current.pageCount} onClick={() => setPage(current.page + 1)}>{t('pager.next')}</Button>
              </nav>
            </>
          )}
        </Panel>
      )}

      <FindingDialog finding={selected} record={selectedRecord} onClose={() => { if (query.get('finding')) navigate(ROUTES.findings); }} onCreateRemediation={setDraft} />
      <RemediationDialog open={draft !== null} initial={draft ?? EMPTY_REMEDIATION} onClose={() => setDraft(null)} />
    </div>
  );
}
