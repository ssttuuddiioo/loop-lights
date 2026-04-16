import { Route, Switch, Redirect } from 'wouter-preact';
import { lazy, Suspense } from 'preact/compat';
import { AppProvider } from './state/context';
import { PageShell } from './components/layout/page-shell';
import { ControlSurface } from './pages/control-surface';
import { Dashboard } from './components/dashboard/dashboard';
import { ColorModal } from './components/modals/color-modal';
import { MediaModal } from './components/modals/media-modal';
import { ShaderPreviewModal } from './components/modals/shader-preview-modal';
import { ControllersPage } from './pages/controllers';

const SpatialView = lazy(() => import('./components/spatial/spatial-view').then(m => ({ default: m.SpatialView })));

function SpatialRoute() {
  return (
    <Suspense fallback={null}>
      <SpatialView />
    </Suspense>
  );
}

function AppContent() {
  return (
    <PageShell>
      <Switch>
        <Route path="/" component={SpatialRoute} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/mixer" component={ControlSurface} />
        <Route path="/controllers" component={ControllersPage} />
        <Route><Redirect to="/" /></Route>
      </Switch>
      <ColorModal />
      <MediaModal />
      <ShaderPreviewModal />
    </PageShell>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
