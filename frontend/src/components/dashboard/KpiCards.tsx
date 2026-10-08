import { useI18n } from '../../i18n';
import type { PiaRecord } from '../../types/pia';
import { formatPercent, padCount } from '../../utils/format';
import { piaCounts, piaInProgress } from '../../utils/selectors';
import type { KpiSummary } from '../../utils/selectors';
import { StatCard } from '../common/Panel';

export function KpiCards({ summary, pias }: { summary: KpiSummary; pias: readonly PiaRecord[] }) {
  const { t } = useI18n();
  const counts = piaCounts(pias);
  return (
    <div className="kpi-grid">
      <StatCard
        label={t('kpi.critical')}
        value={padCount(summary.critical)}
        caption={t('kpi.critical.caption', { high: summary.high })}
        tone={summary.critical > 0 ? 'danger' : 'neutral'}
      />
      <StatCard
        label={t('kpi.pii')}
        value={String(summary.findings)}
        caption={t('kpi.pii.caption', { n: summary.analyses })}
        tone="info"
      />
      <StatCard
        label={t('kpi.confidence')}
        value={summary.meanConfidence === null ? '—' : formatPercent(summary.meanConfidence)}
        caption={t('kpi.confidence.caption')}
      />
      <StatCard
        label={t('kpi.pia')}
        value={padCount(piaInProgress(counts))}
        caption={t('kpi.pia.caption', { total: pias.length })}
        tone="warning"
      />
    </div>
  );
}
