import { useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppState, useAppDispatch } from '../../state/context';
import { VerticalFader } from '../controls/vertical-fader';
import { ColorSection } from './color-section';
import { MediaSection } from './media-section';
import type { StageState } from '../../types/stage';

interface StageCardProps {
  stage: StageState;
  stageIndex: number;
}

export const StageCard = memo(function StageCard({ stage, stageIndex }: StageCardProps) {
  const { masterLevel, blackout } = useAppState();
  const dispatch = useAppDispatch();

  const effectiveIntensity = blackout ? 0 : Math.round(stage.intensity * masterLevel / 100);

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
        border: '1px solid var(--app-border2)',
        borderRadius: 'var(--app-radius)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 0.18s',
      }}
    >
      {/* Stage name */}
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600,
        color: 'var(--app-text)', letterSpacing: '0.01em',
      }}>
        {stage.name}
      </span>

      {/* Fader — takes up most of the card */}
      <VerticalFader
        stage={stage}
        stageIndex={stageIndex}
        effectiveIntensity={effectiveIntensity}
        color={stage.color}
      />

      {/* Color swatches */}
      <ColorSection stage={stage} stageIndex={stageIndex} onOpenModal={openColorModal} />

      {/* Media */}
      <MediaSection stage={stage} stageIndex={stageIndex} onOpenModal={openMediaModal} />
    </div>
  );
});
