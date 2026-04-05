import { useAppState } from '../state/context';
import { StageGrid } from '../components/stage/stage-grid';
import { BankNav } from '../components/stage/bank-nav';
import { ColorPanel } from '../components/modals/color-modal';
import { MediaPanel } from '../components/modals/media-modal';

export function ControlSurface() {
  const { colorModalStageIndex, mediaModalStageIndex } = useAppState();
  const panelOpen = colorModalStageIndex !== null || mediaModalStageIndex !== null;

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Stage grid area */}
      <div style={{
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
        transition: 'flex 0.25s ease',
      }}>
        <StageGrid />
        <BankNav />
      </div>

      {/* Inline panel */}
      <div style={{
        width: panelOpen ? '320px' : '0px',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 0.25s ease',
        borderLeft: panelOpen ? '1px solid var(--app-border)' : 'none',
      }}>
        <div style={{
          width: '320px',
          height: '100%',
          overflow: 'auto',
        }}>
          {colorModalStageIndex !== null && <ColorPanel />}
          {mediaModalStageIndex !== null && <MediaPanel />}
        </div>
      </div>
    </div>
  );
}
