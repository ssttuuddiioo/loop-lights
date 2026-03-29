import { useRef, useEffect } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { postOverviewParams } from '../../api/settings';
import { OVERVIEW_THROTTLE_MS } from '../../lib/constants';
import '@material/web/slider/slider.js';

const throttleTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function throttledPost(key: string, params: Record<string, number>) {
  if (throttleTimers[key]) clearTimeout(throttleTimers[key]);
  throttleTimers[key] = setTimeout(() => {
    postOverviewParams(params).catch(console.error);
  }, OVERVIEW_THROTTLE_MS);
}

export function GlobalControls() {
  const { hueShift, speed, shaderParams } = useAppState();
  const dispatch = useAppDispatch();

  const shaderKeys = ['blur', 'wave', 'glitch'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700,
        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
        color: 'var(--app-muted)',
      }}>
        Global Controls
      </div>

      <SliderRow
        label="Hue Shift"
        value={Math.round(hueShift)}
        displayValue={`${Math.round(hueShift)}\u00B0`}
        min={0} max={360}
        onChange={(v) => { dispatch({ type: 'SET_HUE_SHIFT', degrees: v }); throttledPost('hueShift', { hueShift: v }); }}
      />

      <SliderRow
        label="Speed"
        value={Math.round(speed * 100)}
        displayValue={`${Math.round(speed * 100)}%`}
        min={0} max={100}
        onChange={(v) => { dispatch({ type: 'SET_SPEED', value: v / 100 }); throttledPost('speed', { speed: v / 100 }); }}
      />

      {shaderKeys.map(key => (
        <SliderRow
          key={key}
          label={key}
          value={Math.round((shaderParams[key] || 0) * 100)}
          displayValue={`${Math.round((shaderParams[key] || 0) * 100)}%`}
          min={0} max={100}
          onChange={(v) => { dispatch({ type: 'SET_SHADER_PARAM', key, value: v / 100 }); throttledPost(`shader_${key}`, { [key]: v / 100 }); }}
        />
      ))}
    </div>
  );
}

function SliderRow({ label, value, displayValue, min, max, onChange }: {
  label: string; value: number; displayValue: string;
  min: number; max: number; onChange: (v: number) => void;
}) {
  const sliderRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;
    const handler = () => {
      onChange(Number((el as any).value ?? 0));
    };
    el.addEventListener('change', handler);
    el.addEventListener('input', handler);
    return () => {
      el.removeEventListener('change', handler);
      el.removeEventListener('input', handler);
    };
  }, [onChange]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: 'var(--app-surface)', border: '1px solid var(--app-border)',
      borderRadius: 'var(--app-radius)', padding: '10px 14px',
    }}>
      <span style={{ fontSize: '10px', color: 'var(--app-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', minWidth: '72px' }}>
        {label}
      </span>
      <md-slider ref={sliderRef} min={min} max={max} value={value} style={{ flex: 1 }} />
      <span style={{ fontSize: '11px', color: 'var(--app-text)', minWidth: '40px', textAlign: 'right' as const }}>
        {displayValue}
      </span>
    </div>
  );
}
