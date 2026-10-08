import { useI18n } from '../../i18n';
import { FRAMEWORK_IDS } from '../../types/analysis';
import type { AnalysisRecord } from '../../types/analysis';
import { countControls, latestGovernanceByFramework } from '../../utils/selectors';

/**
 * Framework coverage as structured rows. A framework only shows control counts when the backend
 * actually evaluated it in an analysis; otherwise it is marked "not assessed" rather than implied.
 */
export function ComplianceMapping({ analyses }: { analyses: readonly AnalysisRecord[] }) {
  const { t, td } = useI18n();
  const latest = latestGovernanceByFramework(analyses);
  return (
    <div>
      <ul className="framework-list">
        {FRAMEWORK_IDS.map((id) => {
          const governance = latest.get(id);
          const counts = governance ? countControls(governance) : null;
          return (
            <li key={id} className="framework">
              <div>
                <p className="framework-name">{td('framework.name', id)}</p>
                <p className="framework-scope">{td('framework.scope', id)}</p>
              </div>
              <p className="framework-status">
                {counts === null
                  ? t('compliance.notAssessed')
                  : t('compliance.counts', { total: counts.total, attention: counts.review + counts.remediation })}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="muted small">{t('compliance.disclaimer')}</p>
    </div>
  );
}
