import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks';
import { getAdminStatus } from '../api/health';
import { AdminGate } from '../components/admin-gate';
import { getStages } from '../api/stages';
import type { StageInfo } from '../types/stage';
import { rawPush, getSafeColor, saveCalibration } from '../api/calibrate';
import type { CalibrationMark } from '../api/calibrate';
import { hsvToRgb } from '../lib/safe-color';
import { rgbToHex } from '../lib/color-utils';

// HSV square geometry: X = saturation 0->1, Y = value 1->0 (top = bright).
const SQUARE = 320;
const STEP = 0.05;                 // grid resolution (rectangle precision ~0.05)
const MARGIN = STEP;               // push the derived boundary one cell past the marks
const HUES: (number | 'gray')[] = [0, 60, 120, 180, 240, 300, 'gray'];
const PUSH_THROTTLE_MS = 90;
const DEFAULT_EPS = 0.04;

const HUE_LABEL: Record<string, string> = {
  '0': 'Red', '60': 'Yellow', '120': 'Green',
  '180': 'Cyan', '240': 'Blue', '300': 'Magenta', 'gray': 'Gray',
};

const snap = (x: number) => Math.round(x / STEP) * STEP;
const round2 = (x: number) => Math.round(x * 100) / 100;
const markKey = (m: CalibrationMark) =>
  `${m.h}:${round2(m.s).toFixed(2)}:${round2(m.v).toFixed(2)}`;

/** Color for a (hue, s, v) test cell. 'gray' = achromatic (s forced 0). */
function cellRgb(hue: number | 'gray', s: number, v: number) {
  return hue === 'gray' ? hsvToRgb(0, 0, v) : hsvToRgb(hue, s, v);
}

export function CalibratePage() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => { getAdminStatus().then(setAdmin); }, []);

  if (admin === null) {
    return (
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--app-muted)', textAlign: 'center', padding: 40 }}>
        Checking access...
      </div>
    );
  }
  if (admin === false) {
    return <AdminGate onUnlock={() => setAdmin(true)} subtitle="Calibration is restricted. Enter the admin password." />;
  }
  return <CalibrateTool />;
}

