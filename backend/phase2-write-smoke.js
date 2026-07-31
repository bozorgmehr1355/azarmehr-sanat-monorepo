#!/usr/bin/env node
/**
 * phase2-write-smoke.js — Phase 2 disposable write smoke for projects API.
 *
 * Flow:
 *   1. Read env vars from .env
 *   2. Generate non-production admin JWT (in-memory only)
 *   3. Start backend with all real env vars
 *   4. GET /api/health → confirm server is up
 *   5. POST /api/projects with title PHASE2_SMOKE_DISPOSABLE_<ts>
 *   6. GET /api/projects → confirm created project appears
 *   7. DELETE /api/projects → remove the disposable project
 *   8. GET /api/projects → confirm it is gone
 *
 * Stops at first error. No JWT printed/stored/committed.
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

// ─── Read .env ──────────────────────────────────────────────────────────
const envFile = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envFile, 'utf8');

function extract(key) {
  const m = envContent.match(new RegExp('^' + key + '=(.+)$', 'm'));
  return m ? m[1].trim() : '';
}

const JWT_SECRET = extract('JWT_SECRET');
const SUPABASE_URL = extract('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = extract('SUPABASE_SERVICE_ROLE_KEY');

if (!JWT_SECRET) { console.log('BLOCKED: JWT_SECRET not found in .env'); process.exit(1); }
if (!SUPABASE_URL) { console.log('BLOCKED: SUPABASE_URL not found in .env'); process.exit(1); }
if (!SUPABASE_SERVICE_ROLE_KEY) { console.log('BLOCKED: SUPABASE_SERVICE_ROLE_KEY not found in .env'); process.exit(1); }

// ─── Generate non-production admin JWT ──────────────────────────────────
const PORT = 3999;
const FAKE_USER_ID = '00000000-0000-0000-0000-000000000001'; // dummy UUID for me.id
const JWT_PAYLOAD = {
  id: FAKE_USER_ID,
  system_role: 'super_admin',
};
const SMOKE_ADMIN_JWT = jwt.sign(JWT_PAYLOAD, JWT_SECRET, { expiresIn: '1h' });

// ─── Helper: HTTP request ───────────────────────────────────────────────
function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const opts = {
      host: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method,
      timeout: 10000,
      headers: {
        'Authorization': 'Bearer ' + SMOKE_ADMIN_JWT,
        'Content-Type': 'application/json',
      },
    };
    if (bodyStr) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── Step results ──────────────────────────────────────────────────────
const steps = [];
function step(name, ok, detail) {
  steps.push({ name, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}: ${detail}`);
}

// ─── Start backend ──────────────────────────────────────────────────────
const server = spawn('node', [path.join(__dirname, 'server.js')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    JWT_SECRET,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_KEY: SUPABASE_SERVICE_ROLE_KEY,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOut = '';
server.stdout.on('data', (d) => (serverOut += d));
server.stderr.on('data', (d) => (serverOut += d));

function finish(code, msg) {
  try { server.kill(); } catch (_) {}
  if (msg) console.log('\n' + msg);
  process.exit(code);
}

server.on('error', (err) => {
  console.log('BLOCKED: could not start backend — ' + err.message);
  process.exit(1);
});

// ─── Main flow ──────────────────────────────────────────────────────────
const DISPOSABLE_TITLE = 'PHASE2_SMOKE_DISPOSABLE_' + Date.now();

async function main() {
  // Wait for ready
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const h = await request('GET', '/api/health');
      if (h.status === 200) break;
    } catch (_) { /* not ready */ }
    if (i === 39) {
      console.log('BLOCKED: backend did not become ready');
      finish(1);
    }
  }
  step('health', true, 'GET /api/health → 200');

  // Step 2: POST disposable project
  const postRes = await request('POST', '/api/projects', { title: DISPOSABLE_TITLE });
  if (postRes.status !== 201) {
    step('create', false, `POST /api/projects → ${postRes.status} ${postRes.body.slice(0, 200)}`);
    finish(1, 'BLOCKED at create');
  }
  let createdId;
  try { createdId = JSON.parse(postRes.body).id; } catch (_) {}
  if (!createdId) {
    step('create', false, 'POST returned 201 but no id in body: ' + postRes.body.slice(0, 200));
    finish(1, 'BLOCKED at create — no id');
  }
  step('create', true, `POST /api/projects → 201, id=${createdId}`);

  // Step 3: GET and verify the created project appears
  const listRes = await request('GET', '/api/projects');
  if (listRes.status !== 200) {
    step('list-after-create', false, `GET /api/projects → ${listRes.status}`);
    finish(1, 'BLOCKED at list-after-create');
  }
  let projects;
  try { projects = JSON.parse(listRes.body); } catch (_) { projects = []; }
  const found = projects.find((p) => p.id === createdId);
  if (!found) {
    step('verify-created', false, `project id=${createdId} not found in list`);
    finish(1, 'BLOCKED at verify-created');
  }
  step('verify-created', true, `project "${found.title}" found in list`);

  // Step 4: DELETE the disposable project
  const delRes = await request('DELETE', '/api/projects', { id: createdId });
  if (delRes.status !== 200) {
    step('delete', false, `DELETE /api/projects → ${delRes.status} ${delRes.body.slice(0, 200)}`);
    finish(1, 'BLOCKED at delete');
  }
  step('delete', true, `DELETE /api/projects → 200`);

  // Step 5: GET and verify cleanup
  const listRes2 = await request('GET', '/api/projects');
  if (listRes2.status !== 200) {
    step('list-after-delete', false, `GET /api/projects → ${listRes2.status}`);
    finish(1, 'BLOCKED at list-after-delete');
  }
  let projects2;
  try { projects2 = JSON.parse(listRes2.body); } catch (_) { projects2 = []; }
  const stillThere = projects2.find((p) => p.id === createdId);
  if (stillThere) {
    step('verify-cleanup', false, `project id=${createdId} still present after delete`);
    finish(1, 'BLOCKED at verify-cleanup');
  }
  step('verify-cleanup', true, 'project successfully removed');

  // All passed
  finish(0, '✅ PASS: Phase 2 write smoke passed (create → verify → delete → cleanup-verify)');
}

main();
