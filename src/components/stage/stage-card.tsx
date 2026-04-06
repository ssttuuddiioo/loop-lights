import { useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppState, useAppDispatch } from '../../state/context';
import { VerticalFader } from '../controls/vertical-fader';
import { ColorSection } from './color-section';
import { MediaSection } from './media-section';
import { postStageIntensity } from '../../api/stages';
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

  const isOn = stage.intensity > 0;

  const toggleOnOff = useCallback(() => {
    const newVal = isOn ? 0 : (stage.baseIntensity > 0 ? stage.baseIntensity : 100);
    dispatch({ type: 'SET_STAGE_INTENSITY', index: stageIndex, value: newVal });
    postStageIntensity(stage.id, newVal / 100).catch(console.error);
  }, [dispatch, stageIndex, isOn, stage.baseIntensity, stage.id]);

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
      {/* Header: name + on/off toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600,
          color: 'var(--app-text)', letterSpacing: '0.01em',
        }}>
          {stage.name}
        </span>
        <button
          onClick={toggleOnOff}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            background: isOn ? stage.color : 'var(--app-surface3)',
            border: `1px solid ${isOn ? stage.color : 'var(--app-border2)'}`,
            position: 'relative',
            transition: 'background 0.15s, border-color 0.15s',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            background: isOn ? '#fff' : 'var(--app-muted)',
            position: 'absolute',
            top: '2px',
            left: isOn ? '19px' : '2px',
            transition: 'left 0.15s, background 0.15s',
          }} />
        </button>
      </div>

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
