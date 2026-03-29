import { useRef, useEffect } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { MasterFader } from '../controls/master-fader';
import { BlackoutButton } from '../controls/blackout-button';
import { ConnectionPill } from '../status/connection-pill';
import { SyncStatus } from '../status/sync-status';
import { WatchdogPill } from '../status/watchdog-pill';
import { VERSION } from '../../lib/constants';
import '@material/web/chips/assist-chip.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';

export function TopBar() {
  const { stages, activePage } = useAppState();
  const dispatch = useAppDispatch();
  const tabsRef = useRef<HTMLElement>(null);

  // M3 custom elements need addEventListener for events
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const handler = () => {
      const idx = (el as any).activeTabIndex ?? 0;
      dispatch({ type: 'SET_ACTIVE_PAGE', page: idx === 0 ? 'control' : 'overview' });
    };
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, [dispatch]);

  return (
    <div class="topbar" style={{
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
      {/* Left section */}
      <div class="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase' as const,
        }}>
          Stage Control
        </span>
        <md-assist-chip label={VERSION} />
        <md-assist-chip label={`${stages.length} STAGE${stages.length === 1 ? '' : 'S'}`} />
        <ConnectionPill />

        {/* Tabs */}
        <md-tabs ref={tabsRef} style={{ marginLeft: '8px' }}>
          <md-primary-tab active={activePage === 'control'}>Control</md-primary-tab>
          <md-primary-tab active={activePage === 'overview'}>Overview</md-primary-tab>
        </md-tabs>
      </div>

      {/* Right section */}
      <div class="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div class="master-section"><MasterFader /></div>
        <BlackoutButton />
        <SyncStatus />
        <WatchdogPill />
      </div>
    </div>
  );
}
