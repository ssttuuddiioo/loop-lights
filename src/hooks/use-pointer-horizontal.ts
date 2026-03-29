import { useRef, useCallback } from 'preact/hooks';

interface UsePointerHorizontalOptions {
  onValueChange: (value: number) => void;
  onDragEnd?: (finalValue: number) => void;
}

export function usePointerHorizontal({ onValueChange, onDragEnd }: UsePointerHorizontalOptions) {
  const active = useRef(false);
  const rafId = useRef(0);
  const pendingX = useRef<number | null>(null);
  const currentValue = useRef(0);

  const calcValue = useCallback((clientX: number, rect: DOMRect): number => {
    const x = Math.max(rect.left, Math.min(clientX, rect.right));
    return Math.round(((x - rect.left) / rect.width) * 100);
  }, []);

  const processFrame = useCallback((rect: DOMRect) => {
    if (pendingX.current === null) return;
    const clientX = pendingX.current;
    pendingX.current = null;
    const pct = calcValue(clientX, rect);
    currentValue.current = pct;
    onValueChange(pct);
  }, [calcValue, onValueChange]);

  const onPointerDown = useCallback((e: PointerEvent) => {
    const wrap = e.currentTarget as HTMLElement;
    active.current = true;
    wrap.setPointerCapture(e.pointerId);
    const rect = wrap.getBoundingClientRect();
    const pct = calcValue(e.clientX, rect);
    currentValue.current = pct;
    onValueChange(pct);
  }, [calcValue, onValueChange]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!active.current) return;
    const wrap = e.currentTarget as HTMLElement;
    const rect = wrap.getBoundingClientRect();
    pendingX.current = e.clientX;
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = 0;
        processFrame(rect);
      });
    }
  }, [processFrame]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    active.current = false;
    const wrap = e.currentTarget as HTMLElement;
    try { wrap.releasePointerCapture(e.pointerId); } catch (_) {}
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
    onDragEnd?.(currentValue.current);
  }, [onDragEnd]);

  const onPointerCancel = useCallback(() => {
    active.current = false;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(0, currentValue.current - 1);
      currentValue.current = next;
      onValueChange(next);
      onDragEnd?.(next);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(100, currentValue.current + 1);
      currentValue.current = next;
      onValueChange(next);
      onDragEnd?.(next);
    }
  }, [onValueChange, onDragEnd]);

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onKeyDown,
    },
    setCurrentValue: (v: number) => { currentValue.current = v; },
  };
}
