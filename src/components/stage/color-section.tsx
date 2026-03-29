import { useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import { useAppDispatch } from '../../state/context';
import { ColorSwatch } from '../controls/color-swatch';
import { postStageColor } from '../../api/stages';
import { hexToRgb } from '../../lib/color-utils';
import { SWATCHES, COLOR_THROTTLE_MS } from '../../lib/constants';
import type { StageState } from '../../types/stage';

interface ColorSectionProps {
  stage: StageState;
  stageIndex: number;
  onOpenModal: () => void;
}

let colorTimers: Record<number, ReturnType<typeof setTimeout>> = {};

export const ColorSection = memo(function ColorSection({ stage, stageIndex, onOpenModal }: ColorSectionProps) {
  const dispatch = useAppDispatch();

  const setColor = useCallback((hex: string) => {
    dispatch({ type: 'SET_STAGE_COLOR', index: stageIndex, hex });
    if (colorTimers[stageIndex]) clearTimeout(colorTimers[stageIndex]);
    colorTimers[stageIndex] = setTimeout(() => {
      const { r, g, b } = hexToRgb(hex);
      postStageColor(stage.id, r, g, b).catch(console.error);
    }, COLOR_THROTTLE_MS);
  }, [dispatch, stageIndex, stage.id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
      <div style={{ fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--app-muted)', alignSelf: 'flex-start' }}>
        Color
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center' }}>
        {SWATCHES.map(c => (
          <ColorSwatch
            key={c}
            color={c}
            selected={c === stage.color}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%' }}>
        <input
          type="color"
          value={stage.color}
          onInput={(e) => setColor((e.target as HTMLInputElement).value)}
          style={{
            WebkitAppearance: 'none',
            width: '28px', height: '22px',
            border: '1px solid var(--app-border2)', borderRadius: '4px',
            background: 'none', cursor: 'pointer', padding: '1px', flexShrink: 0,
          }}
        />
        <span
          onClick={onOpenModal}
          style={{
            fontSize: '10px', color: 'var(--app-muted)', letterSpacing: '0.04em',
            cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}
        >
          {stage.color}
        </span>
      </div>
    </div>
  );
});
