import { Link, useLocation } from 'wouter-preact';
import { NAV_ITEMS } from './app-nav';
import type { NavItem } from './app-nav';

/**
 * Mobile navigation: a horizontal bar of page buttons (one per primary page)
 * shown only ≤900px via the `.mobile-nav-bar` class, sitting directly beneath
 * the global toolbar (master fader + blackout). Replaces both the desktop
 * sidebar and the old hamburger drawer at that breakpoint.
 */
export function MobileNav() {
  const [location] = useLocation();

  const isActive = (href: string) => (href === '/' ? location === '/' : location.startsWith(href));

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 8px', borderRadius: 'var(--app-radius-sm)',
          background: active ? 'var(--app-accent-dim)' : 'var(--app-surface3)',
          border: `1px solid ${active ? 'var(--app-accent-hover)' : 'var(--app-border2)'}`,
          color: active ? 'var(--app-accent-hover)' : 'var(--app-text-secondary)',
          textDecoration: 'none', fontFamily: 'var(--font-sans)',
          fontSize: 14, fontWeight: active ? 600 : 510, whiteSpace: 'nowrap',
        }}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      class="mobile-nav-bar"
      style={{
        gap: 8,
        padding: '8px 12px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--app-surface)',
        borderBottom: '1px solid var(--app-border)',
      }}
    >
      {NAV_ITEMS.map(renderItem)}
    </nav>
  );
}
