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
    <Suspense fallback={
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', color: 'var(--app-muted)',
        fontFamily: 'var(--font-mono)', fontSize: '13px',
      }}>
        Loading 3D...
      </div>
    }>
      <SpatialView />
    </Suspense>
  );
}

function AppContent() {
  return (
    <PageShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/mixer" component={ControlSurface} />
        <Route path="/3d" component={SpatialRoute} />
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
