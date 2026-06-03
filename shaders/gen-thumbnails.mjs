// Generate ELM media thumbnails (<name>.frag.thumb.jpg) for custom shaders.
//
// ELM only lists an effect in its media browser if a matching .frag.thumb.jpg
// exists next to the .frag (256x128). This renders each shader headlessly via
// the system Google Chrome (WebGL) and writes a JPG at the right size.
//
// macOS only (uses Chrome + `sips`). Run from the repo root:
//   node shaders/gen-thumbnails.mjs
// then commit the generated *.frag.thumb.jpg files. start.bat deploys them to
// C:\ProgramData\ELM\shaders on the venue PC.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SHADERS = dirname(fileURLToPath(import.meta.url));
const WORK = '/tmp/shader-thumbs';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 256, H = 128;

// Custom show shaders that need thumbnails. (uniform-test is a dev probe that
// redeclares uniforms and won't compile in this harness — intentionally omitted.)
const NAMES = [
  'gradient-ramp', 'plasma', 'color-wash', 'checker', 'fire', 'pulse',
  'rainbow', 'ripple', 'scan', 'sparkle', 'spiral', 'strobe',
];

// Representative uniform values — mid-animation, two distinct hues, moderate density.
const U = { iTime: 2.35, iForce: 2.0, iForce2: 7.0, iNbItems: 12.0 };
const VERT = `attribute vec2 pos; void main(){ gl_Position = vec4(pos,0.0,1.0); }`;

function html(frag) {
  const fragFull =
    `precision highp float;\n` +
    `uniform vec2 iResolution;\nuniform float iTime;\n` +
    `uniform float iForce;\nuniform float iForce2;\nuniform float iNbItems;\n` +
    frag + `\nvoid main(){ vec4 c = vec4(0.0); mainImage(c, gl_FragCoord.xy); gl_FragColor = vec4(c.rgb, 1.0); }`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#000}canvas{display:block;width:${W}px;height:${H}px}</style></head>
<body><canvas id="c" width="${W}" height="${H}"></canvas><script>
const cv=document.getElementById('c');
const gl=cv.getContext('webgl')||cv.getContext('experimental-webgl');
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
  if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(o));return null;}return o;}
if(!gl){document.title='NOGL';}else{
  const vs=sh(gl.VERTEX_SHADER,${JSON.stringify(VERT)});
  const fs=sh(gl.FRAGMENT_SHADER,${JSON.stringify(fragFull)});
  if(!vs||!fs){gl.clearColor(1,0,1,1);gl.clear(gl.COLOR_BUFFER_BIT);document.title='ERR';}else{
    const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.useProgram(p);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(p,'pos');gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.viewport(0,0,${W},${H});
    gl.uniform2f(gl.getUniformLocation(p,'iResolution'),${W},${H});
    gl.uniform1f(gl.getUniformLocation(p,'iTime'),${U.iTime});
    gl.uniform1f(gl.getUniformLocation(p,'iForce'),${U.iForce});
    gl.uniform1f(gl.getUniformLocation(p,'iForce2'),${U.iForce2});
    gl.uniform1f(gl.getUniformLocation(p,'iNbItems'),${U.iNbItems});
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.finish();document.title='OK';
  }
}
</script></body></html>`;
}

if (!existsSync(WORK)) mkdirSync(WORK, { recursive: true });
for (const name of NAMES) {
  const fragPath = join(SHADERS, name + '.frag');
  if (!existsSync(fragPath)) { console.log('SKIP (no frag):', name); continue; }
  const htmlPath = join(WORK, name + '.html');
  const pngPath = join(WORK, name + '.png');
  const jpgOut = join(SHADERS, name + '.frag.thumb.jpg');
  writeFileSync(htmlPath, html(readFileSync(fragPath, 'utf8')));
  execFileSync(CHROME, [
    '--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
    '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars',
    `--window-size=${W},${H}`, '--virtual-time-budget=1500',
    `--screenshot=${pngPath}`, 'file://' + htmlPath,
  ], { stdio: 'ignore' });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-z', String(H), String(W), pngPath, '--out', jpgOut], { stdio: 'ignore' });
  console.log('OK', name);
}
console.log('DONE');
