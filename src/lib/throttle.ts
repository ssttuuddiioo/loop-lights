export function createThrottle(delay: number): (fn: () => void) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (fn: () => void) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn();
    }, delay);
  };
}

export function createThrottleMap(delay: number): (key: string | number, fn: () => void) => void {
  const timers = new Map<string | number, ReturnType<typeof setTimeout>>();
  return (key, fn) => {
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      fn();
    }, delay));
  };
}

export function clearThrottleMap(key: string | number, timers: Map<string | number, ReturnType<typeof setTimeout>>): void {
  const existing = timers.get(key);
  if (existing) {
    clearTimeout(existing);
    timers.delete(key);
  }
}
