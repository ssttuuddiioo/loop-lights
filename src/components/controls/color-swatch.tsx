import { memo } from 'preact/compat';

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onClick: () => void;
  size?: number;
}

export const ColorSwatch = memo(function ColorSwatch({ color, selected, onClick, size = 28 }: ColorSwatchProps) {
  return (
    <div
      onClick={onClick}
      class="no-select"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '6px',
        background: color,
        border: selected ? '2px solid rgba(255,255,255,0.6)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'transform 0.1s, border-color 0.1s',
        flexShrink: 0,
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    />
  );
});
