import { useCallback, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppDispatch } from '../../state/context';
import { postStageIntensity } from '../../api/stages';
import type { StageState } from '../../types/stage';

interface ZoneControlsProps {
  stage: StageState;
  stageIndex: number;
}

export const ZoneControls = memo(function ZoneControls({ stage, stageIndex }: ZoneControlsProps) {
  const dispatch = useAppDispatch();
  const isOn = stage.intensity > 0;
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onToggle = useCallback(() => {
    dispatch({ type: 'TOGGLE_ZONE', index: stageIndex });
    const newIntensity = isOn ? 0 : (stage.baseIntensity > 0 ? stage.baseIntensity : 100);
    postStageIntensity(stage.id, newIntensity / 100).catch(console.error);
  }, [dispatch, stageIndex, isOn, stage.baseIntensity, stage.id]);

  const onSliderInput = useCallback((e: Event) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    dispatch({ type: 'SET_STAGE_INTENSITY', index: stageIndex, value });
    if (throttleRef.current) clearTimeout(throttleRef.current);
    throttleRef.current = setTimeout(() => {
      postStageIntensity(stage.id, value / 100).catch(console.error);
    }, 60);
  }, [dispatch, stageIndex, stage.id]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) 0',
      justifyContent: 'center',
      height: '100%',
    }}>
      <span style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--app-text)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        letterSpacing: '-0.01em',
      }}>
        {stage.name}
      </span>
      <input
        type="checkbox"
        class="geist-toggle"
        checked={isOn}
        onChange={onToggle}
      />
      <input
        type="range"
        class="geist-slider"
        min={0}
        max={100}
        value={stage.intensity}
        onInput={onSliderInput}
      />
    </div>
  );
});
