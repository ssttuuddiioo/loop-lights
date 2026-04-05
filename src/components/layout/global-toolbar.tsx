import { useAppState } from '../../state/context';
import { MasterFader } from '../controls/master-fader';
import { BlackoutButton } from '../controls/blackout-button';

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 16px',
      background: 'var(--app-surface)',
      borderRadius: 'var(--app-radius-sm)',
      border: '1px solid var(--app-border)',
      minWidth: 80,
    }}>
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: '10px',
        color: 'var(--app-muted)', letterSpacing: '0.04em',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 700,
        color: 'var(--app-text)', lineHeight: 1.2,
      }}>
        {value}
      </span>
    </div>
  );
}

export function GlobalToolbar() {
  const { stages, masterLevel, mediaSlots } = useAppState();

  return (
    <div class="topbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px',
      paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
      background: 'var(--app-surface)',
      borderBottom: '1px solid var(--app-border)',
      borderRadius: '0 0 var(--app-radius) var(--app-radius)',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      {/* Left: stat chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <StatChip label="Stages" value={stages.length} />
        <StatChip label="Master Level" value={`${masterLevel}%`} />
        <StatChip label="Media Loaded" value={mediaSlots.length} />
      </div>

      {/* Right: master controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MasterFader />
        <BlackoutButton />
      </div>
    </div>
  );
}
