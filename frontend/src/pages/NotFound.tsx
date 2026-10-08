import { ROUTES } from '../constants/routes';
import { hrefFor } from '../hooks/useRoute';
import { useI18n } from '../i18n';
import { ButtonLink } from '../components/common/Button';
import { EmptyState } from '../components/common/States';
import { Panel } from '../components/common/Panel';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="page">
      <Panel>
        <EmptyState icon="search" title={t('page.notFound.title')} action={<ButtonLink href={hrefFor(ROUTES.overview)} variant="primary">{t('page.notFound.cta')}</ButtonLink>}>
          {t('page.notFound.body')}
        </EmptyState>
      </Panel>
    </div>
  );
}
