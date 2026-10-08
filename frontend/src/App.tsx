import { config } from './constants/config';
import { ROUTES } from './constants/routes';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppShell } from './components/layout/AppShell';
import { useRoute } from './hooks/useRoute';
import { I18nProvider } from './i18n';
import { AuditEvidencePage } from './pages/AuditEvidence';
import { DashboardPage } from './pages/Dashboard';
import { DiscoveryPage } from './pages/Discovery';
import { LoginPage } from './pages/Login';
import { NotFoundPage } from './pages/NotFound';
import { PIAPage } from './pages/PIA';
import { PIIFindingsPage } from './pages/PIIFindings';
import { RemediationPage } from './pages/Remediation';
import { SettingsPage } from './pages/Settings';
import { AuthProvider, useAuth } from './state/auth';
import { WorkspaceProvider } from './state/workspace';

function Routes() {
  const { session } = useAuth();
  const { route } = useRoute();
  if (!session) return <LoginPage />;
  let page;
  switch (route) {
    case ROUTES.overview:
      page = <DashboardPage />;
      break;
    case ROUTES.discovery:
      page = <DiscoveryPage />;
      break;
    case ROUTES.findings:
      page = <PIIFindingsPage />;
      break;
    case ROUTES.pia:
      page = <PIAPage />;
      break;
    case ROUTES.remediation:
      page = <RemediationPage />;
      break;
    case ROUTES.audit:
      page = <AuditEvidencePage />;
      break;
    case ROUTES.settings:
      page = <SettingsPage />;
      break;
    default:
      page = <NotFoundPage />;
  }
  return <AppShell route={route}>{page}</AppShell>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <WorkspaceProvider demoEnabled={config.enableDemoMode}>
            <Routes />
          </WorkspaceProvider>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
