import { useAppState } from '../../state/context';
import { MasterFader } from '../controls/master-fader';
import { BlackoutButton } from '../controls/blackout-button';
import { useTheme } from '../../hooks/use-theme';

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

function ThemeToggle({ theme, toggle }: { theme: 'dark' | 'light'; toggle: () => void }) {
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        all: 'unset', cursor: 'pointer',
        width: '32px', height: '32px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '6px',
        background: 'var(--app-surface3)',
        border: '1px solid var(--app-border2)',
        color: 'var(--app-text-secondary)',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function GlobalToolbar() {
  const { stages, masterLevel, mediaSlots, elmOutputRate } = useAppState();
  const { theme, toggle } = useTheme();

  return (
    <div class="topbar" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px',
      paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
      background: 'var(--app-surface)',
      borderBottom: '1px solid var(--app-border)',
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

      {/* Right: theme toggle + master controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ThemeToggle theme={theme} toggle={toggle} />
        <MasterFader />
        <BlackoutButton />
      </div>
    </div>
  );
}
