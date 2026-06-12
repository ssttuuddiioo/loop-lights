import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import { hexToRgb, rgbToHex } from '../../lib/color-utils';

// ─── HSV helpers ────────────────────────────────────────────────────

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rn = 0, gn = 0, bn = 0;
  if (h < 60) { rn = c; gn = x; }
  else if (h < 120) { rn = x; gn = c; }
  else if (h < 180) { gn = c; bn = x; }
  else if (h < 240) { gn = x; bn = c; }
  else if (h < 300) { rn = x; bn = c; }
  else { rn = c; bn = x; }
  return { r: (rn + m) * 255, g: (gn + m) * 255, b: (bn + m) * 255 };
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

// ─── Color wheel: hue ring + inscribed SV square + hex/RGB inputs ───

interface ColorWheelProps {
  hex: string;
  onChange: (hex: string) => void;
  size?: number;
}

export function ColorWheel({ hex, onChange, size = 208 }: ColorWheelProps) {
  const ringRef = useRef<HTMLCanvasElement>(null);
  const svRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<'hue' | 'sv' | null>(null);

  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsv(r, g, b);
  });

  // Adopt external hex changes (swatch clicks, sync, glitch-zone clamps) while
  // preserving the hue when the incoming color is achromatic.
  useEffect(() => {
    if (hsvToHex(hsv.h, hsv.s, hsv.v).toLowerCase() === hex.toLowerCase()) return;
    const { r, g, b } = hexToRgb(hex);
    const d = rgbToHsv(r, g, b);
    setHsv(prev => ({ h: d.s === 0 ? prev.h : d.h, s: d.s, v: d.v }));
  }, [hex]); // eslint-disable-line react-hooks/exhaustive-deps

  const R = size / 2;
  const ringWidth = Math.round(size * 0.11);
  const ringInner = R - ringWidth;
  const svHalf = Math.floor((ringInner - 7) / Math.SQRT2);

  // Hue ring — drawn once per size
  useEffect(() => {
    const canvas = ringRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    ctx.lineWidth = ringWidth;
    const rad = R - ringWidth / 2;
    for (let i = 0; i < 360; i++) {
      const a0 = ((i - 0.6) * Math.PI) / 180;
      const a1 = ((i + 1.2) * Math.PI) / 180;
      ctx.beginPath();
      ctx.arc(R, R, rad, a0, a1);
      ctx.strokeStyle = `hsl(${i}, 100%, 50%)`;
      ctx.stroke();
    }
  }, [size, R, ringWidth]);

  // SV square — redrawn when hue changes
  useEffect(() => {
    const canvas = svRef.current;
    if (!canvas) return;
    const side = svHalf * 2;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = side * dpr;
    canvas.height = side * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    // white → pure hue, left to right
    const gx = ctx.createLinearGradient(0, 0, side, 0);
    gx.addColorStop(0, '#ffffff');
    gx.addColorStop(1, hsvToHex(hsv.h, 1, 1));
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, side, side);
    // transparent → black, top to bottom
    const gy = ctx.createLinearGradient(0, 0, 0, side);
    gy.addColorStop(0, 'rgba(0,0,0,0)');
    gy.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, side, side);
  }, [hsv.h, svHalf]);

  const applyPointer = useCallback((clientX: number, clientY: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const dx = clientX - rect.left - R;
    const dy = clientY - rect.top - R;

    if (modeRef.current === 'hue') {
      let h = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (h < 0) h += 360;
      setHsv(prev => {
        const next = { ...prev, h };
        onChange(hsvToHex(next.h, next.s, next.v));
        return next;
      });
    } else if (modeRef.current === 'sv') {
      const s = Math.max(0, Math.min(1, (dx + svHalf) / (svHalf * 2)));
      const v = 1 - Math.max(0, Math.min(1, (dy + svHalf) / (svHalf * 2)));
      setHsv(prev => {
        const next = { ...prev, s, v };
        onChange(hsvToHex(next.h, next.s, next.v));
        return next;
      });
    }
  }, [R, svHalf, onChange]);

  const onPointerDown = useCallback((e: PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left - R;
    const dy = e.clientY - rect.top - R;
    const dist = Math.hypot(dx, dy);

    if (dist >= ringInner && dist <= R + 4) modeRef.current = 'hue';
    else if (Math.abs(dx) <= svHalf + 4 && Math.abs(dy) <= svHalf + 4) modeRef.current = 'sv';
    else { modeRef.current = null; return; }

    el.setPointerCapture(e.pointerId);
    applyPointer(e.clientX, e.clientY, el);
  }, [R, ringInner, svHalf, applyPointer]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!modeRef.current) return;
    applyPointer(e.clientX, e.clientY, e.currentTarget as HTMLElement);
  }, [applyPointer]);

  const onPointerUp = useCallback(() => { modeRef.current = null; }, []);

  // Thumb positions
  const hueRad = (hsv.h * Math.PI) / 180;
  const hueThumbX = R + Math.cos(hueRad) * (R - ringWidth / 2);
  const hueThumbY = R + Math.sin(hueRad) * (R - ringWidth / 2);
  const svThumbX = R - svHalf + hsv.s * svHalf * 2;
  const svThumbY = R - svHalf + (1 - hsv.v) * svHalf * 2;

  const thumbStyle = (x: number, y: number, d: number, fill: string) => ({
    position: 'absolute' as const,
    left: `${x - d / 2}px`, top: `${y - d / 2}px`,
    width: `${d}px`, height: `${d}px`,
    borderRadius: '50%',
    background: fill,
    border: '2.5px solid #fff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
    pointerEvents: 'none' as const,
    boxSizing: 'border-box' as const,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
      {/* Wheel */}
      <div
        class="no-select"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative',
          width: `${size}px`, height: `${size}px`,
          touchAction: 'none', cursor: 'crosshair', flexShrink: 0,
        }}
      >
        <canvas ref={ringRef} style={{ position: 'absolute', inset: 0, width: `${size}px`, height: `${size}px` }} />
        <canvas
          ref={svRef}
          style={{
            position: 'absolute',
            left: `${R - svHalf}px`, top: `${R - svHalf}px`,
            width: `${svHalf * 2}px`, height: `${svHalf * 2}px`,
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxSizing: 'border-box',
          }}
        />
        <div style={thumbStyle(hueThumbX, hueThumbY, ringWidth + 6, `hsl(${hsv.h}, 100%, 50%)`)} />
        <div style={thumbStyle(svThumbX, svThumbY, 16, hsvToHex(hsv.h, hsv.s, hsv.v))} />
      </div>

      {/* Hex + RGB inputs */}
      <HexRgbInputs hex={hex} onChange={onChange} />
    </div>
  );
}

