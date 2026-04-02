import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import crypto from 'crypto'

const PASSWORD = process.env.STAGE_PASSWORD || 'warhorse';
const COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'stage-auth';

function makeToken() {
  return crypto.createHmac('sha256', COOKIE_SECRET).update(PASSWORD).digest('hex');
}

function parseCookies(cookieHeader: string | undefined) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [key, ...val] = c.trim().split('=');
    cookies[key] = val.join('=');
  });
  return cookies;
}

const LOGIN_HTML = `<!DOCTYPE html>
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
      background: #000; color: #ededed;
      min-height: 100vh; display: flex;
      align-items: center; justify-content: center;
    }
    .login { width: 300px; display: flex; flex-direction: column; gap: 16px; text-align: center; }
    h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
    .sub { font-size: 13px; color: #666; }
    input {
      font-family: inherit; font-size: 14px; padding: 10px 14px;
      border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
      background: #0a0a0a; color: #ededed; outline: none; width: 100%; text-align: center;
    }
    input:focus { border-color: rgba(255,255,255,0.3); }
    button {
      font-family: inherit; font-size: 14px; font-weight: 500; padding: 10px;
      border-radius: 8px; border: none; background: #ededed; color: #000;
      cursor: pointer; transition: opacity 0.1s;
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
  </form>
</body>
</html>`;

export default defineConfig({
  plugins: [preact()],
  server: {
    port: 4200,
    strictPort: true,
    proxy: {
      '/elm': {
        target: process.env.VITE_ELM_URL || 'http://localhost:8057',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
  // @ts-ignore — Vite plugin API
  configureServer(server: any) {
    server.middlewares.use('/auth/login', (req: any, res: any) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: string) => { body += chunk; });
        req.on('end', () => {
          const params = new URLSearchParams(body);
          const pw = params.get('password');
          if (pw === PASSWORD) {
            res.writeHead(302, {
              'Set-Cookie': `${COOKIE_NAME}=${makeToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
              'Location': '/',
            });
            res.end();
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(LOGIN_HTML.replace('</form>', '<p class="error">Incorrect password</p></form>'));
          }
        });
      }
    });

    server.middlewares.use((req: any, res: any, next: any) => {
      // Skip auth for login route and HMR
      if (req.url?.startsWith('/auth/') || req.url?.startsWith('/@') || req.url?.startsWith('/node_modules')) {
        return next();
      }
      const cookies = parseCookies(req.headers.cookie);
      if (cookies[COOKIE_NAME] === makeToken()) {
        return next();
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(LOGIN_HTML);
    });
  },
})
