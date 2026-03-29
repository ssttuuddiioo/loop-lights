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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        class="no-select"
        style={{
          position: 'relative',
          width: '36px',
          height: '160px',
          background: 'var(--app-surface3)',
          borderRadius: '18px',
          border: '1px solid var(--app-border)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          touchAction: 'none',
          cursor: 'ns-resize',
        }}
        {...handlers}
      >
        <div
          style={{
            width: '100%',
            height: `${displayIntensity}%`,
            borderRadius: '18px',
            background: color,
            opacity: 0.85,
            pointerEvents: 'none',
          }}
        />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {localValue}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--app-muted)', marginTop: '1px' }}>
          intensity
        </div>
      </div>
    </div>
  );
});