function CalibrateTool() {
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [target, setTarget] = useState<string | 'all' | null>(null);
  const [hue, setHue] = useState<number | 'gray'>(0);
  const [marks, setMarks] = useState<CalibrationMark[]>([]);
  const [cursor, setCursor] = useState<{ s: number; v: number } | null>(null);
  const [sMin, setSMin] = useState(0.45);
  const [vMax, setVMax] = useState(0.6);
  const [autoDerive, setAutoDerive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);

  const painting = useRef<null | 'add' | 'erase'>(null);
  const throttle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPush = useRef(0);

  // Load stages + any existing calibration on mount.
  useEffect(() => {
    getStages().then(s => {
      setStages(s);
      setTarget(s.length ? s[0].id : 'all');
    }).catch(() => {});
    getSafeColor().then(z => {
      if (typeof z.sMin === 'number') setSMin(z.sMin);
      if (typeof z.vMax === 'number') setVMax(z.vMax);
      if (z.calibration?.marks?.length) { setMarks(z.calibration.marks); setAutoDerive(false); }
    }).catch(() => {});
  }, []);

  const markSet = useMemo(() => new Set(marks.map(markKey)), [marks]);

  // Derive the rectangle from marks: forbid s < sMin && v > vMax must contain
  // every glitch mark -> sMin just past max(s), vMax just below min(v).
  useEffect(() => {
    if (!autoDerive || marks.length === 0) return;
    const maxS = Math.max(...marks.map(m => m.s));
    const minV = Math.min(...marks.map(m => m.v));
    setSMin(round2(Math.min(1, maxS + MARGIN)));
    setVMax(round2(Math.max(0, minV - MARGIN)));
  }, [marks, autoDerive]);

  // --- Live push to the fixtures (raw, unclamped, full intensity) ---
  const pushColor = useCallback((s: number, v: number) => {
    if (target === null) return;
    const { r, g, b } = cellRgb(hue, s, v);
    const targets = target === 'all' ? stages.map(st => st.id) : [target];
    const now = Date.now();
    const fire = () => { targets.forEach(id => rawPush(id, r, g, b, 1).catch(() => {})); lastPush.current = Date.now(); };
    if (now - lastPush.current >= PUSH_THROTTLE_MS) { fire(); return; }
    if (throttle.current) clearTimeout(throttle.current);
    throttle.current = setTimeout(fire, PUSH_THROTTLE_MS);
  }, [target, hue, stages]);

  const toggleMark = useCallback((s: number, v: number, mode: 'add' | 'erase') => {
    const m: CalibrationMark = { h: hue, s: round2(s), v: round2(v) };
    const key = markKey(m);
    setMarks(prev => {
      const has = prev.some(x => markKey(x) === key);
      if (mode === 'add') return has ? prev : [...prev, m];
      return prev.filter(x => markKey(x) !== key);
    });
  }, [hue]);

  // --- Pointer handling on the SV square ---
  const squareRef = useRef<HTMLDivElement>(null);
  const cellFromEvent = (e: PointerEvent): { s: number; v: number } | null => {
    const el = squareRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const s = hue === 'gray' ? 0 : snap(Math.max(0, Math.min(1, x)));
    const v = snap(Math.max(0, Math.min(1, 1 - y)));
    return { s, v };
  };

  const onPointerDown = (e: PointerEvent) => {
    const c = cellFromEvent(e);
    if (!c) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const key = markKey({ h: hue, s: round2(c.s), v: round2(c.v) });
    const mode = markSet.has(key) ? 'erase' : 'add';
    painting.current = mode;
    setAutoDerive(true);
    toggleMark(c.s, c.v, mode);
    setCursor(c);
    pushColor(c.s, c.v);
  };
  const onPointerMove = (e: PointerEvent) => {
    const c = cellFromEvent(e);
    if (!c) return;
    setCursor(c);
    pushColor(c.s, c.v);
    if (painting.current) toggleMark(c.s, c.v, painting.current);
  };
  const endPaint = () => { painting.current = null; };

  // --- Auto-sweep: step a cursor through the suspect grid, spacebar marks ---
  const sweepCells = useMemo(() => {
    const cells: { s: number; v: number }[] = [];
    for (let v = 1; v >= 0.55 - 1e-9; v -= STEP) {
      if (hue === 'gray') { cells.push({ s: 0, v: round2(v) }); continue; }
      for (let s = 0; s <= 0.5 + 1e-9; s += STEP) cells.push({ s: round2(s), v: round2(v) });
    }
    return cells;
  }, [hue]);
  const sweepIdx = useRef(0);
  useEffect(() => {
    if (!sweeping) return;
    sweepIdx.current = 0;
    const tick = () => {
      const c = sweepCells[sweepIdx.current];
      if (!c) { setSweeping(false); return; }
      setCursor(c);
      pushColor(c.s, c.v);
      sweepIdx.current += 1;
    };
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [sweeping, sweepCells, pushColor]);

  // Spacebar marks the current cursor cell (handy during sweep).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !cursor) return;
      e.preventDefault();
      setAutoDerive(true);
      const key = markKey({ h: hue, s: round2(cursor.s), v: round2(cursor.v) });
      toggleMark(cursor.s, cursor.v, markSet.has(key) ? 'erase' : 'add');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, hue, markSet, toggleMark]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setSavedMsg(null);
    const res = await saveCalibration({
      sMin, vMax, achromaticEps: DEFAULT_EPS,
      calibration: { hues: HUES, marks },
    });
    setSaving(false);
    setSavedMsg(res.success ? 'Saved — clamp is live everywhere.' : `Failed: ${res.error || 'unknown'}`);
  }, [sMin, vMax, marks]);

  const blackout = useCallback(() => {
    if (target === null) return;
    (target === 'all' ? stages.map(s => s.id) : [target]).forEach(id => rawPush(id, 0, 0, 0, 0).catch(() => {}));
  }, [target, stages]);

  const marksThisHue = marks.filter(m => m.h === hue).length;
  const preview = cursor ? cellRgb(hue, cursor.s, cursor.v) : null;
  const previewHex = preview ? rgbToHex(preview.r, preview.g, preview.b) : '#000000';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, height: '100%', overflow: 'auto' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--app-text)' }}>
          Glitch-zone calibration
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--app-muted)', marginTop: 4, maxWidth: 560, lineHeight: 1.5 }}>
          Hover/drag the square to push that color <b>raw</b> to the fixtures (full intensity).
          Click-drag to paint cells that <b>glitch</b>. Work through each hue + gray. The forbidden
          rectangle is derived from your marks and, once saved, becomes unreachable on every path.
        </div>
      </div>

      {/* Target stage */}
      <Row label="Target">
        <Chip label="All stages" active={target === 'all'} onClick={() => setTarget('all')} />
        {stages.map(s => (
          <Chip key={s.id} label={s.name} active={target === s.id} onClick={() => setTarget(s.id)} />
        ))}
        <button onClick={blackout} style={btnStyle(false)}>Blackout</button>
      </Row>

      {/* Hue tabs */}
      <Row label="Hue">
        {HUES.map(h => {
          const n = marks.filter(m => m.h === h).length;
          return (
            <Chip
              key={String(h)}
              label={`${HUE_LABEL[String(h)]}${n ? ` (${n})` : ''}`}
              active={hue === h}
              color={h === 'gray' ? '#aaaaaa' : rgbToHex(...rgbTuple(cellRgb(h, 1, 1)))}
              onClick={() => setHue(h)}
            />
          );
        })}
      </Row>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* SV square */}
        <div
          ref={squareRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPaint}
          onPointerLeave={endPaint}
          style={{
            position: 'relative', width: 'min(320px, 92vw)', maxWidth: SQUARE,
            aspectRatio: '1 / 1', flexShrink: 0, alignSelf: 'flex-start',
            borderRadius: 8, cursor: 'crosshair', touchAction: 'none',
            border: '1px solid var(--app-border2)',
            background: hue === 'gray'
              ? 'linear-gradient(to bottom, #fff, #000)'
              : `linear-gradient(to bottom, rgba(0,0,0,0), #000), linear-gradient(to right, #fff, ${rgbToHex(...rgbTuple(cellRgb(hue, 1, 1)))})`,
          }}
        >
          {/* mark overlay (sparse) — percentage-positioned so it scales with the square */}
          {marks.filter(m => m.h === hue).map(m => (
            <div key={markKey(m)} style={{
              position: 'absolute', pointerEvents: 'none',
              left: `${(hue === 'gray' ? 0 : m.s) * 100}%`,
              top: `${(1 - m.v) * 100 - STEP * 100}%`,
              width: hue === 'gray' ? '100%' : `${STEP * 100}%`,
              height: `${STEP * 100}%`,
              background: 'rgba(255,40,40,0.55)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
            }} />
          ))}
          {/* cursor ring */}
          {cursor && (
            <div style={{
              position: 'absolute', pointerEvents: 'none',
              left: `calc(${(hue === 'gray' ? 0.5 : cursor.s) * 100}% - 7px)`,
              top: `calc(${(1 - cursor.v) * 100}% - 7px)`,
              width: 14, height: 14, borderRadius: '50%', border: '2px solid #fff',
              boxShadow: '0 0 0 1px #000',
            }} />
          )}
          {/* axis hints */}
          <Axis style={{ left: 6, bottom: 4 }}>← saturation →</Axis>
          <Axis style={{ left: 6, top: 4 }}>value ↑ (bright)</Axis>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 240, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 6, border: '1px solid var(--app-border2)', background: previewHex }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--app-muted)', lineHeight: 1.5 }}>
              {cursor
                ? <>S {round2(cursor.s).toFixed(2)} · V {round2(cursor.v).toFixed(2)}<br />{previewHex.toUpperCase()} · {preview!.r},{preview!.g},{preview!.b}</>
                : 'Hover the square'}
            </div>
          </div>

          <button onClick={() => setSweeping(s => !s)} style={btnStyle(sweeping)}>
            {sweeping ? '■ Stop sweep' : '▶ Auto-sweep this hue (Space = mark)'}
          </button>

          {/* Derived rectangle */}
          <div style={{ borderTop: '1px solid var(--app-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, color: 'var(--app-text)' }}>
              Forbidden rectangle &nbsp;
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, color: 'var(--app-muted)' }}>
                S &lt; {sMin.toFixed(2)} AND V &gt; {vMax.toFixed(2)}
              </span>
            </div>
            <Slider label="sMin" value={sMin} onChange={(v) => { setAutoDerive(false); setSMin(round2(v)); }} />
            <Slider label="vMax" value={vMax} onChange={(v) => { setAutoDerive(false); setVMax(round2(v)); }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAutoDerive(true)} style={btnStyle(autoDerive)}>Re-derive from marks</button>
              <button onClick={() => { setMarks([]); setAutoDerive(false); }} style={btnStyle(false)}>Clear marks</button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-muted)' }}>
              {marks.length} marks total · {marksThisHue} on this hue
            </div>
          </div>

          <button onClick={onSave} disabled={saving} style={{ ...btnStyle(true), padding: 10, fontSize: 13 }}>
            {saving ? 'Saving…' : 'Save calibration'}
          </button>
          {savedMsg && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: savedMsg.startsWith('Failed') ? '#FF3333' : 'var(--app-accent)' }}>
              {savedMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- small presentational helpers ---

function rgbTuple(c: { r: number; g: number; b: number }): [number, number, number] {
  return [c.r, c.g, c.b];
}

function Row({ label, children }: { label: string; children: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-muted)', width: 54 }}>{label}</span>
      {children}
    </div>
  );
}

