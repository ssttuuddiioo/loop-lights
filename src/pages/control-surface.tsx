import { useAppState } from '../state/context';
import { StageGrid } from '../components/stage/stage-grid';
import { BankNav } from '../components/stage/bank-nav';
import { ColorPanel } from '../components/modals/color-modal';
import { MixerToolkit } from '../components/mixer/mixer-toolkit';

export function ControlSurface() {
  const { colorModalStageIndex } = useAppState();

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Stage grid area */}
      <div style={{
        width: '75%',
        flexShrink: 0,
        minWidth: 0,
        overflow: 'auto',
      }}>
        <StageGrid />
        <BankNav />
      </div>

      {/* Color panel — slides in when a stage color is being edited */}
      {colorModalStageIndex !== null && (
        <div style={{
          width: '320px',
          flexShrink: 0,
          overflow: 'auto',
          borderLeft: '1px solid var(--app-border)',
        }}>
          <ColorPanel />
        </div>
      )}

      {/* Toolkit sidebar — media + presets tabs */}
      <div style={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        borderLeft: '1px solid var(--app-border)',
        background: 'var(--app-surface)',
      }}>
        <MixerToolkit />
      </div>
    </div>
  );
}
