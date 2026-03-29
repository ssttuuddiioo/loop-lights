import { useRef, useCallback } from 'preact/hooks';
import { INERTIA_CAP } from '../lib/constants';

interface UsePointerFaderOptions {
  onValueChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: (finalValue: number) => void;
}

export function usePointerFader({ onValueChange, onDragStart, onDragEnd }: UsePointerFaderOptions) {
  const dragging = useRef(false);
  const lastY = useRef<number | null>(null);
  const lastTime = useRef(0);
  const velocity = useRef(0);
  const currentValue = useRef(0);
  const rafId = useRef(0);
  const pendingY = useRef<number | null>(null);

  const calcValue = useCallback((clientY: number, rect: DOMRect): number => {
    const y = Math.max(rect.top, Math.min(clientY, rect.bottom));
    return Math.round((1 - (y - rect.top) / rect.height) * 100);
  }, []);

  const processFrame = useCallback((rect: DOMRect) => {
    if (pendingY.current === null) return;
    const clientY = pendingY.current;
    pendingY.current = null;

    const pct = calcValue(clientY, rect);
    const now = performance.now();

    if (lastY.current !== null && lastTime.current) {
      const dy = lastY.current - clientY;
      const dt = Math.max(1, now - lastTime.current);
      velocity.current = dy / dt;
    }
    lastY.current = clientY;
    lastTime.current = now;
    currentValue.current = pct;

    onValueChange(pct);
  }, [calcValue, onValueChange]);

  const onPointerDown = useCallback((e: PointerEvent) => {
    const wrap = e.currentTarget as HTMLElement;
    dragging.current = true;
    velocity.current = 0;
    lastY.current = null;
    lastTime.current = 0;
    wrap.setPointerCapture(e.pointerId);
    onDragStart?.();

    const rect = wrap.getBoundingClientRect();
    const pct = calcValue(e.clientY, rect);
    currentValue.current = pct;
    onValueChange(pct);
  }, [calcValue, onValueChange, onDragStart]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const wrap = e.currentTarget as HTMLElement;
    const rect = wrap.getBoundingClientRect();

    pendingY.current = e.clientY;
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = 0;
        processFrame(rect);
      });
    }
  }, [processFrame]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    dragging.current = false;
    const wrap = e.currentTarget as HTMLElement;
    try { wrap.releasePointerCapture(e.pointerId); } catch (_) {}

    // Cancel any pending rAF
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }

    // Inertial settle
    let settle = Math.round(velocity.current * 18);
    if (settle > INERTIA_CAP) settle = INERTIA_CAP;
    if (settle < -INERTIA_CAP) settle = -INERTIA_CAP;

    const final = Math.max(0, Math.min(100, currentValue.current + settle));
    if (settle !== 0) {
      currentValue.current = final;
      onValueChange(final);
    }

    onDragEnd?.(final);
  }, [onValueChange, onDragEnd]);

  const onPointerCancel = useCallback(() => {
    dragging.current = false;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
    }
  }, []);

  return {
    isDragging: dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
