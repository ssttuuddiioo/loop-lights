import { useCallback, useRef, useEffect } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppDispatch } from '../../state/context';
import { postStageIntensity } from '../../api/stages';
import type { StageState } from '../../types/stage';
import '@material/web/switch/switch.js';
import '@material/web/slider/slider.js';

interface ZoneCardProps {
  stage: StageState;
  stageIndex: number;
}

export const ZoneCard = memo(function ZoneCard({ stage, stageIndex }: ZoneCardProps) {
  const dispatch = useAppDispatch();
  const isOn = stage.intensity > 0;
  const sliderRef = useRef<HTMLElement>(null);

  const onToggle = useCallback(() => {
    dispatch({ type: 'TOGGLE_ZONE', index: stageIndex });
    const newIntensity = isOn ? 0 : (stage.baseIntensity > 0 ? stage.baseIntensity : 100);
    postStageIntensity(stage.id, newIntensity / 100).catch(console.error);
  }, [dispatch, stageIndex, isOn, stage.baseIntensity, stage.id]);

  // M3 slider needs addEventListener
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const handler = () => {
      const value = Number((el as any).value ?? 0);
      dispatch({ type: 'SET_STAGE_INTENSITY', index: stageIndex, value });
      postStageIntensity(stage.id, value / 100).catch(console.error);
    };
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, [dispatch, stageIndex, stage.id]);

  return (
    <div style={{
      background: 'var(--app-surface)',
      border: `1px solid ${isOn ? 'rgba(255,255,255,0.14)' : 'var(--app-border)'}`,
      borderRadius: 'var(--app-radius)',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: stage.color, opacity: isOn ? 0.8 : 0,
      }} />

      {/* Header: name + color dot + switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: stage.color, opacity: isOn ? 1 : 0.3,
          }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700 }}>
            {stage.name}
          </span>
        </div>
        <md-switch selected={isOn} onClick={onToggle} />
      </div>

      {/* Opacity slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '10px', color: 'var(--app-muted)', minWidth: '28px' }}>
          {stage.intensity}%
        </span>
        <md-slider ref={sliderRef} min={0} max={100} value={stage.intensity} style={{ flex: 1 }} />
      </div>
    </div>
  );
});
