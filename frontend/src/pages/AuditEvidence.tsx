import { useI18n } from '../i18n';
import { useWorkspace } from '../state/workspace';
import { Panel } from '../components/common/Panel';
import { Notice } from '../components/common/States';
import { ActivityTimeline } from '../components/audit/ActivityTimeline';
import { IntegrityCard } from '../components/audit/IntegrityCard';
import { shortId } from '../utils/format';

export function AuditEvidencePage() {
  const { t } = useI18n();
  const { activity, analyses, pias, remediations, isDemo } = useWorkspace();
  const references = [
    ...analyses.filter((item) => item.analysisId).map((item) => ({ type: t('audit.object.analysis'), id: item.analysisId ?? '' })),
    ...pias.map((item) => ({ type: t('audit.object.pia'), id: item.id })),
    ...remediations.map((item) => ({ type: t('audit.object.remediation'), id: item.id })),
  ];
  return (
    <div className="page">
      <p className="page-intro">{t('audit.intro')}</p>
      <Panel title={t('audit.integrity.title')} eyebrow={t('audit.integrity.eyebrow')} id="audit-integrity">
        <IntegrityCard />
      </Panel>
      <div className="grid-two">
        <Panel title={t('audit.timeline.title')} id="audit-timeline">
          <Notice tone="info" title={isDemo ? t('demo.tag') : t('audit.timeline.noticeTitle')}>
            {isDemo ? t('demo.banner') : t('audit.timeline.notice')}
          </Notice>
          <ActivityTimeline events={activity} />
        </Panel>
        <Panel title={t('audit.evidence.title')} id="audit-evidence">
          <p className="muted">{t('audit.evidence.body')}</p>
          {references.length === 0 ? (
            <p className="muted">{t('audit.evidence.empty')}</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">{t('audit.evidence.title')}</caption>
                <thead>
                  <tr><th scope="col">{t('audit.evidence.type')}</th><th scope="col">{t('audit.evidence.id')}</th></tr>
                </thead>
                <tbody>
                  {references.map((reference) => (
                    <tr key={`${reference.type}-${reference.id}`}>
                      <td>{reference.type}</td>
                      <td><code title={reference.id}>{shortId(reference.id)}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
