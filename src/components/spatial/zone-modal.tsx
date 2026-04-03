import { useCallback, useEffect, useRef } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { VerticalFader } from '../controls/vertical-fader';
import { ColorSection } from '../stage/color-section';
import { MediaSection } from '../stage/media-section';

interface ZoneModalProps {
  stageIndex: number;
  onClose: () => void;
}

export function ZoneModal({ stageIndex, onClose }: ZoneModalProps) {
  const { stages, masterLevel, blackout } = useAppState();
  const dispatch = useAppDispatch();
  const backdropRef = useRef<HTMLDivElement>(null);

  const stage = stages[stageIndex];
  if (!stage) return null;

  const effectiveIntensity = blackout ? 0 : Math.round(stage.intensity * masterLevel / 100);

  const openColorModal = useCallback(() => {
    dispatch({ type: 'OPEN_COLOR_MODAL', index: stageIndex });
  }, [dispatch, stageIndex]);

  const openMediaModal = useCallback(() => {
    dispatch({ type: 'OPEN_MEDIA_MODAL', index: stageIndex });
  }, [dispatch, stageIndex]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on backdrop click
  const onBackdropClick = useCallback((e: MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={onBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border2)',
        borderRadius: 'var(--app-radius)',
        padding: '24px 20px',
        width: '100%',
        maxWidth: '320px',
        maxHeight: '80vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: 'none',
            color: 'var(--app-muted)', fontSize: '18px',
            cursor: 'pointer', padding: '4px', lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Header */}
        <div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700,
            letterSpacing: '0.03em',
          }}>
            {stage.name}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--app-muted)', marginTop: '2px' }}>
            ZONE {String(stageIndex + 1).padStart(2, '0')}
          </div>
        </div>

        {/* Fader */}
        <VerticalFader
          stage={stage}
          stageIndex={stageIndex}
          effectiveIntensity={effectiveIntensity}
          color={stage.color}
        />

        <div style={{ width: '100%', height: '1px', background: 'var(--app-border)' }} />

        {/* Color */}
        <ColorSection stage={stage} stageIndex={stageIndex} onOpenModal={openColorModal} />

        <div style={{ width: '100%', height: '1px', background: 'var(--app-border)' }} />

        {/* Media */}
        <MediaSection stage={stage} stageIndex={stageIndex} onOpenModal={openMediaModal} />
      </div>
    </div>
  );
}