// ─── Hex / RGB input row ────────────────────────────────────────────

function HexRgbInputs({ hex, onChange }: { hex: string; onChange: (hex: string) => void }) {
  const { r, g, b } = hexToRgb(hex);
  const [hexDraft, setHexDraft] = useState<string | null>(null);

  const commitHex = (raw: string) => {
    setHexDraft(null);
    const m = raw.trim().replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(m)) onChange('#' + m.toLowerCase());
  };

  const commitChannel = (channel: 'r' | 'g' | 'b', raw: string) => {
    const v = Math.max(0, Math.min(255, parseInt(raw, 10) || 0));
    const next = { r, g, b, [channel]: v };
    onChange(rgbToHex(next.r, next.g, next.b));
  };

  const inputBase = {
    background: 'var(--app-surface3)',
    border: '1px solid var(--app-border2)',
    borderRadius: '6px',
    color: 'var(--app-text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    padding: '6px 4px',
    textAlign: 'center' as const,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  const label = {
    fontSize: '9px', fontFamily: 'var(--font-mono)',
    color: 'var(--app-muted)', textAlign: 'center' as const,
    marginTop: '3px', letterSpacing: '0.06em',
  };

  const supportsEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  const pick = async () => {
    try {
      // @ts-ignore — EyeDropper is not yet in lib.dom
      const result = await new window.EyeDropper().open();
      if (result?.sRGBHex) onChange(result.sRGBHex);
    } catch (_) { /* user cancelled */ }
  };

  return (
    <div style={{ display: 'flex', gap: '6px', width: '100%', alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 86px' }}>
        <input
          type="text"
          value={hexDraft ?? hex.toUpperCase()}
          onFocus={() => setHexDraft(hex.toUpperCase())}
          onInput={(e) => setHexDraft((e.target as HTMLInputElement).value)}
          onBlur={(e) => commitHex((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          style={inputBase}
        />
        <div style={label}>#</div>
      </div>
      {(['r', 'g', 'b'] as const).map(ch => (
        <div key={ch} style={{ flex: 1, minWidth: 0 }}>
          <input
            type="number" min={0} max={255}
            value={{ r, g, b }[ch]}
            onInput={(e) => commitChannel(ch, (e.target as HTMLInputElement).value)}
            style={inputBase}
          />
          <div style={label}>{ch.toUpperCase()}</div>
        </div>
      ))}
      {supportsEyeDropper && (
        <button
          aria-label="Pick color from screen"
          onClick={pick}
          style={{
            all: 'unset', cursor: 'pointer', flexShrink: 0,
            width: '30px', height: '27px', borderRadius: '6px',
            background: 'var(--app-surface3)', border: '1px solid var(--app-border2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', boxSizing: 'border-box',
          }}
        >💧</button>
      )}
    </div>
  );
}
