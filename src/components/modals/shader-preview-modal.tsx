import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { getMediaParameters, postMediaParameter } from '../../api/media';
import type { MediaParameter } from '../../api/media';
import '@material/web/button/outlined-button.js';

// --- GLSL source for our custom shaders ---
const GRADIENT_RAMP_SRC = `
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform float iForce;
uniform float iForce2;
uniform float iNbItems;

vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float tiles = max(iNbItems, 1.0);
    float t = fract(uv.y * tiles - iTime * 0.2);
    vec3 col = mix(color1, color2, t);
    gl_FragColor = vec4(col, 1.0);
}
`;

const VERT_SRC = `attribute vec2 pos; void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

// Map ELM parameter IDs to our custom shaders' GLSL source
// Add more entries here as you create new shaders
const SHADER_SOURCES: Record<string, string> = {
  'gradient ramp': GRADIENT_RAMP_SRC,
  'gradient-ramp': GRADIENT_RAMP_SRC,
};

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

// The ELM parameter names that our shader uses
const PARAM_MAP: Record<string, string> = {
  'media-param-force': 'iForce',
  'media-param-force-2': 'iForce2',
  'media-param-nb-items': 'iNbItems',
};

export function ShaderPreviewModal() {
  const { shaderPreviewSlotId, mediaSlots } = useAppState();
  const dispatch = useAppDispatch();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);

  const [params, setParams] = useState<MediaParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});

  const isOpen = shaderPreviewSlotId !== null;
  const slot = mediaSlots.find(s => String(s.id) === String(shaderPreviewSlotId));
  const slotName = slot?.name?.toLowerCase() || '';
  const fragSrc = Object.entries(SHADER_SOURCES).find(([key]) => slotName.includes(key))?.[1];

  // Fetch parameters from ELM when modal opens
  useEffect(() => {
    if (!isOpen || !shaderPreviewSlotId) return;
    getMediaParameters(shaderPreviewSlotId).then(p => {
      setParams(p);
      const vals: Record<string, number> = {};
      p.forEach(param => { vals[param.name.id] = param.value; });
      setParamValues(vals);
    }).catch(err => console.error('Failed to fetch params:', err));
  }, [isOpen, shaderPreviewSlotId]);

  // Set up WebGL
  useEffect(() => {
    if (!isOpen || !fragSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;
    glRef.current = gl;

    const prog = gl.createProgram();
    if (!prog) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;

    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);
    progRef.current = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Size canvas
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);

    startRef.current = performance.now();

    return () => {
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      glRef.current = null;
      progRef.current = null;
    };
  }, [isOpen, fragSrc]);

  // Render loop
  useEffect(() => {
    if (!isOpen || !fragSrc) return;

    function frame() {
      const gl = glRef.current;
      const prog = progRef.current;
      if (!gl || !prog) return;

      const t = (performance.now() - startRef.current) / 1000;

      gl.uniform1f(gl.getUniformLocation(prog, 'iTime'), t);
      gl.uniform2f(gl.getUniformLocation(prog, 'iResolution'), gl.canvas.width, gl.canvas.height);
      gl.uniform1f(gl.getUniformLocation(prog, 'iForce'), paramValues['media-param-force'] ?? 1);
      gl.uniform1f(gl.getUniformLocation(prog, 'iForce2'), paramValues['media-param-force-2'] ?? 5);
      gl.uniform1f(gl.getUniformLocation(prog, 'iNbItems'), paramValues['media-param-complexity'] ?? 1);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isOpen, fragSrc, paramValues]);

  const updateParam = useCallback((paramId: string, displayName: string, value: number) => {
    setParamValues(prev => ({ ...prev, [paramId]: value }));

    // POST to ELM using the display name (e.g., "Force", "Speed-Ex", "Zoom X")
    if (shaderPreviewSlotId) {
      postMediaParameter(shaderPreviewSlotId, displayName, value).catch(() => {});
    }
  }, [shaderPreviewSlotId]);

  const close = useCallback(() => {
    dispatch({ type: 'CLOSE_SHADER_PREVIEW' });
  }, [dispatch]);

  const onBackdropClick = useCallback((e: MouseEvent) => {
    if (e.target === e.currentTarget) close();
  }, [close]);

  if (!isOpen) return null;

  // Filter to only the params our shader uses
  const tuneableParams = params.filter(p => p.name.id in PARAM_MAP);

  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px',
      }}
    >
      <div style={{
        width: 'min(720px, 96vw)', maxHeight: '92vh', overflow: 'auto',
        background: 'var(--app-surface)', border: '1px solid var(--app-border2)',
        borderRadius: '16px', padding: '16px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700 }}>
            {slot?.name || `Slot ${shaderPreviewSlotId}`}
          </span>
          <md-outlined-button onClick={close}>Close</md-outlined-button>
        </div>

        {/* WebGL Preview */}
        {fragSrc ? (
          <canvas
            ref={canvasRef}
            style={{
              width: '100%', height: '280px',
              borderRadius: '10px', background: '#000',
              marginBottom: '16px',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '200px',
            borderRadius: '10px', background: 'var(--app-surface3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--app-muted)', fontSize: '13px', marginBottom: '16px',
          }}>
            No local preview available for this shader
          </div>
        )}

        {/* Parameter Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* ELM parameters */}
          {tuneableParams.map(param => (
            <div key={param.name.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={labelStyle}>{param.name.value}</span>
                <span style={{ ...labelStyle, color: 'var(--app-accent)' }}>
                  {(paramValues[param.name.id] ?? param.value).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.max > 100 ? 1 : 0.1}
                value={paramValues[param.name.id] ?? param.value}
                onInput={(e) => updateParam(param.name.id, param.name.value, parseFloat((e.target as HTMLInputElement).value))}
                style={sliderStyle}
              />
            </div>
          ))}

          {/* Show all other params too, for power users */}
          {params.filter(p => !(p.name.id in PARAM_MAP)).length > 0 && (
            <>
              <div style={{ ...labelStyle, color: 'var(--app-muted)', marginTop: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Other Parameters
              </div>
              {params.filter(p => !(p.name.id in PARAM_MAP)).map(param => (
                <div key={param.name.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={labelStyle}>{param.name.value}</span>
                    <span style={{ ...labelStyle, color: 'var(--app-muted)' }}>
                      {(paramValues[param.name.id] ?? param.value).toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.max > 100 ? 1 : 0.1}
                    value={paramValues[param.name.id] ?? param.value}
                    onInput={(e) => updateParam(param.name.id, param.name.value, parseFloat((e.target as HTMLInputElement).value))}
                    style={sliderStyle}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: Record<string, string> = {
  fontSize: '12px',
  fontFamily: 'var(--font-mono, monospace)',
  color: 'var(--app-text)',
};

const sliderStyle: Record<string, string> = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  background: 'var(--app-surface3)',
  outline: 'none',
  cursor: 'pointer',
};
