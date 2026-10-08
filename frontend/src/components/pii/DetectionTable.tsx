import { useI18n } from '../../i18n';
import type { Detection } from '../../types/pii';
import { ConfidenceMeter, TypeChip } from '../common/Badges';

export function DetectionTable({ detections }: { detections: readonly Detection[] }) {
  const { t } = useI18n();
  return (
    <div className="table-wrap">
      <table className="table table-stack">
        <caption className="sr-only">{t('detections.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('col.type')}</th>
            <th scope="col">{t('col.confidence')}</th>
            <th scope="col">{t('col.detector')}</th>
            <th scope="col">{t('col.position')}</th>
          </tr>
        </thead>
        <tbody>
          {detections.map((detection, index) => (
            <tr key={`${detection.type}-${detection.start}-${index}`}>
              <td data-label={t('col.type')}>
                <TypeChip type={detection.type} />
              </td>
              <td data-label={t('col.confidence')}>
                <ConfidenceMeter value={detection.confidence} />
              </td>
              <td data-label={t('col.detector')}>{detection.detector}</td>
              <td data-label={t('col.position')} className="num">
                {detection.start}–{detection.end}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
