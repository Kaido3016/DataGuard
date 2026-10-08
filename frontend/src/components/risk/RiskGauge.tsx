import { useI18n } from '../../i18n';
import { RISK_BANDS } from '../../types/risk';
import type { RiskLevel } from '../../types/risk';
import { arcPath } from '../../utils/gauge';
import { formatScore } from '../../utils/format';
import { SeverityGlyph } from '../common/Badges';

const C = 85;
const R = 68;
const GAP = 0.006;

/**
 * 270° gauge: four band segments show where the thresholds sit, the solid arc shows the score.
 * The score is also printed as a number and the level as a word with a shape, so nothing relies
 * on colour.
 */
export function RiskGauge({ score, level }: { score: number | null; level: RiskLevel | null }) {
  const { t, td } = useI18n();
  const label =
    score === null || level === null
      ? t('risk.gauge.none')
      : t('risk.gauge.label', { score: formatScore(score), level: td('risk.level', level) });
  return (
    <figure className="gauge">
      <svg viewBox="0 0 170 170" role="img" aria-label={label}>
        {RISK_BANDS.map((band) => (
          <path
            key={band.level}
            d={arcPath(C, C, R, band.min / 100 + GAP, band.max / 100 - GAP)}
            className={`gauge-band gauge-band-${band.level.toLowerCase()}`}
            fill="none"
            strokeWidth={14}
            strokeLinecap="butt"
          />
        ))}
        {score !== null && level !== null && score > 0 ? (
          <path
            d={arcPath(C, C, R, 0, score / 100)}
            className={`gauge-progress gauge-progress-${level.toLowerCase()}`}
            fill="none"
            strokeWidth={14}
            strokeLinecap="round"
          />
        ) : null}
        <text x={C} y={C + 6} textAnchor="middle" className="gauge-score">
          {score === null ? '—' : formatScore(score)}
        </text>
        <text x={C} y={C + 26} textAnchor="middle" className="gauge-scale">
          {t('risk.gauge.scale')}
        </text>
      </svg>
      <figcaption className="gauge-caption">
        {level ? (
          <span className={`gauge-level sev-text-${level.toLowerCase()}`}>
            <SeverityGlyph level={level} />
            {td('risk.level', level)}
          </span>
        ) : (
          <span className="muted">{t('risk.notAssessed')}</span>
        )}
      </figcaption>
    </figure>
  );
}
