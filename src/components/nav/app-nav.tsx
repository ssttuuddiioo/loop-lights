import { Link, useLocation } from 'wouter-preact';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/mixer',
    label: 'Mixer',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
        <circle cx="4" cy="12" r="2" /><circle cx="12" cy="10" r="2" /><circle cx="20" cy="14" r="2" />
      </svg>
    ),
  },
  {
    href: '/3d',
    label: '3D',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: '/controllers',
    label: 'Controllers',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      borderRight: '1px solid var(--app-border)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '20px',
      gap: '4px',
      zIndex: 200,
    }}>
      {/* Logo dot */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
              borderRadius: 'var(--app-radius-sm)',
              background: isActive ? 'var(--app-surface3)' : 'transparent',
              color: isActive ? 'var(--app-text)' : 'var(--app-muted)',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
              cursor: 'pointer',
              width: '64px',
            }}
          >
            {icon}
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '9px',
              fontWeight: isActive ? 600 : 400,
              letterSpacing: '0.04em',
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
