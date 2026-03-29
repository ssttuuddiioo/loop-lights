import { useAppState } from '../../state/context';
import { ZoneControls } from './zone-controls';
import { ZoneMediaStrip } from './zone-media-strip';
import { ParamPanel } from './param-panel';
import { GlobalControls } from './global-controls';
import { BlackoutButton } from '../controls/blackout-button';
import { MasterFader } from '../controls/master-fader';

export function OverviewPage() {
  const { stages, paramPanelSlotId } = useAppState();

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Main content — scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-5) var(--space-6) 60px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-5)',
      }}>
        {/* Master controls row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          flexWrap: 'wrap',
          background: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
          borderRadius: 'var(--app-radius)',
          padding: 'var(--space-3) var(--space-4)',
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.04em',
            color: 'var(--app-muted)',
          }}>
            Master
          </span>
          <MasterFader />
          <BlackoutButton />
        </div>

        {/* Zone table */}
        <div style={{
          background: 'var(--app-surface)',
          border: '1px solid var(--app-border)',
          borderRadius: 'var(--app-radius)',
          overflow: 'hidden',
        }}>
          {stages.map((stage, index) => (
            <div
              key={stage.id}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                minHeight: '88px',
                borderBottom: index < stages.length - 1
                  ? '1px solid var(--app-border)'
                  : 'none',
              }}
            >
              {/* Column 1: Zone controls */}
              <div style={{
                width: '180px',
                flexShrink: 0,
                padding: 'var(--space-2) var(--space-4)',
                borderRight: '1px solid var(--app-border)',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
              }}>
                <ZoneControls stage={stage} stageIndex={index} />
              </div>

              {/* Column 2: Media strip */}
              <div style={{
                flex: 1,
                padding: 'var(--space-2) var(--space-3)',
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
              }}>
                <ZoneMediaStrip stage={stage} stageIndex={index} />
              </div>
            </div>
          ))}
        </div>

        {/* Global Controls */}
        <GlobalControls />
      </div>

      {/* Column 3: Parameter panel */}
      {paramPanelSlotId !== null && <ParamPanel />}
    </div>
  );
}
