import { useEffect, useState, useCallback, useRef } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { getMediaParameters, postMediaParameter } from '../../api/media';
import { baseUrl } from '../../api/client';
import type { MediaParameter } from '../../api/media';
import { OVERVIEW_THROTTLE_MS } from '../../lib/constants';

// Parameters to hide from the slider list
const HIDDEN_PARAMS = new Set([
  'media-param-position-x',
  'media-param-position-y',
  'media-param-time-offset',
]);

// For gradient ramp: also hide force/force2 since we show color pickers instead
const GRADIENT_COLOR_PARAMS = new Set([
  'media-param-force',
  'media-param-force-2',
]);

// Default values for gradient ramp reset (keyed by display name)
const GRADIENT_DEFAULTS: Record<string, number> = {
  'Force': 1,
  'Force 2': 5,
  'Nb Items': 1,
  'Zoom': 1,
  'Speed': 0,
};

/** Convert gradient ramp hue param (1-10) → hex color */
function hueParamToHex(value: number): string {
  const hue = (value - 1) / 9;
  // HSV to RGB (s=1, v=1)
  const i = Math.floor(hue * 6);
  const f = hue * 6 - i;
  const q = 1 - f;
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = 1; g = f; b = 0; break;
    case 1: r = q; g = 1; b = 0; break;
    case 2: r = 0; g = 1; b = f; break;
    case 3: r = 0; g = q; b = 1; break;
    case 4: r = f; g = 0; b = 1; break;
    case 5: r = 1; g = 0; b = q; break;
  }
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Convert hex color → gradient ramp hue param (1-10) */
function hexToHueParam(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  // Hue 0-1 → param 1-10
  return h * 9 + 1;
}

export function ParamPanel() {
  const { paramPanelSlotId, paramPanelZoneIndex, mediaSlots } = useAppState();
  const dispatch = useAppDispatch();

  const [params, setParams] = useState<MediaParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});
  const [resetting, setResetting] = useState(false);
  const throttleTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const slot = mediaSlots.find(s => String(s.id) === String(paramPanelSlotId));
  const isGradientRamp = (slot?.name?.toLowerCase() || '').includes('gradient');

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
    setResetting(true);
    try {
      // Post all default values
      await Promise.all(
        params.map(p => {
          const def = GRADIENT_DEFAULTS[p.name.value];
          if (def !== undefined) {
            return postMediaParameter(paramPanelSlotId, p.name.value, def);
          }
          return Promise.resolve();
        })
      );
      // Re-fetch params
      const p = await getMediaParameters(paramPanelSlotId);
      setParams(p);
      const vals: Record<string, number> = {};
      p.forEach(param => { vals[param.name.id] = param.value; });
      setParamValues(vals);
    } catch (err) {
      console.error('Reset failed:', err);
    }
    setResetting(false);
  }, [paramPanelSlotId, params]);

  const close = useCallback(() => {
    dispatch({ type: 'CLOSE_PARAM_PANEL' });
  }, [dispatch]);

  if (!paramPanelSlotId || paramPanelZoneIndex === null) return null;

  // Build hidden set
  const hiddenSet = new Set(HIDDEN_PARAMS);
  if (isGradientRamp) {
    GRADIENT_COLOR_PARAMS.forEach(id => hiddenSet.add(id));
  }

  const visibleParams = params.filter(p => !hiddenSet.has(p.name.id));

  // Color picker values
  const color1Param = params.find(p => p.name.id === 'media-param-force');
  const color2Param = params.find(p => p.name.id === 'media-param-force-2');
  const color1Hex = color1Param ? hueParamToHex(paramValues[color1Param.name.id] ?? color1Param.value) : '#ff0000';
  const color2Hex = color2Param ? hueParamToHex(paramValues[color2Param.name.id] ?? color2Param.value) : '#00ff00';

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
            Parameters
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
          {isGradientRamp && (
            <button
              class="geist-icon-btn"
              onClick={onReset}
              disabled={resetting}
              title="Reset to defaults"
              style={{ fontSize: '13px', width: 'auto', padding: '0 8px' }}
            >
              {resetting ? '...' : 'Reset'}
            </button>
          )}
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

      {/* Color pickers for gradient ramp */}
      {isGradientRamp && color1Param && color2Param && (
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--app-muted)',
              marginBottom: 'var(--space-2)',
            }}>
              Color 1
            </div>
            <input
              type="color"
              value={color1Hex}
              onInput={(e) => {
                const hex = (e.target as HTMLInputElement).value;
                const val = hexToHueParam(hex);
                updateParam(color1Param.name.id, color1Param.name.value, val);
              }}
              style={{
                width: '100%',
                height: '36px',
                border: '1px solid var(--app-border2)',
                borderRadius: 'var(--app-radius-sm)',
                background: 'none',
                cursor: 'pointer',
                padding: '2px',
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--app-muted)',
              marginBottom: 'var(--space-2)',
            }}>
              Color 2
            </div>
            <input
              type="color"
              value={color2Hex}
              onInput={(e) => {
                const hex = (e.target as HTMLInputElement).value;
                const val = hexToHueParam(hex);
                updateParam(color2Param.name.id, color2Param.name.value, val);
              }}
              style={{
                width: '100%',
                height: '36px',
                border: '1px solid var(--app-border2)',
                borderRadius: 'var(--app-radius-sm)',
                background: 'none',
                cursor: 'pointer',
                padding: '2px',
              }}
            />
          </div>
        </div>
      )}

      {/* Parameter sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {visibleParams.map(param => {
          const val = paramValues[param.name.id] ?? param.value;
          const max = param.name.value.toLowerCase() === 'zoom' ? 50 : param.max;
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
                  {param.name.value}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--app-muted)',
                }}>
                  {val.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                class="geist-slider-accent"
                min={param.min}
                max={max}
                step={max > 100 ? 1 : 0.1}
                value={Math.min(val, max)}
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
