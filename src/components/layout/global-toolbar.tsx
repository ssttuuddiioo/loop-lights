import { MasterFader } from '../controls/master-fader';
import { BlackoutButton } from '../controls/blackout-button';
import { MobileNav } from '../nav/mobile-drawer';

export function GlobalToolbar() {
  return (
    <>
      <div class="topbar" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
        background: 'var(--app-surface)',
        borderBottom: '1px solid var(--app-border)',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        {/* Left: app title */}
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600,
          color: 'var(--app-text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap',
        }}>
          Loop Lighting Control
        </span>

        {/* Right: master controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MasterFader />
          <BlackoutButton />
        </div>
      </div>

      {/* Mobile page nav — horizontal buttons under the master/blackout row (≤900px) */}
      <MobileNav />
    </>
  );
}
