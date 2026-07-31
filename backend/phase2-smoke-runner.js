#!/usr/bin/env node

/**
 * phase2-smoke-runner.js — Read-only Phase 2 auth smoke for project/task APIs.
 *
 * Reads SMOKE_ADMIN_JWT from environment, starts backend locally,
 * calls GET /api/projects (protected read-only). No DB writes.
 *
 * Rules:
 *  - Do not generate JWT.
 *  - Do not print JWT or secrets.
 *  - Do not modify requireAuth/requireAdmin/RLS/handlers.
 *  - Do not use SUPABASE_SERVICE_ROLE_KEY as bearer.
 *  - Do not write DB.
 *  - Stop at first blocker.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = process.env.SMOKE_PORT || 3999;
const TOKEN = process.env.SMOKE_ADMIN_JWT;
const JWT_SECRET = process.env.JWT_SECRET || 'smoke-dummy-secret';
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'smoke-dummy-anon-key';

// ─── Blocker 1: SMOKE_ADMIN_JWT must exist ──────────────────────────────
if (!TOKEN) {
  console.log('BLOCKED: SMOKE_ADMIN_JWT SECRET_MISSING');
  process.exit(1);
}

function request(method, urlPath, bearer) {
  return new Promise((resolve, reject) => {
    const opts = {
      host: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method,
      timeout: 8000,
      headers: {},
    };
    if (bearer) {
      opts.headers['Authorization'] = `Bearer ${bearer}`;
    }
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}

// ─── Start backend ──────────────────────────────────────────────────────
const server = spawn('node', [path.join(__dirname, 'server.js')], {
  env: { ...process.env, PORT: String(PORT), JWT_SECRET, SUPABASE_URL, SUPABASE_KEY },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOut = '';
server.stdout.on('data', (d) => (serverOut += d));
server.stderr.on('data', (d) => (serverOut += d));

function cleanup(code, msg) {
  try { server.kill(); } catch (_) {}
  if (msg) console.log(msg);
  process.exit(code);
}

server.on('error', (err) => {
  console.log('BLOCKED: could not start backend — ' + err.message);
  process.exit(1);
});

// ─── Wait for backend ready, then call protected endpoint ────────────────
async function main() {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      // First confirm health (unauthenticated)
      const health = await request('GET', '/api/health');
      if (health.status !== 200) continue;

      // Health OK — now try protected read endpoint
      console.log('Health OK, probing GET /api/projects with SMOKE_ADMIN_JWT …');
      const resp = await request('GET', '/api/projects', TOKEN);

      if (resp.status === 200) {
        // Parse body to confirm it's a valid project list (array)
        let data;
        try { data = JSON.parse(resp.body); } catch (_) { data = null; }
        if (Array.isArray(data)) {
          console.log(`PASS: GET /api/projects → 200, returned ${data.length} project(s)`);
          cleanup(0);
          return;
        }
        // Response is 200 but body is unexpected format
        console.log('PASS: GET /api/projects → 200 (unexpected body shape, but auth works)');
        cleanup(0);
        return;
      }

      if (resp.status === 401 || resp.status === 403) {
        console.log(`BLOCKED: protected endpoint returned ${resp.status} — token lacks admin role`);
        cleanup(1);
        return;
      }

      // Other status
      console.log(`BLOCKED: GET /api/projects → ${resp.status} ${resp.body.slice(0, 200)}`);
      cleanup(1);
      return;
    } catch (_) {
      // server not ready yet
    }
  }
  console.log('BLOCKED: backend did not become ready in time');
  console.log(serverOut.slice(-500));
  cleanup(1);
}

main();
