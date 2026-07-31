#!/usr/bin/env node
/**
 * phase2-smoke-with-jwt.js — One-time helper: generates non-production admin JWT
 * in-memory, sets SMOKE_ADMIN_JWT, and spawns phase2-smoke-runner.js.
 *
 * JWT is never printed, never stored on disk, never committed.
 * After this script exits, the token is gone.
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const envFile = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envFile, 'utf8');
const match = envContent.match(/^JWT_SECRET=(.+)$/m);
if (!match) {
  console.log('BLOCKED: JWT_SECRET not found in .env');
  process.exit(1);
}

const JWT_SECRET = match[1].trim();

// Also extract real Supabase vars from .env
const supabaseUrlMatch = envContent.match(/^SUPABASE_URL=(.+)$/m);
const supabaseKeyMatch = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
const SUPABASE_URL = supabaseUrlMatch ? supabaseUrlMatch[1].trim() : 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = supabaseKeyMatch ? supabaseKeyMatch[1].trim() : '';

const payload = { system_role: 'super_admin' };
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

// Spawn phase2-smoke-runner.js with real env vars
const child = spawn('node', [path.join(__dirname, 'phase2-smoke-runner.js')], {
  env: {
    ...process.env,
    SMOKE_ADMIN_JWT: token,
    JWT_SECRET: JWT_SECRET,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_KEY: SUPABASE_SERVICE_ROLE_KEY, // fallback if _lib checks SUPABASE_KEY
  },
  stdio: ['ignore', 'inherit', 'inherit'],
});

child.on('exit', (code) => {
  process.exit(code);
});