function Chip({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
      border: active ? '1px solid var(--app-accent)' : '1px solid var(--app-border)',
      background: active ? 'var(--app-surface3)' : 'transparent',
      color: active ? 'var(--app-text)' : 'var(--app-text-secondary)',
    }}>
      {color && <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />}
      {label}
    </button>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-muted)', width: 36 }}>{label}</span>
      <input
        type="range" min={0} max={1} step={0.01} value={value}
        onInput={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
        style={{ flex: 1 }}
      />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--app-text)', width: 32, textAlign: 'right' }}>{value.toFixed(2)}</span>
    </div>
  );
}

function Axis({ children, style }: { children: any; style: Record<string, any> }) {
  return (
    <div style={{
      position: 'absolute', pointerEvents: 'none',
      fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.7)',
      textShadow: '0 0 2px #000', ...style,
    }}>
      {children}
    </div>
  );
}

function btnStyle(active: boolean) {
  return {
    all: 'unset' as const, cursor: 'pointer', textAlign: 'center' as const,
    padding: '6px 10px', borderRadius: 6,
    fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
    border: active ? '1px solid var(--app-accent)' : '1px solid var(--app-border)',
    background: active ? 'var(--app-accent)' : 'var(--app-surface3)',
    color: active ? '#fff' : 'var(--app-text)',
  };
}
