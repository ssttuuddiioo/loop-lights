import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { getMediaParameters, postMediaParameter } from '../../api/media';
import { baseUrl } from '../../api/client';
import type { MediaParameter } from '../../api/media';
import { OVERVIEW_THROTTLE_MS } from '../../lib/constants';

// Force/Force2 param IDs — these are hue values in our ramp shaders
const HUE_PARAMS = new Set(['media-param-force', 'media-param-force-2']);

// Friendly labels for hue params
const HUE_LABELS: Record<string, string> = {
  'media-param-force': 'Color 1',
  'media-param-force-2': 'Color 2',
};

export function ParamPanel() {
  const { paramPanelSlotId, paramPanelZoneIndex, mediaSlots } = useAppState();
  const dispatch = useAppDispatch();

  const [params, setParams] = useState<MediaParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});
  const throttleTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const slot = mediaSlots.find(s => String(s.id) === String(paramPanelSlotId));
  const isRampShader = (slot?.name?.toLowerCase() || '').includes('ramp');

  // Fetch parameters when slot changes
  useEffect(() => {
    if (!paramPanelSlotId) return;
    getMediaParameters(paramPanelSlotId).then(p => {
      setParams(p);
      const vals: Record<string, number> = {};
      p.forEach(param => { vals[param.name.id] = param.value; });
      setParamValues(vals);
    }).catch(err => console.error('Failed to fetch params:', err));
  }, [paramPanelSlotId]);

  // Cleanup throttle timers
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
      if (paramPanelSlotId) {
        postMediaParameter(paramPanelSlotId, displayName, value).catch(() => {});
      }
    }, OVERVIEW_THROTTLE_MS));
  }, [paramPanelSlotId]);

  const onReset = useCallback(async () => {
    if (!paramPanelSlotId) return;
    try {
      // Re-fetch current params from ELM (in case user wants to use ELM's own reset)
      const p = await getMediaParameters(paramPanelSlotId);
      setParams(p);
      const vals: Record<string, number> = {};
      p.forEach(param => { vals[param.name.id] = param.value; });
      setParamValues(vals);
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  }, [paramPanelSlotId]);

  const close = useCallback(() => {
    dispatch({ type: 'CLOSE_PARAM_PANEL' });
  }, [dispatch]);

  if (!paramPanelSlotId || paramPanelZoneIndex === null) return null;

  return (
    <div style={{
      width: '300px',
      flexShrink: 0,
      background: 'var(--app-surface)',
      borderLeft: '1px solid var(--app-border)',
      padding: 'var(--space-5)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--app-text)',
            letterSpacing: '-0.01em',
          }}>
            {slot?.name || `Slot ${paramPanelSlotId}`}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--app-muted)',
            marginTop: 'var(--space-1)',
          }}>
            Slot {paramPanelSlotId} · Zone {paramPanelZoneIndex + 1}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <button
            class="geist-icon-btn"
            onClick={onReset}
            title="Refresh from ELM"
            style={{ fontSize: '13px', width: 'auto', padding: '0 8px' }}
          >
            Refresh
          </button>
          <button class="geist-close-btn" onClick={close}>✕</button>
        </div>
      </div>

      {/* Live MJPEG preview */}
      <img
        src={baseUrl(`media/slots/${paramPanelSlotId}/monitor?width=280&height=175&fps=10`)}
        alt="Live preview"
        style={{
          width: '100%',
          aspectRatio: '16 / 10',
          borderRadius: 'var(--app-radius)',
          background: 'var(--app-surface2)',
          border: '1px solid var(--app-border)',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* All ELM parameter sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {params.map(param => {
          const val = paramValues[param.name.id] ?? param.value;
          const useHueSlider = isRampShader && HUE_PARAMS.has(param.name.id);
          const label = useHueSlider ? HUE_LABELS[param.name.id] : param.name.value;

          return (
            <div key={param.name.id}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 'var(--space-2)',
              }}>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--app-text)',
                }}>
                  {label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--app-muted)',
                }}>
                  {val.toFixed(param.max > 100 ? 0 : 1)}
                </span>
              </div>
              <input
                type="range"
                class={useHueSlider ? 'geist-hue-slider' : 'geist-slider-accent'}
                min={param.min}
                max={param.max}
                step={param.max > 100 ? 1 : 0.1}
                value={val}
                onInput={(e) => updateParam(
                  param.name.id,
                  param.name.value,
                  parseFloat((e.target as HTMLInputElement).value),
                )}
              />
            </div>
          );
        })}
        {params.length === 0 && (
          <div style={{
            color: 'var(--app-muted)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            textAlign: 'center',
            padding: 'var(--space-6) 0',
          }}>
            No parameters available
          </div>
        )}
      </div>
    </div>
  );
}
