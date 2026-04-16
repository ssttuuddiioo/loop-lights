import { Link, useLocation } from 'wouter-preact';

const NAV_ITEMS = [
  {
    href: '/',
    label: '3D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: '/mixer',
    label: 'Mixer',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
        <circle cx="4" cy="12" r="2" /><circle cx="12" cy="10" r="2" /><circle cx="20" cy="14" r="2" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Settings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    ),
  },
  {
    href: '/controllers',
    label: 'Controllers',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <circle cx="9" cy="9" r="1.5" fill="currentColor" /><circle cx="15" cy="9" r="1.5" fill="currentColor" />
        <circle cx="9" cy="15" r="1.5" fill="currentColor" /><circle cx="15" cy="15" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
] as const;

export function AppNav() {
  const [location] = useLocation();

  return (
    <nav class="sidebar" style={{
      position: 'fixed', left: 0, top: 0, bottom: 0,
      width: 'var(--sidebar-width)',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '20px',
      gap: '4px',
      zIndex: 200,
    }}>
      {/* Logo dot */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, #5e6ad2, #7170ff)',
        marginBottom: 20, flexShrink: 0,
      }} />

      {NAV_ITEMS.map(({ href, label, icon }) => {
        const isActive = href === '/'
          ? location === '/'
          : location.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px',
              padding: '10px 8px',
              borderRadius: '6px',
              background: isActive ? 'rgba(94,106,210,0.12)' : 'transparent',
              color: isActive ? '#7170ff' : 'var(--app-text-quaternary)',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
              cursor: 'pointer',
              width: '64px',
            }}
          >
            {icon}
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '10px',
              fontWeight: isActive ? 510 : 400,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
