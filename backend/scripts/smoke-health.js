/**
 * smoke-health.js — Smallest read-only backend smoke test.
 * Starts backend locally (no DB writes), calls GET /api/health, expects 200.
 * Exits non-zero on failure. No secrets printed.
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = process.env.SMOKE_PORT || 3999;
const JWT_SECRET = process.env.JWT_SECRET || 'smoke-dummy-secret';
// Dummy Supabase vars so _lib.js can construct its client without a real DB.
// The health endpoint performs no DB access, so no real connection is made.
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'smoke-dummy-anon-key';

function request(method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: PORT, path: urlPath, method, timeout: 5000 },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

const server = spawn('node', [path.join(__dirname, '..', 'server.js')], {
  env: { ...process.env, PORT: String(PORT), JWT_SECRET, SUPABASE_URL, SUPABASE_KEY },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOut = '';
server.stdout.on('data', (d) => (serverOut += d));
server.stderr.on('data', (d) => (serverOut += d));

function cleanup(code) {
  try { server.kill(); } catch (_) {}
  process.exit(code);
}

// Wait for server to be ready, then probe health.
async function main() {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await request('GET', '/api/health');
      if (res.status === 200) {
        console.log('SMOKE PASS: GET /api/health → 200');
        cleanup(0);
        return;
      } else {
        console.error(`SMOKE FAIL: GET /api/health → ${res.status}`);
        cleanup(1);
        return;
      }
    } catch (_) {
      // server not ready yet
    }
  }
  console.error('SMOKE FAIL: backend did not become ready in time');
  console.error(serverOut.slice(-500));
  cleanup(1);
}

server.on('error', (err) => {
  console.error('SMOKE FAIL: could not start backend:', err.message);
  cleanup(1);
});

main();
