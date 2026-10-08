import { useI18n } from '../../i18n';
import { useWorkspace } from '../../state/workspace';
import { Icon } from '../common/Icon';

/** Shown for as long as synthetic data is displayed, on every page. */
export function DemoBanner() {
  const { t } = useI18n();
  const { setDemoMode } = useWorkspace();
  return (
    <div className="demo-banner" role="status">
      <Icon name="alert" size={16} />
      <span>{t('demo.banner')}</span>
      <button type="button" className="btn btn-small btn-secondary" onClick={() => void setDemoMode(false)}>
        {t('demo.exit')}
      </button>
    </div>
  );
}
