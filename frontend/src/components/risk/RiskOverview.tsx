import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
import type { AnalysisRecord } from '../../types/analysis';
import { formatPoints, shortId } from '../../utils/format';
import { groupRiskFactors, totalPoints } from '../../utils/risk';
import { Icon } from '../common/Icon';
import { EmptyState } from '../common/States';
import { useSourceLabel } from '../pii/sourceLabel';
import { RiskGauge } from './RiskGauge';

/**
 * Explains the score: every point the engine added is listed under the category it belongs to,
 * with the engine's own detail text. Categories that added nothing are shown as +0.0.
 */
export function RiskOverview({ record }: { record: AnalysisRecord | null }) {
  const { t } = useI18n();
  const sourceLabel = useSourceLabel();
  if (!record) {
    return (
      <div className="risk-overview">
        <RiskGauge score={null} level={null} />
        <EmptyState icon="shield" title={t('risk.empty.title')}>
          {t('risk.empty.body')}
        </EmptyState>
      </div>
    );
  }
  const { risk } = record;
  const groups = groupRiskFactors(risk.factors);
  const total = totalPoints(risk.factors);
  const capped = total > risk.score + 0.5;
  const organization = record.organizationId;
  return (
    <div className="risk-overview">
      <div className="risk-overview-gauge">
        <RiskGauge score={risk.score} level={risk.level} />
        <p className="risk-basis">
          {t('risk.basis', { source: sourceLabel(record.source), count: record.detections.length })}
        </p>
      </div>
      <div className="risk-overview-ledger">
        <h3 className="ledger-title">{t('risk.why')}</h3>
        <ul className="ledger" aria-label={t('risk.why')}>
          {groups.map((group) => {
            const share = total > 0 ? (group.points / total) * 100 : 0;
            const labelKey = `risk.factor.${group.id}.label` as MessageKey;
            const descKey = `risk.factor.${group.id}.desc` as MessageKey;
            return (
              <li key={group.id} className={`ledger-row${group.points === 0 ? ' is-zero' : ''}`}>
                <div className="ledger-head">
                  <span className="ledger-name">{t(labelKey)}</span>
                  <span className="ledger-points">{formatPoints(group.points)}</span>
                </div>
                <span className="ledger-bar" aria-hidden="true">
                  <span className="ledger-fill" style={{ width: `${share}%` }} />
                </span>
                <p className="ledger-desc">{t(descKey)}</p>
                {group.factors.length > 0 ? (
                  <p className="ledger-detail">{group.factors.map((factor) => factor.detail).filter(Boolean).join(' · ')}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {capped ? <p className="ledger-note">{t('risk.capped', { total: total.toFixed(1), score: risk.score.toFixed(1) })}</p> : null}
        <p className="ledger-tenant">
          <Icon name="lock" size={14} />
          {organization ? t('risk.tenant', { org: shortId(organization) }) : t('risk.tenant.unknown')}
        </p>
        {risk.explanation ? (
          <p className="ledger-engine" lang="en">
            {risk.explanation}
          </p>
        ) : null}
      </div>
    </div>
  );
}
