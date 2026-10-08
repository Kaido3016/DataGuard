import type { ReactNode } from 'react';
import { ROUTES } from '../../constants/routes';
import { hrefFor } from '../../hooks/useRoute';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
import { useAuth } from '../../state/auth';
import { useWorkspace } from '../../state/workspace';
import type { AnalysisRecord } from '../../types/analysis';
import type { Finding } from '../../types/pii';
import { confidenceBand, formatDateTime, formatPoints, shortId } from '../../utils/format';
import { Button, ButtonLink } from '../common/Button';
import { ConfidenceMeter, DemoTag, SeverityBadge, TypeChip } from '../common/Badges';
import { Dialog } from '../common/Dialog';
import { Notice } from '../common/States';
import { ControlList } from './ControlList';
import { PreviewSegments } from './RedactedPreviewView';
import { useSourceLabel } from './sourceLabel';
import type { RemediationDraft } from '../remediation/RemediationDialog';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="detail-section">
      <h3 className="detail-title">{title}</h3>
      {children}
    </section>
  );
}

export function FindingDialog({
  finding,
  record,
  onClose,
  onCreateRemediation,
}: {
  finding: Finding | null;
  record: AnalysisRecord | null;
  onClose: () => void;
  onCreateRemediation: (draft: RemediationDraft) => void;
}) {
  const { t, td, locale } = useI18n();
  const { can } = useAuth();
  const { remediations, isDemo } = useWorkspace();
  const sourceLabel = useSourceLabel();
  const open = finding !== null && record !== null;
  const canWrite = can('analysis:write') && !isDemo;

  let body: ReactNode = null;
  if (finding && record) {
    const topFactors = [...record.risk.factors].sort((a, b) => b.points - a.points).slice(0, 3);
    const related = remediations.filter((item) => item.findingId === finding.id || (finding.analysisId !== null && item.analysisId === finding.analysisId));
    const descriptionKey = `pii.desc.${finding.type}`;
    const description = td('pii.desc', finding.type);
    const band = confidenceBand(finding.confidence);
    body = (
      <div className="detail-grid">
        <Section title={t('finding.what')}>
          <p className="detail-lead">
            <TypeChip type={finding.type} /> <SeverityBadge level={finding.severity} />
            {finding.origin === 'demo' ? <> <DemoTag /></> : null}
          </p>
          <p>{description === finding.type && descriptionKey ? t('pii.desc.generic') : description}</p>
          {finding.context ? (
            <pre className="preview preview-small" aria-label={t('finding.context')}>
              <PreviewSegments segments={finding.context} />
            </pre>
          ) : (
            <p className="muted small">{t('finding.noContext')}</p>
          )}
          <p className="muted small">{t('finding.position', { start: finding.start, end: finding.end })} · {t('finding.valueRedacted')}</p>
        </Section>

        <Section title={t('finding.why')}>
          <p>{t('finding.whyBody', { type: td('pii.type', finding.type), detector: finding.detector })}</p>
          <p className="muted small">{t('finding.advisory')}</p>
        </Section>

        <Section title={t('finding.confidence')}>
          <ConfidenceMeter value={finding.confidence} />
          <p className="muted small">{t(`finding.confidence.${band}` as MessageKey)}</p>
        </Section>

        <Section title={t('finding.risk')}>
          <p>{t('finding.riskBody', { score: record.risk.score.toFixed(1), level: td('risk.level', record.risk.level) })}</p>
          {topFactors.length > 0 ? (
            <ul className="bullets small">
              {topFactors.map((factor) => (
                <li key={factor.name}>
                  {formatPoints(factor.points)} — <span lang="en">{factor.detail || factor.name}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="muted small">{t('finding.inherited')}</p>
        </Section>

        <Section title={t('finding.source')}>
          <dl className="kv">
            <dt>{t('finding.source.name')}</dt><dd>{sourceLabel(finding.source)}</dd>
            <dt>{t('finding.source.analysis')}</dt><dd>{finding.analysisId ? <code>{finding.analysisId}</code> : t('result.notPersistedShort')}</dd>
            <dt>{t('finding.source.detected')}</dt><dd>{finding.detectedAt ? formatDateTime(finding.detectedAt, locale) : t('finding.notProvided')}</dd>
            {finding.source.document ? (
              <>
                <dt>{t('finding.source.document')}</dt>
                <dd>{finding.source.document.documentType}{finding.source.document.pageCount !== null ? ` · ${t('finding.pages', { n: finding.source.document.pageCount })}` : ''}</dd>
              </>
            ) : null}
          </dl>
        </Section>

        <Section title={t('finding.controls')}>
          {record.governance ? <ControlList governance={record.governance} /> : <p className="muted">{t('finding.noControls')}</p>}
        </Section>

        <Section title={t('finding.remediation')}>
          {record.risk.recommendations.length > 0 ? (
            <ul className="reco-list">
              {record.risk.recommendations.map((recommendation) => (
                <li key={recommendation} className="reco">
                  <span lang="en">{recommendation}</span>
                  <Button small icon="plus" disabled={!canWrite} onClick={() => onCreateRemediation({
                    title: recommendation.slice(0, 255),
                    description: recommendation,
                    priority: finding.severity,
                    analysisId: finding.analysisId,
                    findingId: finding.id,
                  })}>
                    {t('result.createRemediation')}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('finding.noRecommendations')}</p>
          )}
          {related.length > 0 ? (
            <p className="small">
              {t('finding.relatedRemediation', { n: related.length })}{' '}
              <a href={hrefFor(ROUTES.remediation)}>{t('finding.viewRemediation')}</a>
            </p>
          ) : null}
        </Section>

        <Section title={t('finding.audit')}>
          <dl className="kv">
            <dt>{t('finding.audit.action')}</dt><dd><code>ANALYSIS_COMPLETED</code></dd>
            <dt>{t('finding.audit.object')}</dt><dd>{finding.analysisId ? <code>{shortId(finding.analysisId)}</code> : t('result.notPersistedShort')}</dd>
          </dl>
          {finding.analysisId ? (
            <p className="muted small">{t('finding.audit.note')}</p>
          ) : (
            <Notice tone="warning">{t('finding.audit.notPersisted')}</Notice>
          )}
          <ButtonLink href={hrefFor(ROUTES.audit)} icon="audit">{t('finding.audit.open')}</ButtonLink>
        </Section>
      </div>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('finding.title')} titleId="finding-dialog-title" wide>
      {body}
    </Dialog>
  );
}
