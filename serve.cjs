/**
 * Production server for Stage Controller.
 * Serves the built app from dist/ and proxies /elm/* to the local ELM server.
 *
 * Usage:
 *   node serve.js
 *
 * Environment variables (optional):
 *   PORT          - Port to listen on (default: 4200)
 *   ELM_HOST      - ELM server host (default: localhost)
 *   ELM_PORT      - ELM server port (default: 8057)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '4200', 10);
const ELM_HOST = process.env.ELM_HOST || 'localhost';
const ELM_PORT = parseInt(process.env.ELM_PORT || '8057', 10);

const DIST_DIR = path.join(__dirname, 'dist');

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
  let filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url);

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

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/elm/')) {
    proxyToElm(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Stage Controller running at:`);
  console.log(`    http://localhost:${PORT}/`);
  console.log(`    http://0.0.0.0:${PORT}/`);
  console.log(`\n  ELM proxy -> ${ELM_HOST}:${ELM_PORT}`);
  console.log(`\n  Open this URL on any iPad, phone, or laptop on the network.\n`);
});
