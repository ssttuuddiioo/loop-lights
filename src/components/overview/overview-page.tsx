import { ZoneGrid } from './zone-grid';
import { MasterMediaBin } from './master-media-bin';
import { GlobalControls } from './global-controls';
import { BlackoutButton } from '../controls/blackout-button';
import { MasterFader } from '../controls/master-fader';

export function OverviewPage() {
  return (
    <div style={{ padding: '24px 28px 60px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Master controls row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        background: 'var(--app-surface)', border: '1px solid var(--app-border)',
        borderRadius: 'var(--app-radius)', padding: '14px 18px',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
          textTransform: 'uppercase' as const, letterSpacing: '0.06em',
        }}>
          Master
        </span>
        <MasterFader />
        <BlackoutButton />
      </div>

      {/* Zone Grid */}
      <div>
        <div style={{
          fontSize: '11px', fontFamily: 'var(--font-display)', fontWeight: 700,
          textTransform: 'uppercase' as const, letterSpacing: '0.08em',
          color: 'var(--app-muted)', marginBottom: '10px',
        }}>
          Zones
        </div>
        <ZoneGrid />
      </div>

      {/* Master Media Bin */}
      <MasterMediaBin />

      {/* Global Controls */}
      <GlobalControls />
    </div>
  );
}
