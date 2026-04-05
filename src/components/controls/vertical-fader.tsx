import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppDispatch } from '../../state/context';
import { usePointerFader } from '../../hooks/use-pointer-fader';
import { postStageIntensity } from '../../api/stages';
import { FADER_THROTTLE_MS } from '../../lib/constants';
import type { StageState } from '../../types/stage';

interface VerticalFaderProps {
  stage: StageState;
  stageIndex: number;
  effectiveIntensity: number;
  color: string;
}

export const VerticalFader = memo(function VerticalFader({ stage, stageIndex, effectiveIntensity, color }: VerticalFaderProps) {
  const dispatch = useAppDispatch();
  const [localValue, setLocalValue] = useState(stage.intensity);
  const draggingRef = useRef(false);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Accept server value only when not dragging
  useEffect(() => {
    if (!draggingRef.current) {
      setLocalValue(stage.intensity);
    }
  }, [stage.intensity]);

  const throttledPost = useCallback((value: number) => {
    if (throttleTimer.current) clearTimeout(throttleTimer.current);
    throttleTimer.current = setTimeout(() => {
      postStageIntensity(stage.id, value / 100).catch(console.error);
    }, FADER_THROTTLE_MS);
  }, [stage.id]);

  const { handlers } = usePointerFader({
    onValueChange: (value) => {
      setLocalValue(value);
      dispatch({ type: 'SET_STAGE_INTENSITY', index: stageIndex, value });
      throttledPost(value);
    },
    onDragStart: () => {
      draggingRef.current = true;
    },
    onDragEnd: (finalValue) => {
      draggingRef.current = false;
      if (throttleTimer.current) clearTimeout(throttleTimer.current);
      postStageIntensity(stage.id, finalValue / 100).catch(console.error);
    },
  });

  const displayIntensity = draggingRef.current ? localValue : effectiveIntensity;

  return (
    <div
      class="no-select fader-wrap"
      style={{
        position: 'relative',
        width: '100%',
        background: 'var(--app-surface3)',
        borderRadius: 'var(--app-radius)',
        border: '1px solid var(--app-border)',
        overflow: 'hidden',
        touchAction: 'none',
        cursor: 'ns-resize',
      }}
      {...handlers}
    >
      {/* Fill */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          height: `${displayIntensity}%`,
          background: color,
          opacity: 0.75,
          borderRadius: 'var(--app-radius)',
          transition: draggingRef.current ? 'none' : 'height 0.15s ease',
        }}
      />
      {/* Percentage overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: '22px',
        fontWeight: 700,
        color: '#fff',
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {localValue}%
      </div>
    </div>
  );
});
