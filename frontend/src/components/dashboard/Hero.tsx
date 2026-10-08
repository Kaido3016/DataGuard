import { useI18n } from '../../i18n';
import type { AnalysisRecord } from '../../types/analysis';
import { formatScore } from '../../utils/format';
import { SeverityGlyph } from '../common/Badges';

export function Hero({ top }: { top: AnalysisRecord | null }) {
  const { t, td } = useI18n();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow eyebrow-dark">{t('dashboard.eyebrow')}</p>
        <h2 id="hero-title" className="hero-title">{t('dashboard.headline')}</h2>
        <p className="hero-sub">{t('dashboard.subtitle')}</p>
      </div>
      <div className="hero-score">
        <p className="hero-score-label">{t('hero.score.label')}</p>
        <p className="hero-score-value" aria-label={top ? t('risk.gauge.label', { score: formatScore(top.risk.score), level: td('risk.level', top.risk.level) }) : t('risk.notAssessed')}>
          {top ? formatScore(top.risk.score) : '—'}
          <span className="hero-score-max">{top ? ' / 100' : ''}</span>
        </p>
        {top ? (
          <p className={`hero-score-level on-dark-${top.risk.level.toLowerCase()}`}>
            <SeverityGlyph level={top.risk.level} />
            {td('risk.level', top.risk.level)}
          </p>
        ) : (
          <p className="hero-score-level">{t('risk.notAssessed')}</p>
        )}
        <p className="hero-score-note">{t('hero.score.note')}</p>
      </div>
    </section>
  );
}
