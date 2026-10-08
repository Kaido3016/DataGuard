import { useEffect, useState } from 'react';
import { useAnalysisRunner } from '../hooks/useAnalysisRunner';
import type { RunInput } from '../hooks/useAnalysisRunner';
import { useI18n } from '../i18n';
import { useAuth } from '../state/auth';
import { useWorkspace } from '../state/workspace';
import { SeverityBadge } from '../components/common/Badges';
import { Button } from '../components/common/Button';
import { Panel } from '../components/common/Panel';
import { EmptyState, ErrorState, Skeleton } from '../components/common/States';
import { AnalysisForm } from '../components/pii/AnalysisForm';
import { AnalysisResult } from '../components/pii/AnalysisResult';
import { useSourceLabel } from '../components/pii/sourceLabel';
import { EMPTY_REMEDIATION, RemediationDialog } from '../components/remediation/RemediationDialog';
import type { RemediationDraft } from '../components/remediation/RemediationDialog';
import { formatTime, shortId } from '../utils/format';

export function DiscoveryPage() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const workspace = useWorkspace();
  const sourceLabel = useSourceLabel();
  const runner = useAnalysisRunner();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<RunInput | null>(null);
  const [draft, setDraft] = useState<RemediationDraft | null>(null);

  useEffect(() => {
    if (runner.state.status === 'success') setSelectedKey(runner.state.data.key);
  }, [runner.state]);

  const canAnalyze = can('analysis:write') && !workspace.isDemo;
  const disabledReason = workspace.isDemo ? t('demo.readonly') : !can('analysis:write') ? t('analysis.forbidden') : undefined;
  const selected = workspace.analyses.find((record) => record.key === selectedKey) ?? null;

  const run = (input: RunInput): void => {
    setLastInput(input);
    void runner.run(input);
  };

  return (
    <div className="page">
      <p className="page-intro">{t('discovery.intro')}</p>
      <div className="grid-discovery">
        <div className="stack">
          <Panel title={t('discovery.input')} id="disc-input">
            <AnalysisForm
              variant="full"
              busy={runner.state.status === 'loading'}
              disabled={!canAnalyze}
              disabledReason={disabledReason}
              onAnalyzeText={(text, context) => run({ kind: 'text', text, context })}
              onAnalyzeDocument={(file) => run({ kind: 'document', file })}
              onCancel={runner.cancel}
            />
          </Panel>
          {workspace.analyses.length > 0 ? (
            <Panel title={t('discovery.recent')} id="disc-recent">
              <ul className="recent-list">
                {workspace.analyses.slice(0, 6).map((record) => (
                  <li key={record.key}>
                    <button type="button" className={`recent-item${record.key === selectedKey ? ' is-active' : ''}`} onClick={() => setSelectedKey(record.key)} aria-pressed={record.key === selectedKey}>
                      <span className="recent-main">
                        <strong>{sourceLabel(record.source)}</strong>
                        <span className="muted small">
                          {record.createdAt ? formatTime(record.createdAt, locale) : record.analysisId ? shortId(record.analysisId) : ''} · {t('discovery.detections', { n: record.detections.length })}
                        </span>
                      </span>
                      <SeverityBadge level={record.risk.level} />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <div className="stack" aria-live="polite">
          {runner.state.status === 'loading' ? (
            <Panel title={t('discovery.analyzing')} id="disc-loading">
              <Skeleton lines={6} label={t('discovery.analyzing')} />
              <Button onClick={runner.cancel}>{t('action.cancel')}</Button>
            </Panel>
          ) : runner.state.status === 'error' ? (
            <Panel title={t('discovery.failed')} id="disc-error">
              <ErrorState error={runner.state.error} onRetry={lastInput ? () => void runner.run(lastInput) : undefined} />
            </Panel>
          ) : selected ? (
            <AnalysisResult record={selected} onCreateRemediation={setDraft} />
          ) : (
            <Panel id="disc-idle">
              <EmptyState icon="discovery" title={t('discovery.idle.title')}>{t('discovery.idle.body')}</EmptyState>
            </Panel>
          )}
        </div>
      </div>
      <RemediationDialog open={draft !== null} initial={draft ?? EMPTY_REMEDIATION} onClose={() => setDraft(null)} />
    </div>
  );
}
