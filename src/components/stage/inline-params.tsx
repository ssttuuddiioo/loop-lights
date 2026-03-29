import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { getMediaParameters, postMediaParameter } from '../../api/media';
import { baseUrl } from '../../api/client';
import type { MediaParameter } from '../../api/media';
import { OVERVIEW_THROTTLE_MS } from '../../lib/constants';

interface InlineParamsProps {
  slotId: string | number;
}

const HUE_PARAMS = new Set(['media-param-force', 'media-param-force-2']);
const HUE_LABELS: Record<string, string> = {
  'media-param-force': 'Color 1',
  'media-param-force-2': 'Color 2',
};

export const InlineParams = memo(function InlineParams({ slotId }: InlineParamsProps) {
  const [params, setParams] = useState<MediaParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});
  const throttleTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const isRamp = true; // hue sliders for any shader with Force params

  useEffect(() => {
    getMediaParameters(slotId).then(p => {
      setParams(p);
      const vals: Record<string, number> = {};
      p.forEach(param => { vals[param.name.id] = param.value; });
      setParamValues(vals);
    }).catch(err => console.error('Failed to fetch params:', err));
  }, [slotId]);

  useEffect(() => {
    const timers = throttleTimers.current;
    return () => { timers.forEach(t => clearTimeout(t)); timers.clear(); };
  }, []);

  const updateParam = useCallback((paramId: string, displayName: string, value: number) => {
    setParamValues(prev => ({ ...prev, [paramId]: value }));
    const existing = throttleTimers.current.get(paramId);
    if (existing) clearTimeout(existing);
    throttleTimers.current.set(paramId, setTimeout(() => {
      throttleTimers.current.delete(paramId);
      postMediaParameter(slotId, displayName, value).catch(() => {});
    }, OVERVIEW_THROTTLE_MS));
  }, [slotId]);

  if (params.length === 0) {
    return (
      <div style={{ color: 'var(--app-muted)', fontSize: '11px', textAlign: 'center', padding: 'var(--space-3) 0' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
      {/* Live MJPEG preview */}
      <img
        src={baseUrl(`media/slots/${slotId}/monitor?width=200&height=125&fps=10`)}
        alt="Live preview"
        style={{
          width: '100%',
          aspectRatio: '16 / 10',
          borderRadius: 'var(--app-radius-sm)',
          background: 'var(--app-surface3)',
          border: '1px solid var(--app-border)',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {params.map(param => {
        const val = paramValues[param.name.id] ?? param.value;
        const useHue = isRamp && HUE_PARAMS.has(param.name.id);
        const label = useHue ? HUE_LABELS[param.name.id] : param.name.value;

        return (
          <div key={param.name.id}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '2px',
            }}>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--app-muted)',
              }}>
                {label}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--app-muted)',
              }}>
                {val.toFixed(param.max > 100 ? 0 : 1)}
              </span>
            </div>
            <input
              type="range"
              class={useHue ? 'geist-hue-slider' : 'geist-slider-accent'}
              min={param.min}
              max={param.max}
              step={param.max > 100 ? 1 : 0.1}
              value={val}
              onInput={(e) => updateParam(
                param.name.id,
                param.name.value,
                parseFloat((e.target as HTMLInputElement).value),
              )}
              style={useHue ? { height: '12px' } : undefined}
            />
          </div>
        );
      })}
    </div>
  );
});
