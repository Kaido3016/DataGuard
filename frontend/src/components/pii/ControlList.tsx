import { useI18n } from '../../i18n';
import type { Governance } from '../../types/analysis';
import { StatusBadge } from '../common/Badges';
import type { Tone } from '../common/Badges';

const TONE: Record<string, Tone> = {
  PASS: 'success',
  REQUIRES_REVIEW: 'warning',
  REQUIRES_REMEDIATION: 'danger',
};

/** Compliance controls evaluated by the backend for the selected framework. */
export function ControlList({ governance }: { governance: Governance }) {
  const { t, td } = useI18n();
  return (
    <div className="controls">
      <p className="muted small">
        {t('compliance.framework', { name: td('framework.name', governance.framework) })} · {t('compliance.disclaimer')}
      </p>
      {governance.findings.length === 0 ? (
        <p className="muted">{t('compliance.none')}</p>
      ) : (
        <ul className="control-list">
          {governance.findings.map((finding) => (
            <li key={finding.ruleId} className="control">
              <div className="control-head">
                <code className="control-id">{finding.ruleId}</code>
                <StatusBadge tone={TONE[finding.status] ?? 'neutral'}>{td('compliance.status', finding.status)}</StatusBadge>
                <span className="muted small">
                  {t('compliance.severity')}: {td('compliance.severityValue', finding.severity)}
                  {finding.ruleVersion ? ` · v${finding.ruleVersion}` : ''}
                </span>
              </div>
              <p className="control-reason" lang="en">{finding.reason}</p>
              {finding.requiredEvidence.length > 0 ? (
                <p className="small">
                  <span className="muted">{t('compliance.evidence')}: </span>
                  {finding.requiredEvidence.map((item) => (
                    <code key={item} className="evidence-tag">{item}</code>
                  ))}
                </p>
              ) : null}
              {finding.remediation.length > 0 ? (
                <ul className="bullets small" lang="en">
                  {finding.remediation.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
