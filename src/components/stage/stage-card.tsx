import { useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppState, useAppDispatch } from '../../state/context';
import { VerticalFader } from '../controls/vertical-fader';
import { ColorSection } from './color-section';
import { MediaSection } from './media-section';
import { InlineParams } from './inline-params';
import type { StageState } from '../../types/stage';

interface StageCardProps {
  stage: StageState;
  stageIndex: number;
}

export const StageCard = memo(function StageCard({ stage, stageIndex }: StageCardProps) {
  const { masterLevel, blackout, paramPanelZoneIndex } = useAppState();
  const dispatch = useAppDispatch();

  const effectiveIntensity = blackout ? 0 : Math.round(stage.intensity * masterLevel / 100);
  const intensityFraction = effectiveIntensity / 100;
  const isLit = effectiveIntensity > 0;
  const hasMedia = !!stage.mediaId;
  const varsOpen = paramPanelZoneIndex === stageIndex;

  const openColorModal = useCallback(() => {
    dispatch({ type: 'OPEN_COLOR_MODAL', index: stageIndex });
  }, [dispatch, stageIndex]);

  const openMediaModal = useCallback(() => {
    dispatch({ type: 'OPEN_MEDIA_MODAL', index: stageIndex });
  }, [dispatch, stageIndex]);

  return (
    <div
      class="stage-card"
      style={{
        background: 'var(--app-surface)',
        border: `1px solid ${isLit ? 'rgba(255,255,255,0.14)' : 'var(--app-border)'}`,
        borderRadius: 'var(--app-radius)',
        padding: '16px 12px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.18s, box-shadow 0.18s',
        boxShadow: isLit
          ? `0 0 ${10 + intensityFraction * 30}px -6px ${stage.color}70`
          : 'none',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: stage.color, opacity: intensityFraction,
        transition: 'opacity 0.2s',
      }} />

      {/* Stage header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em' }}>
            {stage.name}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--app-muted)' }}>
            STAGE {String(stageIndex + 1).padStart(2, '0')}
          </span>
        </div>
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: stage.color,
          opacity: isLit ? 1 : 0.3,
          transition: 'opacity 0.2s',
        }} />
      </div>

      {/* Fader */}
      <VerticalFader
        stage={stage}
        stageIndex={stageIndex}
        effectiveIntensity={effectiveIntensity}
        color={stage.color}
      />

      {/* Divider */}
      <div style={{ width: '100%', height: '1px', background: 'var(--app-border)' }} />

      {/* Color */}
      <ColorSection stage={stage} stageIndex={stageIndex} onOpenModal={openColorModal} />

      {/* Divider */}
      <div style={{ width: '100%', height: '1px', background: 'var(--app-border)' }} />

      {/* Media */}
      <MediaSection stage={stage} stageIndex={stageIndex} onOpenModal={openMediaModal} />

      {/* Vars toggle button */}
      {hasMedia && (
        <>
          <button
            onClick={() => {
              if (varsOpen) {
                dispatch({ type: 'CLOSE_PARAM_PANEL' });
              } else {
                dispatch({ type: 'OPEN_PARAM_PANEL', slotId: stage.mediaId, zoneIndex: stageIndex });
              }
            }}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: 'var(--app-radius-sm)',
              border: `1px solid ${varsOpen ? 'var(--app-text)' : 'var(--app-border2)'}`,
              background: varsOpen ? 'var(--app-text)' : 'transparent',
              color: varsOpen ? 'var(--app-bg)' : 'var(--app-muted)',
              cursor: 'pointer',
              transition: 'all 0.1s',
              width: '100%',
            }}
          >
            Parameters
          </button>

          {/* Inline param panel */}
          {varsOpen && (
            <>
              <div style={{ width: '100%', height: '1px', background: 'var(--app-border)' }} />
              <InlineParams slotId={stage.mediaId} />
            </>
          )}
        </>
      )}
    </div>
  );
});
