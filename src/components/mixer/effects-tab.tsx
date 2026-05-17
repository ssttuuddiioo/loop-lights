import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { useAppState } from '../../state/context';
import { postStageMedia } from '../../api/stages';
import { getMediaParameters, postMediaParameter } from '../../api/media';
import type { MediaParameter } from '../../api/media';
import { MOCK_ENABLED } from '../../api/mock';

// ─── GLSL shared pieces ────────────────────────────────────────────

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

const VERT_SRC = `attribute vec2 pos; void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

// ─── Shader presets ────────────────────────────────────────────────

interface ShaderPreset {
  name: string;
  key: string;       // matches ELM media slot name (lowercase)
  fragSrc: string;
}

const PRESETS: ShaderPreset[] = [
  {
    name: 'Gradient Ramp',
    key: 'gradient ramp',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Plasma',
    key: 'plasma',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Color Wash',
    key: 'color wash',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Strobe',
    key: 'strobe',
    fragSrc: UNIFORMS + HSV2RGB + `
void main() {
    float hue1 = (iForce - 1.0) / 9.0;
    float hue2 = (iForce2 - 1.0) / 9.0;
    vec3 color1 = hsv2rgb(hue1, 1.0, 1.0);
    vec3 color2 = hsv2rgb(hue2, 1.0, 1.0);
    float rate = max(iNbItems, 1.0) * 2.0;
    float t = step(0.5, fract(iTime * rate));
    vec3 col = mix(color1, color2, t);
    gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Pulse',
    key: 'pulse',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Rainbow',
    key: 'rainbow',
    fragSrc: UNIFORMS + HSV2RGB + `
void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    float startHue = (iForce - 1.0) / 9.0;
    float range = (iForce2 - 1.0) / 9.0 + 0.5;
    float bands = max(iNbItems, 1.0);
    float t = fract(uv.y * bands - iTime * 0.15);
    float hue = fract(startHue + t * range);
    vec3 col = hsv2rgb(hue, 1.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
}`,
  },
  {
    name: 'Checker',
    key: 'checker',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Fire',
    key: 'fire',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Scan',
    key: 'scan',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Spiral',
    key: 'spiral',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Ripple',
    key: 'ripple',
    fragSrc: UNIFORMS + HSV2RGB + `
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
}`,
  },
  {
    name: 'Sparkle',
    key: 'sparkle',
    fragSrc: UNIFORMS + `
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
}`,
  },
];

// ─── WebGL helpers ─────────────────────────────────────────────────

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

const PARAM_MAP: Record<string, string> = {
  'media-param-force': 'iForce',
  'media-param-force-2': 'iForce2',
  'media-param-nb-items': 'iNbItems',
  'media-param-speed': 'iSpeed',
};

// ─── EffectsTab component ──────────────────────────────────────────

