import { AppProvider, useAppState } from './state/context';
import { PageShell } from './components/layout/page-shell';
import { ControlSurface } from './pages/control-surface';
import { Overview } from './pages/overview';
import { ColorModal } from './components/modals/color-modal';
import { MediaModal } from './components/modals/media-modal';
import { ShaderPreviewModal } from './components/modals/shader-preview-modal';

function AppContent() {
  const { activePage } = useAppState();

  return (
    <PageShell>
      {activePage === 'control' ? <ControlSurface /> : <Overview />}
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
