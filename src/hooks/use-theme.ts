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

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setThemeState(t => t === 'dark' ? 'light' : 'dark');

  return { theme, toggle } as const;
}
