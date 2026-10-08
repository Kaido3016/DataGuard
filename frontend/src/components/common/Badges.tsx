import { useI18n } from '../../i18n';
import type { RiskLevel } from '../../types/risk';
import { confidenceBand, formatPercent } from '../../utils/format';

/** Shape per level so severity never depends on colour alone. */
const GLYPH: Record<RiskLevel, string> = {
  CRITICAL: 'M12 2l10 10-10 10L2 12z',
  HIGH: 'M12 3l10 18H2z',
  MEDIUM: 'M4 4h16v16H4z',
  LOW: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
};

export function SeverityGlyph({ level, size = 12 }: { level: RiskLevel; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={GLYPH[level]} />
    </svg>
  );
}

export function SeverityBadge({ level }: { level: RiskLevel }) {
  const { td } = useI18n();
  return (
    <span className={`badge sev sev-${level.toLowerCase()}`}>
      <SeverityGlyph level={level} />
      {td('risk.level', level)}
    </span>
  );
}

export function TypeChip({ type }: { type: string }) {
  const { td } = useI18n();
  return (
    <span className="chip" title={type}>
      {td('pii.type', type)}
    </span>
  );
}

export function DemoTag() {
  const { t } = useI18n();
  return <span className="badge badge-demo">{t('demo.tag')}</span>;
}

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export function StatusBadge({ tone = 'neutral', children }: { tone?: Tone; children: string }) {
  return <span className={`badge tone tone-${tone}`}>{children}</span>;
}

/** Numeric confidence plus a word for the band, with a decorative bar. */
export function ConfidenceMeter({ value }: { value: number }) {
  const { t } = useI18n();
  const band = confidenceBand(value);
  return (
    <span className="confidence">
      <span className="confidence-bar" aria-hidden="true">
        <span className={`confidence-fill band-${band}`} style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="confidence-text">
        {formatPercent(value)} <span className="muted">· {t(`confidence.${band}`)}</span>
      </span>
    </span>
  );
}
