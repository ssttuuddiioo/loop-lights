import { useAppState } from '../../state/context';
import { MasterFader } from '../controls/master-fader';
import { BlackoutButton } from '../controls/blackout-button';
import { ConnectionPill } from '../status/connection-pill';
import { SyncStatus } from '../status/sync-status';
import { WatchdogPill } from '../status/watchdog-pill';
import { AppNav } from '../nav/app-nav';
import { VERSION } from '../../lib/constants';
import '@material/web/chips/assist-chip.js';

export function GlobalToolbar() {
  const { stages } = useAppState();

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      minHeight: 'calc(56px + env(safe-area-inset-top, 0px))',
      background: 'rgba(10,10,11,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--app-border)',
      flexWrap: 'wrap',
      gap: '8px',
    }}>
      {/* Left: branding + status + nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase' as const,
        }}>
          Stage Control
        </span>
        <md-assist-chip label={VERSION} />
        <md-assist-chip label={`${stages.length} STAGE${stages.length === 1 ? '' : 'S'}`} />
        <ConnectionPill />
        <AppNav />
      </div>

      {/* Right: master controls + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MasterFader />
        <BlackoutButton />
        <SyncStatus />
        <WatchdogPill />
      </div>
    </div>
  );
}
