import { ROUTES } from '../../constants/routes';
import { hrefFor } from '../../hooks/useRoute';
import { useI18n } from '../../i18n';
import type { Finding } from '../../types/pii';
import { ConfidenceMeter, SeverityBadge, TypeChip } from '../common/Badges';
import { EmptyState } from '../common/States';
import { ButtonLink } from '../common/Button';

export function RecentDetections({ findings }: { findings: readonly Finding[] }) {
  const { t } = useI18n();
  if (findings.length === 0) {
    return (
      <EmptyState icon="findings" title={t('findings.empty.title')}>
        {t('findings.empty.body')}
      </EmptyState>
    );
  }
  return (
    <div>
      <div className="table-wrap">
        <table className="table table-stack">
          <caption className="sr-only">{t('dashboard.recent')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('col.type')}</th>
              <th scope="col">{t('col.confidence')}</th>
              <th scope="col">{t('col.detector')}</th>
              <th scope="col">{t('col.risk')}</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((finding) => (
              <tr key={finding.id}>
                <td data-label={t('col.type')}><TypeChip type={finding.type} /></td>
                <td data-label={t('col.confidence')}><ConfidenceMeter value={finding.confidence} /></td>
                <td data-label={t('col.detector')}>{finding.detector}</td>
                <td data-label={t('col.risk')}><SeverityBadge level={finding.severity} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="panel-footer"><ButtonLink href={hrefFor(ROUTES.findings)} icon="findings">{t('dashboard.allFindings')}</ButtonLink></p>
    </div>
  );
}
