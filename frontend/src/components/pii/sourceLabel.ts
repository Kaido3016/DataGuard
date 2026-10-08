import { useI18n } from '../../i18n';
import type { SourceRef } from '../../types/pii';

/** Display name of an analysis source in the current language. */
export function useSourceLabel(): (source: SourceRef) => string {
  const { t } = useI18n();
  return (source) => {
    if (source.kind === 'document') return source.document?.filename ?? source.label;
    return source.label || t('source.text');
  };
}
