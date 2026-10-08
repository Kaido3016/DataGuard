import { ROUTES } from '../../constants/routes';
import type { RoutePath } from '../../constants/routes';
import { hrefFor } from '../../hooks/useRoute';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
import { useWorkspace } from '../../state/workspace';
import { RISK_RANK } from '../../types/risk';
import type { RiskLevel } from '../../types/risk';
import { countControls, latestGovernanceByFramework, piaCounts, piaInProgress, summarize, topRiskRecord } from '../../utils/selectors';

interface Stage {
  readonly id: string;
  readonly label: MessageKey;
  readonly value: string;
  readonly caption: string;
  readonly route: RoutePath;
}

/**
 * The product story as a live track: Discovery → Risk → Compliance → PIA → Remediation → Audit.
 * Each stage reports what this session actually holds and links to its page.
 */
export function WorkflowStrip() {
  const { t, td } = useI18n();
  const { analyses, pias, remediations, activity } = useWorkspace();
  const summary = summarize(analyses);
  const top = topRiskRecord(analyses);
  const governance = [...latestGovernanceByFramework(analyses).values()];
  const attention = governance.reduce((sum, item) => {
    const counts = countControls(item);
    return sum + counts.review + counts.remediation;
  }, 0);
  const progress = piaInProgress(piaCounts(pias));
  let highest: RiskLevel | null = null;
  for (const item of remediations) {
    if (highest === null || RISK_RANK[item.priority] > RISK_RANK[highest]) highest = item.priority;
  }

  const stages: Stage[] = [
    { id: 'discovery', label: 'flow.discovery', value: String(summary.findings), caption: t('flow.discovery.caption', { n: summary.analyses }), route: ROUTES.discovery },
    { id: 'risk', label: 'flow.risk', value: top ? td('risk.level', top.risk.level) : '—', caption: top ? t('flow.risk.caption', { score: top.risk.score.toFixed(0) }) : t('flow.risk.none'), route: ROUTES.findings },
    { id: 'compliance', label: 'flow.compliance', value: governance.length === 0 ? '—' : String(attention), caption: governance.length === 0 ? t('flow.compliance.none') : t('flow.compliance.caption', { n: governance.length }), route: ROUTES.overview },
    { id: 'pia', label: 'flow.pia', value: String(progress), caption: t('flow.pia.caption', { total: pias.length }), route: ROUTES.pia },
    { id: 'remediation', label: 'flow.remediation', value: String(remediations.length), caption: highest ? t('flow.remediation.caption', { level: td('risk.level', highest) }) : t('flow.remediation.none'), route: ROUTES.remediation },
    { id: 'audit', label: 'flow.audit', value: String(activity.length), caption: t('flow.audit.caption'), route: ROUTES.audit },
  ];

  return (
    <nav className="flow" aria-label={t('flow.label')}>
      <ol className="flow-list">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flow-stage">
            <a className="flow-link" href={hrefFor(stage.route)}>
              <span className="flow-index" aria-hidden="true">{index + 1}</span>
              <span className="flow-name">{t(stage.label)}</span>
              <span className="flow-value">{stage.value}</span>
              <span className="flow-caption">{stage.caption}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
