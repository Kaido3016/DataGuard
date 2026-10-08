import { ROUTES } from '../../constants/routes';
import { hrefFor } from '../../hooks/useRoute';
import { useI18n } from '../../i18n';
import { useAuth } from '../../state/auth';
import { useWorkspace } from '../../state/workspace';
import type { AnalysisRecord } from '../../types/analysis';
import { shortId } from '../../utils/format';
import { Button, ButtonLink } from '../common/Button';
import { Notice } from '../common/States';
import { Panel } from '../common/Panel';
import { RiskOverview } from '../risk/RiskOverview';
import type { RemediationDraft } from '../remediation/RemediationDialog';
import { ControlList } from './ControlList';
import { DetectionTable } from './DetectionTable';
import { RedactedPreviewView } from './RedactedPreviewView';
import { useSourceLabel } from './sourceLabel';
import { TypeChip } from '../common/Badges';

function typeCounts(record: AnalysisRecord): [string, number][] {
  const counts = new Map<string, number>();
  for (const detection of record.detections) counts.set(detection.type, (counts.get(detection.type) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function AnalysisResult({
  record,
  onCreateRemediation,
}: {
  record: AnalysisRecord;
  onCreateRemediation: (draft: RemediationDraft) => void;
}) {
  const { t } = useI18n();
  const { can } = useAuth();
  const { isDemo } = useWorkspace();
  const sourceLabel = useSourceLabel();
  const canWrite = can('analysis:write') && !isDemo;

  return (
    <div className="result-stack" aria-live="polite">
      <Panel title={t('result.heading')} id="result-summary" actions={
        <ButtonLink href={hrefFor(ROUTES.findings)} icon="findings">{t('result.openFindings')}</ButtonLink>
      }>
        <p className="result-meta">
          <strong>{sourceLabel(record.source)}</strong>
          {' · '}
          {record.analysisId ? t('result.persisted', { id: shortId(record.analysisId) }) : t('result.notPersisted')}
        </p>
        {record.partial ? (
          <Notice tone="warning" title={t('result.partial.title')}>
            <p>{t('result.partial.body')}</p>
            <ul className="bullets" lang="en">
              {record.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </Notice>
        ) : null}
        {record.detections.length === 0 ? (
          <Notice tone="info" title={t('result.empty.title')}>{t('result.empty.body')}</Notice>
        ) : (
          <>
            <p className="chip-row" aria-label={t('result.types')}>
              {typeCounts(record).map(([type, count]) => (
                <span key={type} className="chip-count">
                  <TypeChip type={type} />
                  <span className="num">×{count}</span>
                </span>
              ))}
            </p>
            {record.preview ? <RedactedPreviewView preview={record.preview} /> : null}
            <DetectionTable detections={record.detections} />
          </>
        )}
      </Panel>

      <Panel title={t('risk.heading')} id="result-risk">
        <RiskOverview record={record} />
      </Panel>

      {record.risk.recommendations.length > 0 ? (
        <Panel title={t('result.recommendations')} id="result-reco">
          <ul className="reco-list">
            {record.risk.recommendations.map((recommendation) => (
              <li key={recommendation} className="reco">
                <span lang="en">{recommendation}</span>
                <Button
                  small
                  icon="plus"
                  disabled={!canWrite}
                  title={canWrite ? undefined : t('rem.form.forbidden')}
                  onClick={() =>
                    onCreateRemediation({
                      title: recommendation.slice(0, 255),
                      description: recommendation,
                      priority: record.risk.level,
                      analysisId: record.analysisId,
                      findingId: null,
                    })
                  }
                >
                  {t('result.createRemediation')}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {record.governance ? (
        <Panel title={t('compliance.heading')} id="result-controls">
          <ControlList governance={record.governance} />
        </Panel>
      ) : null}
    </div>
  );
}
