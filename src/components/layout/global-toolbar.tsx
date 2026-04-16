import { useAppState } from '../../state/context';
import { MasterFader } from '../controls/master-fader';
import { BlackoutButton } from '../controls/blackout-button';

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: '6px',
      padding: '4px 0',
    }}>
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 510,
        color: 'var(--app-text-quaternary)', letterSpacing: '-0.01em',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 510,
        color: 'var(--app-text)', lineHeight: 1.2,
      }}>
        {value}
      </span>
    </div>
  );
}

export function GlobalToolbar() {
  const { stages, masterLevel, mediaSlots, elmOutputRate } = useAppState();

  return (
    <div class="topbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px',
      paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
      background: 'var(--app-surface)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      {/* Left: stat chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <StatChip label="Stages" value={stages.length} />
        <StatChip label="Master Level" value={`${masterLevel}%`} />
        <StatChip label="Media" value={mediaSlots.length} />
        <StatChip label="FPS" value={elmOutputRate || '—'} />
      </div>

      {/* Right: master controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <MasterFader />
        <BlackoutButton />
      </div>
    </div>
  );
}
