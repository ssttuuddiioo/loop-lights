import { Link, useLocation } from 'wouter-preact';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/mixer', label: 'Mixer' },
  { href: '/3d', label: '3D' },
] as const;

export function AppNav() {
  const [location] = useLocation();

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', gap: '2px',
      marginLeft: '8px',
      background: 'var(--app-surface)',
      borderRadius: 'var(--app-radius)',
      border: '1px solid var(--app-border)',
      padding: '2px',
    }}>
      {NAV_ITEMS.map(({ href, label }) => {
        const isActive = href === '/'
          ? location === '/'
          : location.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 400,
              letterSpacing: '0.02em',
              padding: '6px 14px',
              borderRadius: '6px',
              background: isActive ? 'var(--app-surface3)' : 'transparent',
              color: isActive ? 'var(--app-text)' : 'var(--app-muted)',
              textDecoration: 'none',
              transition: 'background 0.12s, color 0.12s',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
