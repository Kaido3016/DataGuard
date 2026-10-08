import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import type { RoutePath } from '../../constants/routes';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n';
import { useWorkspace } from '../../state/workspace';
import { DemoBanner } from './DemoBanner';
import { NAV_ITEMS } from './nav';
import { Sidebar } from './Sidebar';
import { SessionBanner, TopBar } from './TopBar';

export function AppShell({ route, children }: { route: RoutePath | null; children: ReactNode }) {
  const { t } = useI18n();
  const { isDemo } = useWorkspace();
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const titleKey: MessageKey = NAV_ITEMS.find((item) => item.path === route)?.label ?? 'page.notFound.title';
  const title = t(titleKey);

  const closeNav = useCallback(() => {
    setNavOpen((wasOpen) => {
      if (wasOpen) menuRef.current?.focus();
      return false;
    });
  }, []);

  // On navigation: update the document title and move focus to the main region for screen readers.
  useEffect(() => {
    document.title = `${title} — DataGuard Québec`;
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [title, route]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        mainRef.current?.focus();
      }}>
        {t('a11y.skip')}
      </a>
      <Sidebar open={navOpen} current={route} onClose={closeNav} />
      <div className="app-main">
        <TopBar title={title} navOpen={navOpen} onToggleNav={() => setNavOpen((value) => !value)} menuRef={menuRef} />
        {isDemo ? <DemoBanner /> : null}
        <SessionBanner />
        <main id="main-content" className="content" tabIndex={-1} ref={mainRef}>
          {children}
        </main>
      </div>
    </div>
  );
}
