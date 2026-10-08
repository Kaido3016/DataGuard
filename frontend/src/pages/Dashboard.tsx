import { useState } from 'react';
import { useAnalysisRunner } from '../hooks/useAnalysisRunner';
import { useI18n } from '../i18n';
import { useAuth } from '../state/auth';
import { useWorkspace } from '../state/workspace';
import { ROUTES } from '../constants/routes';
import { hrefFor } from '../hooks/useRoute';
import { ComplianceMapping } from '../components/dashboard/ComplianceMapping';
import { Hero } from '../components/dashboard/Hero';
import { KpiCards } from '../components/dashboard/KpiCards';
import { RecentDetections } from '../components/dashboard/RecentDetections';
import { WorkflowStrip } from '../components/dashboard/WorkflowStrip';
import { SeverityBadge } from '../components/common/Badges';
import { Panel } from '../components/common/Panel';
import { ErrorState, Notice, Skeleton } from '../components/common/States';
import { AnalysisForm } from '../components/pii/AnalysisForm';
import { RiskOverview } from '../components/risk/RiskOverview';
import type { AnalysisContext } from '../types/analysis';
import { summarize, topRiskRecord } from '../utils/selectors';

export function DashboardPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const workspace = useWorkspace();
  const runner = useAnalysisRunner();
  const [lastInput, setLastInput] = useState<{ text: string; context: AnalysisContext } | null>(null);

  const summary = summarize(workspace.analyses);
  const top = topRiskRecord(workspace.analyses);
  const canAnalyze = can('analysis:write') && !workspace.isDemo;
  const disabledReason = workspace.isDemo ? t('demo.readonly') : !can('analysis:write') ? t('analysis.forbidden') : undefined;

  return (
    <div className="page">
      <Hero top={top} />
      <WorkflowStrip />
      <KpiCards summary={summary} pias={workspace.pias} />
      {workspace.rehydration === 'loading' ? <Skeleton lines={1} label={t('workspace.reloading')} /> : null}
      {workspace.rehydration === 'partial' ? <Notice tone="warning">{t('workspace.reloadPartial')}</Notice> : null}
      {!workspace.isDemo ? <p className="scope-note">{t('kpi.scope')}</p> : null}

      <div className="grid-two">
        <div className="stack">
          <Panel title={t('dashboard.analyze')} eyebrow={t('dashboard.analyze.eyebrow')} id="dash-analyze" actions={<span className="badge tone tone-info">{t('dashboard.analyze.badge')}</span>}>
            <AnalysisForm
              variant="compact"
              busy={runner.state.status === 'loading'}
              disabled={!canAnalyze}
              disabledReason={disabledReason}
              onAnalyzeText={(text, context) => {
                setLastInput({ text, context });
                void runner.run({ kind: 'text', text, context });
              }}
              onAnalyzeDocument={(file) => void runner.run({ kind: 'document', file })}
              onCancel={runner.cancel}
            />
            {runner.state.status === 'error' ? (
              <ErrorState error={runner.state.error} onRetry={lastInput ? () => void runner.run({ kind: 'text', ...lastInput }) : undefined} />
            ) : null}
            {runner.state.status === 'success' ? (
              <Notice tone="success" live title={t('dashboard.analysis.done')}>
                {t('dashboard.analysis.summary', { n: runner.state.data.detections.length })}{' '}
                <SeverityBadge level={runner.state.data.risk.level} />{' '}
                <a href={hrefFor(ROUTES.discovery)}>{t('dashboard.analysis.more')}</a>
              </Notice>
            ) : null}
          </Panel>
          <Panel title={t('dashboard.recent')} id="dash-recent">
            <RecentDetections findings={workspace.findings.slice(0, 5)} />
          </Panel>
        </div>
        <div className="stack">
          <Panel title={t('risk.heading')} eyebrow={t('risk.eyebrow')} id="dash-risk" actions={top ? <SeverityBadge level={top.risk.level} /> : undefined}>
            <RiskOverview record={top} />
          </Panel>
          <Panel title={t('compliance.heading')} eyebrow={t('compliance.eyebrow')} id="dash-compliance">
            <ComplianceMapping analyses={workspace.analyses} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
