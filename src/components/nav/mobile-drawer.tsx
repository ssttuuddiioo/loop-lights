import { useState, useCallback } from 'preact/hooks';
import { Link, useLocation } from 'wouter-preact';
import { NAV_ITEMS } from './app-nav';
import type { NavItem } from './app-nav';

/**
 * Mobile navigation: a hamburger button (shown only ≤900px via the
 * `.mobile-hamburger` class) that opens a slide-in left drawer listing all
 * pages. Replaces the desktop sidebar, which is hidden at that breakpoint.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const close = useCallback(() => setOpen(false), []);

  const isActive = (href: string) => (href === '/' ? location === '/' : location.startsWith(href));

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={close}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px', borderRadius: 'var(--app-radius)',
          background: active ? 'var(--app-accent-dim)' : 'transparent',
          color: active ? 'var(--app-accent-hover)' : 'var(--app-text-secondary)',
          textDecoration: 'none', fontFamily: 'var(--font-sans)',
          fontSize: 15, fontWeight: active ? 600 : 500,
        }}
      >
        {item.icon}
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      <button
        class="mobile-hamburger"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        style={{
          all: 'unset', cursor: 'pointer', flexShrink: 0,
          width: 40, height: 40, borderRadius: 'var(--app-radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--app-text)', background: 'var(--app-surface3)',
          border: '1px solid var(--app-border2)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={close}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.55)',
            }}
          />
          {/* Drawer */}
          <nav
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1001,
              width: 'min(280px, 82vw)',
              background: 'var(--app-surface)',
              borderRight: '1px solid var(--app-border)',
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: 12,
              paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
              overflowY: 'auto',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px 10px',
            }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--app-muted)' }}>
                Menu
              </span>
              <button
                aria-label="Close menu"
                onClick={close}
                style={{
                  all: 'unset', cursor: 'pointer',
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--app-radius-sm)', background: 'var(--app-surface3)', color: 'var(--app-muted)',
                  fontSize: 18,
                }}
              >
                &times;
              </button>
            </div>

            {NAV_ITEMS.map(renderItem)}
          </nav>
        </>
      )}
    </>
  );
}
