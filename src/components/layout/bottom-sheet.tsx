import type { ComponentChildren } from 'preact';

/**
 * Mobile bottom sheet: a backdrop + bottom-anchored panel that slides up over
 * the page. Used on ≤900px to host the color panel and mixer toolkit (which are
 * side columns on desktop). Closes on backdrop / grab-handle tap.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  maxHeight = '85vh',
}: {
  open: boolean;
  onClose: () => void;
  children: ComponentChildren;
  maxHeight?: string;
}) {
  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.5)' }}
      />
      <div
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 901,
          maxHeight, display: 'flex', flexDirection: 'column',
          background: 'var(--app-surface)',
          borderTop: '1px solid var(--app-border)',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          overflow: 'hidden',
        }}
      >
        <div
          onClick={onClose}
          style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--app-border2)' }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {children}
        </div>
      </div>
    </>
  );
}
