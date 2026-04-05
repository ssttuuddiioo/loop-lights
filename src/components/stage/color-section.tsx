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
  onOpenModal?: () => void;
}

let colorTimers: Record<number, ReturnType<typeof setTimeout>> = {};

export const ColorSection = memo(function ColorSection({ stage, stageIndex }: ColorSectionProps) {
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
      {SWATCHES.map(c => (
        <ColorSwatch
          key={c}
          color={c}
          selected={c === stage.color}
          onClick={() => setColor(c)}
        />
      ))}
      <input
        type="color"
        value={stage.color}
        onInput={(e) => setColor((e.target as HTMLInputElement).value)}
        style={{
          WebkitAppearance: 'none',
          width: '22px', height: '22px',
          border: '1px solid var(--app-border2)', borderRadius: '4px',
          background: 'none', cursor: 'pointer', padding: '1px', flexShrink: 0,
        }}
      />
    </div>
  );
});
