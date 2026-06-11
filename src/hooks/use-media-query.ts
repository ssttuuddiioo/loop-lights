import { useState, useEffect } from 'preact/hooks';

/** Reactive CSS media-query match. Re-renders when the match changes. */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatch(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return match;
}

/** True on phones + tablets (the compact layout breakpoint, ≤900px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 900px)');
}
