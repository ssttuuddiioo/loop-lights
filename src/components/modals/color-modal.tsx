import { useCallback } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { useFavorites } from '../../hooks/use-favorites';
import { postStageColor } from '../../api/stages';
import { hexToRgb } from '../../lib/color-utils';
import { SWATCHES } from '../../lib/constants';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/button/outlined-button.js';

export function ColorModal() {
  const { stages, colorModalStageIndex } = useAppState();
  const dispatch = useAppDispatch();
  const { favorites, selectedIndex, save, replace, remove, select } = useFavorites();

  const isOpen = colorModalStageIndex !== null;
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

  const onBackdropClick = useCallback((e: MouseEvent) => {
    if (e.target === e.currentTarget) close();
  }, [close]);

  if (!isOpen || !stage) return null;

  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: '20px',
      }}
    >
      <div style={{
        width: 'min(760px, 96vw)', maxHeight: '88vh', overflow: 'auto',
        background: 'var(--app-surface)', border: '1px solid var(--app-border2)',
        borderRadius: '16px', padding: '16px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700 }}>
            Color · {stage.name}
          </span>
          <md-outlined-button onClick={close}>Close</md-outlined-button>
        </div>

        {/* Preview */}
        <div style={{ height: '74px', borderRadius: '12px', border: '1px solid var(--app-border2)', background: stage.color, marginBottom: '10px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--app-muted)', marginBottom: '10px' }}>
          <span>{stage.color.toUpperCase()}</span>
          <span>Use picker or favorites</span>
        </div>

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
            width: '100%', height: '64px',
            border: '1px solid var(--app-border2)', borderRadius: '12px',
            background: 'none', padding: '4px', cursor: 'pointer', marginBottom: '10px',
          }}
        />

        {/* Quick swatches */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px', marginBottom: '12px' }}>
          {SWATCHES.map(hex => (
            <div
              key={hex}
              onClick={() => setColor(hex)}
              style={{
                height: '36px', borderRadius: '10px', background: hex, cursor: 'pointer',
                border: stage.color.toLowerCase() === hex.toLowerCase() ? '2px solid #fff' : '2px solid var(--app-border)',
              }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <md-filled-tonal-button onClick={() => save(stage.color)}>Save current</md-filled-tonal-button>
          <md-filled-tonal-button onClick={() => { if (selectedIndex >= 0) replace(selectedIndex, stage.color); }}>Replace selected</md-filled-tonal-button>
          <md-filled-tonal-button onClick={() => { if (selectedIndex >= 0) remove(selectedIndex); }}>Delete selected</md-filled-tonal-button>
        </div>

        {/* Favorites grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '8px' }}>
          {favorites.map((color, i) => (
            <div
              key={i}
              onClick={() => {
                if (color) {
                  setColor(color);
                  select(i);
                } else {
                  select(i);
                }
              }}
              style={{
                height: '40px', borderRadius: '10px', cursor: 'pointer',
                border: selectedIndex === i ? '2px solid white' : '2px solid var(--app-border)',
                background: color || 'var(--app-surface3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--app-muted)', fontSize: '18px',
              }}
            >
              {!color && '+'}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
