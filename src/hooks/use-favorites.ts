import { useState, useCallback } from 'preact/hooks';

const STORAGE_KEY = 'elmStageColorFavorites';
const MAX_FAVORITES = 10;

function loadFavorites(): (string | null)[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    const result: (string | null)[] = [];
    for (let i = 0; i < MAX_FAVORITES; i++) {
      result.push(typeof arr[i] === 'string' ? arr[i] : null);
    }
    return result;
  } catch {
    return new Array(MAX_FAVORITES).fill(null);
  }
}

function saveFavorites(favorites: (string | null)[]) {
  const clean = favorites.filter(c => c !== null);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean.slice(0, MAX_FAVORITES)));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<(string | null)[]>(loadFavorites);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const save = useCallback((hex: string) => {
    setFavorites(prev => {
      const next = [...prev];
      let idx = selectedIndex >= 0 ? selectedIndex : next.findIndex(c => c === null);
      if (idx === -1) idx = MAX_FAVORITES - 1;
      next[idx] = hex;
      saveFavorites(next);
      setSelectedIndex(idx);
      return next;
    });
  }, [selectedIndex]);

  const replace = useCallback((index: number, hex: string) => {
    setFavorites(prev => {
      const next = [...prev];
      next[index] = hex;
      saveFavorites(next);
      return next;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setFavorites(prev => {
      const next = [...prev];
      next.splice(index, 1);
      next.push(null);
      saveFavorites(next);
      setSelectedIndex(-1);
      return next;
    });
  }, []);

  const select = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const apply = useCallback((index: number): string | null => {
    setSelectedIndex(index);
    return favorites[index] || null;
  }, [favorites]);

  return { favorites, selectedIndex, save, replace, remove, select, apply };
}
