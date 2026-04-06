require('dotenv').config();

/**
 * Production server for Stage Controller.
 * Serves the built app from dist/ and proxies /elm/* to the local ELM server.
 * Password-protected via cookie-based session.
 *
 * Usage:
 *   node serve.cjs
 *
 * Environment variables (optional):
 *   PORT          - Port to listen on (default: 4200)
 *   ELM_HOST      - ELM server host (default: localhost)
 *   ELM_PORT      - ELM server port (default: 8057)
 *   STAGE_PASSWORD - Password for the interface (default: warhorse)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4200', 10);
const ELM_HOST = process.env.ELM_HOST || 'localhost';
const ELM_PORT = parseInt(process.env.ELM_PORT || '8057', 10);
const PASSWORD = process.env.STAGE_PASSWORD || 'warhorse';

const DIST_DIR = path.join(__dirname, 'dist');

// Generate a random secret for signing cookies each server start
const COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'stage-auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function makeToken() {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(PASSWORD).digest('hex');
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [key, ...val] = c.trim().split('=');
    cookies[key] = val.join('=');
  });
  return cookies;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] === makeToken();
}

const LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stage Control</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Geist', system-ui, sans-serif;
      background: #000;
      color: #ededed;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login {
      width: 300px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }
    h1 {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .sub { font-size: 13px; color: #666; }
    input {
      font-family: inherit;
      font-size: 14px;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.15);
      background: #0a0a0a;
      color: #ededed;
      outline: none;
      width: 100%;
      text-align: center;
    }
    input:focus { border-color: rgba(255,255,255,0.3); }
    button {
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      padding: 10px;
      border-radius: 8px;
      border: none;
      background: #ededed;
      color: #000;
      cursor: pointer;
      transition: opacity 0.1s;
    }
    button:hover { opacity: 0.85; }
    .error { color: #ee0000; font-size: 13px; }
  </style>
</head>
<body>
  <form class="login" method="POST" action="/auth/login">
    <h1>Stage Control</h1>
    <p class="sub">Enter password to continue</p>
    <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" />
    <button type="submit">Enter</button>
    <ERROR_PLACEHOLDER>
  </form>
</body>
</html>`;

function serveLogin(res, error) {
  const html = LOGIN_PAGE.replace(
    '<ERROR_PLACEHOLDER>',
    error ? '<p class="error">Incorrect password</p>' : ''
  );
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url.split('?')[0]);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for any missing file
      fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, indexData) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(indexData);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function proxyToElm(req, res) {
  const options = {
    hostname: ELM_HOST,
    port: ELM_PORT,
    path: req.url, // /elm/... passes through as-is
    method: req.method,
    headers: { ...req.headers, host: `${ELM_HOST}:${ELM_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`Proxy error: ${err.message}`);
    res.writeHead(502);
    res.end('ELM server unreachable');
  });

  req.pipe(proxyReq, { end: true });
}

// --- Advatek Controller Monitoring ---
const { ControllerMonitor } = require('./src/advatek.cjs');

const controllerList = (process.env.DIMLY_CONTROLLERS || '2.0.0.21:T8-S Unit 1')
  .split(',')
  .map(entry => {
    const [ip, ...labelParts] = entry.trim().split(':');
    return { ip: ip.trim(), label: labelParts.join(':').trim() || ip.trim() };
  })
  .filter(c => c.ip);

const monitor = new ControllerMonitor(controllerList, {
  pollInterval: parseInt(process.env.DIMLY_POLL_INTERVAL || '30000'),
  connectTimeout: parseInt(process.env.DIMLY_CONNECT_TIMEOUT || '5000'),
});

monitor.start();
console.log(`  [advatek] Monitoring ${controllerList.length} controller(s): ${controllerList.map(c => c.ip).join(', ')}`);

// --- Scene Engine ---
const { SceneEngine } = require('./src/scheduler.cjs');
const scenesPath = process.env.DIMLY_SCENES_PATH || path.join(__dirname, 'scenes.json');
const engine = new SceneEngine(scenesPath, `http://${ELM_HOST}:${ELM_PORT}`);
engine.start();

// --- ELM FPS Logger (24-hour average) ---
const fpsReadings = [];
const FPS_SAMPLE_INTERVAL = 5 * 60 * 1000; // sample every 5 minutes
const FPS_LOG_INTERVAL = 24 * 60 * 60 * 1000; // log every 24 hours

function sampleElmFps() {
  http.get(`http://${ELM_HOST}:${ELM_PORT}/elm/settings`, { timeout: 5000 }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const settings = JSON.parse(data);
        if (settings.outputRate !== undefined) {
          fpsReadings.push({ rate: settings.outputRate, time: Date.now() });
        }
      } catch (_) {}
    });
  }).on('error', () => {});
}

function logDailyFps() {
  if (fpsReadings.length === 0) return;
  const sum = fpsReadings.reduce((a, r) => a + r.rate, 0);
  const avg = (sum / fpsReadings.length).toFixed(1);
  const min = Math.min(...fpsReadings.map(r => r.rate));
  const max = Math.max(...fpsReadings.map(r => r.rate));
  const logLine = `[${new Date().toISOString()}] ELM FPS — avg: ${avg}, min: ${min}, max: ${max}, samples: ${fpsReadings.length}\n`;
  console.log(logLine.trim());
  try {
    fs.appendFileSync(path.join(__dirname, 'logs', 'fps.log'), logLine);
  } catch (_) {}
  fpsReadings.length = 0; // reset for next 24h
}

setInterval(sampleElmFps, FPS_SAMPLE_INTERVAL);
setInterval(logDailyFps, FPS_LOG_INTERVAL);
sampleElmFps(); // initial sample

const server = http.createServer((req, res) => {
  // Health check — no auth required (used by watchdog)
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  // --- Advatek health API (requires auth) ---
  const cleanUrl = req.url.split('?')[0].replace(/\/$/, '');
  if (cleanUrl === '/api/health/controllers' && req.method === 'GET') {
    if (!isAuthenticated(req)) { res.writeHead(401); res.end('Unauthorized'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(monitor.getAll()));
    return;
  }

  if (req.url.startsWith('/api/health/controllers/') && req.method === 'GET') {
    if (!isAuthenticated(req)) { res.writeHead(401); res.end('Unauthorized'); return; }
    const ip = req.url.replace('/api/health/controllers/', '').split('?')[0];
    const data = monitor.getOne(ip);
    if (!data) { res.writeHead(404); res.end(JSON.stringify({ error: 'Controller not found' })); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  if (req.url === '/api/health/controllers/refresh' && req.method === 'POST') {
    if (!isAuthenticated(req)) { res.writeHead(401); res.end('Unauthorized'); return; }
    controllerList.forEach(c => monitor._poll(c));
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(monitor.getAll()));
    }, 3000);
    return;
  }

  // --- Scene Engine API (no auth — local access for curl testing) ---
  if (cleanUrl === '/api/scenes' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(engine.config.scenes));
    return;
  }

  if (cleanUrl === '/api/scenes/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(engine.getStatus()));
    return;
  }

  if (req.url.startsWith('/api/scenes/') && req.url.includes('/activate') && req.method === 'POST') {
    const parts = req.url.split('?')[0].split('/');
    const sceneId = parts[3]; // /api/scenes/{id}/activate
    const urlParams = new URLSearchParams(req.url.split('?')[1] || '');
    const duration = parseInt(urlParams.get('duration') || '0');
    engine.activateScene(sceneId, duration).then(result => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    });
    return;
  }

  if (cleanUrl === '/api/scenes/reload' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(engine.reloadConfig()));
    return;
  }

  if (cleanUrl === '/api/triggers' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(engine.config.triggers));
    return;
  }

  if (req.url.startsWith('/api/triggers/') && req.url.includes('/fire') && req.method === 'POST') {
    const triggerId = req.url.split('?')[0].split('/')[3]; // /api/triggers/{id}/fire
    const result = engine.triggerManual(triggerId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (cleanUrl === '/api/triggers/override/clear' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(engine.clearManualOverride()));
    return;
  }

  if (cleanUrl === '/api/astro' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(engine.getAstroTimes()));
    return;
  }

  // Handle login form submission
  if (req.url === '/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const pw = params.get('password');
      if (pw === PASSWORD) {
        res.writeHead(302, {
          'Set-Cookie': `${COOKIE_NAME}=${makeToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
          'Location': '/',
        });
        res.end();
      } else {
        serveLogin(res, true);
      }
    });
    return;
  }

  // ELM proxy — still requires auth
  if (req.url.startsWith('/elm/')) {
    if (!isAuthenticated(req)) {
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }
    proxyToElm(req, res);
    return;
  }

  // All other requests require auth
  if (!isAuthenticated(req)) {
    serveLogin(res, false);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Stage Controller running at:`);
  console.log(`    http://localhost:${PORT}/`);
  console.log(`    http://0.0.0.0:${PORT}/`);
  console.log(`\n  ELM proxy -> ${ELM_HOST}:${ELM_PORT}`);
  console.log(`  Password protected (set STAGE_PASSWORD env var to change)\n`);
});
