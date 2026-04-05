import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { useAppDispatch } from '../../state/context';
import { useSyncEngine } from '../../hooks/use-sync-engine';
import { AppNav } from '../nav/app-nav';
import { GlobalToolbar } from './global-toolbar';
import { PreviewStrip } from './preview-strip';

export function PageShell({ children }: { children: ComponentChildren }) {
  const dispatch = useAppDispatch();

  // Start sync engine
  useSyncEngine();

  // Track user touching for sync pause
  useEffect(() => {
    const setTouching = (v: boolean) => () => dispatch({ type: 'SET_USER_TOUCHING', touching: v });
    const onDown = setTouching(true);
    const onUp = setTouching(false);

    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onUp, { passive: true });
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('touchend', onUp, { passive: true });
    document.addEventListener('touchcancel', onUp, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
    };
  }, [dispatch]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AppNav />
      <div style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        <GlobalToolbar />
        <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
        <PreviewStrip />
      </div>
    </div>
  );
}
