import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useAppState, useAppDispatch } from '../../state/context';
import { getMediaParameters, postMediaParameter } from '../../api/media';
import type { MediaParameter } from '../../api/media';
import '@material/web/button/outlined-button.js';

// --- GLSL source for our custom shaders ---
const HSV2RGB = `
vec3 hsv2rgb(float h, float s, float v) {
    vec3 c = vec3(h, s, v);
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z * mix(vec3(1.0), rgb, c.y);
}
`;

const UNIFORMS = `
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform float iForce;
uniform float iForce2;
uniform float iNbItems;
`;

const GRADIENT_RAMP_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float tiles = max(iNbItems, 1.0);
    float t = fract(uv.y * tiles - iTime * 0.2);
    float blend = 1.0 - abs(2.0 * t - 1.0);
    vec3 col = mix(color1, color2, blend);
    gl_FragColor = vec4(col, 1.0);
}
`;

const PLASMA_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float freq = max(iNbItems, 1.0) * 0.25;
    float t = iTime * 0.4;
    float v1 = sin(uv.x * freq * 10.0 + t);
    float v2 = sin(uv.y * freq * 8.0 - t * 0.7);
    float v3 = sin((uv.x + uv.y) * freq * 6.0 + t * 0.5);
    vec2 center = uv - 0.5;
    float dist = length(center);
    float v4 = sin(dist * freq * 12.0 - t * 0.9);
    float plasma = (v1 + v2 + v3 + v4) * 0.25 * 0.5 + 0.5;
    vec3 col = mix(color1, color2, plasma);
    gl_FragColor = vec4(col, 1.0);
}
`;

const COLOR_WASH_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float baseHue = (iForce - 1.0) / 9.0;
    float spread = (iForce2 - 1.0) / 9.0 * 0.5;
    float wave = max(iNbItems, 1.0);
    float t = iTime * 0.08;
    float grad = (uv.x + uv.y) * 0.5;
    float wobble = 0.0;
    if (wave > 1.5) {
        float w = wave * 0.15;
        wobble += sin(uv.x * w * 6.0 + t * 2.0) * 0.12;
        wobble += sin(uv.y * w * 5.0 - t * 1.5) * 0.10;
        wobble += sin((uv.x - uv.y) * w * 3.0 + t) * 0.08;
    }
    float hue = fract(baseHue + grad * spread + wobble + t);
    vec3 col = hsv2rgb(hue, 1.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
}
`;

const VERT_SRC = `attribute vec2 pos; void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

const STROBE_SRC = UNIFORMS + HSV2RGB + `
void main() {
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float rate = max(iNbItems, 1.0) * 2.0;
    float t = step(0.5, fract(iTime * rate));
    vec3 col = mix(color1, color2, t);
    gl_FragColor = vec4(col, 1.0);
}
`;

const PULSE_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float rate = max(iNbItems, 1.0) * 0.3;
    float phase = (uv.x + uv.y) * 3.14;
    float t = 0.5 + 0.5 * sin(iTime * rate + phase);
    vec3 col = mix(color1, color2, t);
    gl_FragColor = vec4(col, 1.0);
}
`;

const RAINBOW_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float startHue = (iForce - 1.0) / 9.0;
    float range = (iForce2 - 1.0) / 9.0 + 0.5;
    float bands = max(iNbItems, 1.0);
    float t = fract(uv.y * bands - iTime * 0.15);
    float hue = fract(startHue + t * range);
    vec3 col = hsv2rgb(hue, 1.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
}
`;

const CHECKER_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float grid = max(iNbItems, 1.0) * 2.0;
    vec2 cell = floor((uv + vec2(0.0, iTime * 0.1)) * grid);
    float check = mod(cell.x + cell.y, 2.0);
    vec3 col = mix(color1, color2, check);
    gl_FragColor = vec4(col, 1.0);
}
`;

const FIRE_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 0.3);
    float turb = max(iNbItems, 1.0) * 0.5;
    float t = iTime * 1.5;
    float n = 0.0;
    n += sin(uv.x * turb * 4.0 + t * 1.1) * 0.3;
    n += sin(uv.x * turb * 8.0 - t * 0.9) * 0.2;
    n += sin((uv.x * 2.0 + uv.y) * turb * 3.0 + t * 1.3) * 0.25;
    float flame = clamp(1.0 - uv.y + n * 0.5, 0.0, 1.0);
    flame = pow(flame, 1.5);
    vec3 col = mix(color2, color1, flame);
    gl_FragColor = vec4(col, 1.0);
}
`;

const SCAN_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 0.15);
    float width = 1.0 / max(iNbItems, 1.0);
    float pos = fract(iTime * 0.3);
    float dist = abs(uv.y - pos);
    dist = min(dist, 1.0 - dist);
    float beam = smoothstep(width, 0.0, dist);
    vec3 col = mix(color2, color1, beam);
    gl_FragColor = vec4(col, 1.0);
}
`;

const SPIRAL_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 center = uv - 0.5;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float arms = max(iNbItems, 1.0);
    float angle = atan(center.y, center.x);
    float dist = length(center);
    float spiral = sin(angle * arms + dist * 12.0 - iTime * 2.0) * 0.5 + 0.5;
    vec3 col = mix(color1, color2, spiral);
    gl_FragColor = vec4(col, 1.0);
}
`;

const RIPPLE_SRC = UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec2 center = uv - 0.5;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float rings = max(iNbItems, 1.0);
    float dist = length(center);
    float ripple = sin(dist * rings * 12.0 - iTime * 3.0) * 0.5 + 0.5;
    vec3 col = mix(color1, color2, ripple);
    gl_FragColor = vec4(col, 1.0);
}
`;

const SPARKLE_SRC = UNIFORMS + `
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
` + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 0.15);
    float density = max(iNbItems, 1.0) * 2.0;
    vec2 cell = floor(uv * density);
    float rnd = hash(cell);
    float twinkle = sin(iTime * (2.0 + rnd * 4.0) + rnd * 6.28);
    twinkle = max(0.0, twinkle);
    twinkle = pow(twinkle, 4.0);
    float active = step(0.6, rnd);
    twinkle *= active;
    vec3 col = mix(color2, color1, twinkle);
    gl_FragColor = vec4(col, 1.0);
}
`;

// Map ELM media slot names to our custom shaders' GLSL source
const SHADER_SOURCES: Record<string, string> = {
  'gradient ramp': GRADIENT_RAMP_SRC,
  'gradient-ramp': GRADIENT_RAMP_SRC,
  'plasma': PLASMA_SRC,
  'color wash': COLOR_WASH_SRC,
  'color-wash': COLOR_WASH_SRC,
  'strobe': STROBE_SRC,
  'pulse': PULSE_SRC,
  'rainbow': RAINBOW_SRC,
  'checker': CHECKER_SRC,
  'fire': FIRE_SRC,
  'scan': SCAN_SRC,
  'spiral': SPIRAL_SRC,
  'ripple': RIPPLE_SRC,
  'sparkle': SPARKLE_SRC,
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
