import { useState, useEffect } from 'preact/hooks';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'dimly-theme';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

// Shared module-level store so every useTheme() consumer stays in sync and the
// theme is applied at load — regardless of which page mounts the toggle.
let current: Theme = getInitialTheme();
const listeners = new Set<(t: Theme) => void>();

function apply(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(STORAGE_KEY, t); } catch {}
}

apply(current);

export function setTheme(t: Theme) {
  if (t === current) return;
  current = t;
  apply(t);
  listeners.forEach(l => l(t));
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(current);

  useEffect(() => {
    const listener = (t: Theme) => setThemeState(t);
    listeners.add(listener);
    setThemeState(current);
    return () => { listeners.delete(listener); };
  }, []);

  const toggle = () => setTheme(current === 'dark' ? 'light' : 'dark');

  return { theme, toggle } as const;
}