export function EffectsTab() {
  const { stages, mediaSlots } = useAppState();

  const [activePreset, setActivePreset] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [params, setParams] = useState<MediaParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, number>>({
    'media-param-force': 1,
    'media-param-force-2': 5,
    'media-param-nb-items': 1,
    'media-param-speed': 5,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const progRef = useRef<WebGLProgram | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);

  const preset = PRESETS[activePreset];

  // Find the ELM media slot that matches the active preset
  const matchingSlot = mediaSlots.find(s =>
    s.name.toLowerCase().includes(preset.key)
  );

  // Fetch ELM parameters when slot is found
  useEffect(() => {
    if (!matchingSlot) return;
    getMediaParameters(matchingSlot.id).then(p => {
      setParams(p);
      const vals: Record<string, number> = {};
      p.forEach(param => { vals[param.name.id] = param.value; });
      setParamValues(vals);
    }).catch(() => {});
  }, [matchingSlot?.id]);

  // Set up WebGL when preset changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return;
    glRef.current = gl;

    const prog = gl.createProgram();
    if (!prog) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, preset.fragSrc);
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
  }, [activePreset]);

  // Render loop
  useEffect(() => {
    function frame() {
      const gl = glRef.current;
      const prog = progRef.current;
      if (!gl || !prog) return;

      const speed = (paramValues['media-param-speed'] ?? 5) / 5;
      const t = (performance.now() - startRef.current) / 1000 * speed;

      gl.uniform1f(gl.getUniformLocation(prog, 'iTime'), t);
      gl.uniform2f(gl.getUniformLocation(prog, 'iResolution'), gl.canvas.width, gl.canvas.height);
      gl.uniform1f(gl.getUniformLocation(prog, 'iForce'), paramValues['media-param-force'] ?? 1);
      gl.uniform1f(gl.getUniformLocation(prog, 'iForce2'), paramValues['media-param-force-2'] ?? 5);
      gl.uniform1f(gl.getUniformLocation(prog, 'iNbItems'), paramValues['media-param-nb-items'] ?? 1);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paramValues, activePreset]);

  // Apply shader to target stage(s)
  const applyToStages = useCallback((presetIndex: number) => {
    const p = PRESETS[presetIndex];
    const slot = mediaSlots.find(s => s.name.toLowerCase().includes(p.key));
    if (!slot || MOCK_ENABLED) return;

    if (target === null) {
      stages.forEach(s => postStageMedia(s.id, slot.id).catch(() => {}));
    } else {
      const s = stages[target];
      if (s) postStageMedia(s.id, slot.id).catch(() => {});
    }
  }, [stages, mediaSlots, target]);

  // Update parameter on ELM
  const updateParam = useCallback((paramId: string, displayName: string, value: number) => {
    setParamValues(prev => ({ ...prev, [paramId]: value }));
    if (matchingSlot) {
      postMediaParameter(matchingSlot.id, displayName, value).catch(() => {});
    }
  }, [matchingSlot]);

  const tuneableParams = params.filter(p => p.name.id in PARAM_MAP);
  const otherParams = params.filter(p => !(p.name.id in PARAM_MAP));

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', overflow: 'auto' }}>
      {/* Preset buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
        {PRESETS.map((p, i) => (
          <button
            key={p.key}
            onClick={() => setActivePreset(i)}
            style={{
              all: 'unset', cursor: 'pointer',
              textAlign: 'center',
              padding: '10px 4px',
              fontSize: '10px', fontFamily: 'var(--font-sans)', fontWeight: 510,
              borderRadius: '6px',
              border: `1px solid ${activePreset === i ? 'var(--app-accent)' : 'rgba(255,255,255,0.08)'}`,
              background: activePreset === i ? 'rgba(94,106,210,0.12)' : 'transparent',
              color: activePreset === i ? 'var(--app-accent)' : 'var(--app-muted)',
              transition: 'all 0.15s',
            }}
          >{p.name}</button>
        ))}
      </div>

      {/* WebGL Preview */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%', height: '140px',
          borderRadius: '8px', background: '#000',
          flexShrink: 0,
        }}
      />

      {/* Parameter sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {tuneableParams.map(param => (
          <div key={param.name.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-sans)', color: 'var(--app-text-secondary)' }}>
                {param.name.value}
              </span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--app-accent)' }}>
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
              style={{
                width: '100%', height: '4px', borderRadius: '2px',
                background: 'var(--app-surface3)', outline: 'none',
                cursor: 'pointer', accentColor: 'var(--app-accent)',
              }}
            />
          </div>
        ))}

        {/* Fallback sliders when ELM params not loaded yet */}
        {tuneableParams.length === 0 && (
          <>
            <ParamSlider label="Color 1 Hue" paramId="media-param-force" min={1} max={10} step={0.1} value={paramValues['media-param-force'] ?? 1} onChange={(v) => setParamValues(prev => ({ ...prev, 'media-param-force': v }))} />
            <ParamSlider label="Color 2 Hue" paramId="media-param-force-2" min={1} max={10} step={0.1} value={paramValues['media-param-force-2'] ?? 5} onChange={(v) => setParamValues(prev => ({ ...prev, 'media-param-force-2': v }))} />
            <ParamSlider label="Density" paramId="media-param-nb-items" min={0} max={10} step={1} value={paramValues['media-param-nb-items'] ?? 1} onChange={(v) => setParamValues(prev => ({ ...prev, 'media-param-nb-items': v }))} />
            <ParamSlider label="Speed" paramId="media-param-speed" min={0} max={10} step={0.1} value={paramValues['media-param-speed'] ?? 5} onChange={(v) => setParamValues(prev => ({ ...prev, 'media-param-speed': v }))} />
          </>
        )}

        {/* Other ELM params */}
        {otherParams.length > 0 && (
          <>
            <div style={{ fontSize: '9px', color: 'var(--app-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Other
            </div>
            {otherParams.map(param => (
              <div key={param.name.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-sans)', color: 'var(--app-text-secondary)' }}>
                    {param.name.value}
                  </span>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--app-muted)' }}>
                    {(paramValues[param.name.id] ?? param.value).toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={param.min} max={param.max}
                  step={param.max > 100 ? 1 : 0.1}
                  value={paramValues[param.name.id] ?? param.value}
                  onInput={(e) => updateParam(param.name.id, param.name.value, parseFloat((e.target as HTMLInputElement).value))}
                  style={{
                    width: '100%', height: '4px', borderRadius: '2px',
                    background: 'var(--app-surface3)', outline: 'none',
                    cursor: 'pointer',
                  }}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Stage selector + Apply button */}
      <div style={{
        background: 'var(--app-surface2)', borderRadius: '10px',
        padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ fontSize: '10px', color: 'var(--app-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Select Stages
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <TargetChip label="All Stages" active={target === null} accent onClick={() => setTarget(null)} />
          {stages.map((s, i) => (
            <TargetChip key={s.id} label={s.name} active={target === i} color={s.color} onClick={() => setTarget(i)} />
          ))}
        </div>
        <button
          onClick={() => applyToStages(activePreset)}
          disabled={!matchingSlot}
          style={{
            all: 'unset', cursor: matchingSlot ? 'pointer' : 'not-allowed',
            textAlign: 'center',
            padding: '10px',
            fontSize: '12px', fontFamily: 'var(--font-sans)', fontWeight: 590,
            borderRadius: '6px',
            background: matchingSlot ? 'var(--app-accent)' : 'var(--app-surface3)',
            color: matchingSlot ? '#fff' : 'var(--app-muted)',
            transition: 'all 0.15s',
            opacity: matchingSlot ? 1 : 0.5,
          }}
        >
          Apply {preset.name} to {target === null ? 'All Stages' : (stages[target]?.name || 'Stage')}
        </button>
      </div>

      {/* Status */}
      {!matchingSlot && (
        <div style={{
          fontSize: '10px', color: 'var(--app-muted)', fontStyle: 'italic',
          padding: '8px', background: 'var(--app-surface2)', borderRadius: '6px',
          textAlign: 'center',
        }}>
          Shader "{preset.name}" not found in ELM media bin.
          Load the .frag file into a media slot first.
        </div>
      )}
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────

function TargetChip({ label, active, accent, color, onClick }: {
  label: string; active: boolean; accent?: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 510,
      padding: '7px 10px', borderRadius: '9999px',
      background: active
        ? (accent ? 'var(--app-accent)' : 'rgba(255,255,255,0.08)')
        : 'transparent',
      border: `1px solid ${active
        ? (accent ? 'var(--app-accent)' : 'rgba(255,255,255,0.12)')
        : 'rgba(255,255,255,0.05)'}`,
      color: active
        ? (accent ? '#fff' : 'var(--app-text)')
        : 'var(--app-text-quaternary)',
      transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', gap: '4px',
    }}>
      {color && (
        <span style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: color, opacity: active ? 1 : 0.4, flexShrink: 0,
        }} />
      )}
      {label}
    </button>
  );
}

function ParamSlider({ label, min, max, step, value, onChange }: {
  label: string; paramId: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-sans)', color: 'var(--app-text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--app-accent)' }}>{value.toFixed(1)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onInput={(e) => onChange(parseFloat((e.target as HTMLInputElement).value))}
        style={{
          width: '100%', height: '4px', borderRadius: '2px',
          background: 'var(--app-surface3)', outline: 'none',
          cursor: 'pointer', accentColor: 'var(--app-accent)',
        }}
      />
    </div>
  );
}
