import { useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { useFavorites } from '../../hooks/use-favorites';
import { postStageColor } from '../../api/stages';
import { hexToRgb } from '../../lib/color-utils';
import { SWATCHES } from '../../lib/constants';

export function ColorPanel() {
  const { stages, colorModalStageIndex } = useAppState();
  const dispatch = useAppDispatch();
  const { favorites, selectedIndex, save, replace, remove, select } = useFavorites();

  const stage = colorModalStageIndex !== null ? stages[colorModalStageIndex] : null;

  const setColor = useCallback((hex: string) => {
    if (colorModalStageIndex === null) return;
    dispatch({ type: 'SET_STAGE_COLOR', index: colorModalStageIndex, hex });
  }, [dispatch, colorModalStageIndex]);

  const close = useCallback(async () => {
    if (colorModalStageIndex !== null && stage) {
      const { r, g, b } = hexToRgb(stage.color);
      try { await postStageColor(stage.id, r, g, b); } catch (_) {}
    }
    dispatch({ type: 'CLOSE_COLOR_MODAL' });
  }, [dispatch, colorModalStageIndex, stage]);

  if (!stage) return null;

  return (
    <div style={{
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--app-text)' }}>
          Color · {stage.name}
        </span>
        <button onClick={close} style={{
          all: 'unset', cursor: 'pointer', fontSize: '16px', color: 'var(--app-muted)',
          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--app-radius-sm)', background: 'var(--app-surface3)',
        }}>
          &times;
        </button>
      </div>

      {/* Preview */}
      <div style={{ height: '48px', borderRadius: 'var(--app-radius-sm)', border: '1px solid var(--app-border2)', background: stage.color }} />
      <div style={{ fontSize: '10px', color: 'var(--app-muted)' }}>{stage.color.toUpperCase()}</div>

      {/* Native picker */}
      <input
        type="color"
        value={stage.color}
        onInput={(e) => setColor((e.target as HTMLInputElement).value)}
        onChange={async (e) => {
          const hex = (e.target as HTMLInputElement).value;
          setColor(hex);
          const { r, g, b } = hexToRgb(hex);
          try { await postStageColor(stage.id, r, g, b); } catch (_) {}
        }}
        style={{
          WebkitAppearance: 'none', appearance: 'none',
          width: '100%', height: '44px',
          border: '1px solid var(--app-border2)', borderRadius: 'var(--app-radius-sm)',
          background: 'none', padding: '3px', cursor: 'pointer',
        }}
      />

      {/* Quick swatches */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
        {SWATCHES.map(hex => (
          <div
            key={hex}
            onClick={() => setColor(hex)}
            style={{
              height: '28px', borderRadius: 'var(--app-radius-sm)', background: hex, cursor: 'pointer',
              border: stage.color.toLowerCase() === hex.toLowerCase() ? '2px solid #fff' : '2px solid var(--app-border)',
            }}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '5px' }}>
        {[
          { label: 'Save', action: () => save(stage.color) },
          { label: 'Replace', action: () => { if (selectedIndex >= 0) replace(selectedIndex, stage.color); } },
          { label: 'Delete', action: () => { if (selectedIndex >= 0) remove(selectedIndex); } },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              all: 'unset', cursor: 'pointer',
              padding: '4px 10px', borderRadius: 'var(--app-radius-sm)',
              fontSize: '10px', fontFamily: 'var(--font-sans)', fontWeight: 500,
              background: 'var(--app-surface3)', border: '1px solid var(--app-border)',
              color: 'var(--app-text)',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Favorites */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '5px' }}>
        {favorites.map((color, i) => (
          <div
            key={i}
            onClick={() => {
              if (color) { setColor(color); select(i); } else { select(i); }
            }}
            style={{
              height: '28px', borderRadius: 'var(--app-radius-sm)', cursor: 'pointer',
              border: selectedIndex === i ? '2px solid white' : '2px solid var(--app-border)',
              background: color || 'var(--app-surface3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--app-muted)', fontSize: '14px',
            }}
          >
            {!color && '+'}
          </div>
        ))}
      </div>
    </div>
  );
}

/** @deprecated Use ColorPanel instead — kept as re-export for app.tsx */
export function ColorModal() {
  return null;
}
