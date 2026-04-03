import { useCallback, useEffect } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { VerticalFader } from '../controls/vertical-fader';
import { ColorSection } from '../stage/color-section';
import { MediaSection } from '../stage/media-section';

interface ZoneSidebarProps {
  stageIndex: number | null;
  onClose: () => void;
}

export function ZoneSidebar({ stageIndex, onClose }: ZoneSidebarProps) {
  const { stages, masterLevel, blackout } = useAppState();
  const dispatch = useAppDispatch();

  const open = stageIndex !== null;
  const stage = open ? stages[stageIndex] : null;
  const effectiveIntensity = stage
    ? (blackout ? 0 : Math.round(stage.intensity * masterLevel / 100))
    : 0;

  const openColorModal = useCallback(() => {
    if (stageIndex !== null) dispatch({ type: 'OPEN_COLOR_MODAL', index: stageIndex });
  }, [dispatch, stageIndex]);

  const openMediaModal = useCallback(() => {
    if (stageIndex !== null) dispatch({ type: 'OPEN_MEDIA_MODAL', index: stageIndex });
  }, [dispatch, stageIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '300px',
      height: '100%',
      background: 'var(--app-surface)',
      borderLeft: '1px solid var(--app-border2)',
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.2s ease',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--app-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}>
            {stage?.name ?? ''}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--app-muted)', marginTop: '2px' }}>
            {stageIndex !== null ? `ZONE ${String(stageIndex + 1).padStart(2, '0')}` : ''}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--app-muted)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      {stage && stageIndex !== null && (
        <div style={{
          padding: '16px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <VerticalFader
            stage={stage}
            stageIndex={stageIndex}
            effectiveIntensity={effectiveIntensity}
            color={stage.color}
          />

          <div style={{ width: '100%', height: '1px', background: 'var(--app-border)' }} />

          <ColorSection stage={stage} stageIndex={stageIndex} onOpenModal={openColorModal} />

          <div style={{ width: '100%', height: '1px', background: 'var(--app-border)' }} />

          <MediaSection stage={stage} stageIndex={stageIndex} onOpenModal={openMediaModal} />
        </div>
      )}
    </div>
  );
}
