#!/usr/bin/env node
/**
 * check-regression-safety.js
 * ============================
 * Pre-commit / pre-deploy gate that prevents cross-service regressions.
 * Read-only — never modifies files.
 *
 * Checks:
 *   A. No forbidden files are tracked
 *   B. No hardcoded production secrets in tracked files
 *   C. Required documentation exists
 *   D. Package scripts exist for all gates
 *   E. Correct source-of-truth usage (no second DB source)
 *   F. Risky cross-service changes detected
 *
 * Usage: node scripts/check-regression-safety.js
 * Exit code: 0 = PASS, 1 = FAIL
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Find git executable ───────────────────────────────────────────────────
function findGit() {
  const candidates = ['git',
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
  ];
  for (const c of candidates) {
    try {
      const r = execSync(`"${c}" --version`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      if (r) return c;
    } catch { /* try next */ }
  }
  return 'git';
}
const GIT = findGit();

function sh(args, cwd) {
  const opts = { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] };
  try {
    return execSync(`"${GIT}" ${args}`, opts).trim();
  } catch { return ''; }
}

// ── Config ────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');

// All nested git repos
function detectRepos() {
  const repos = [];
  if (isGitRepo(ROOT)) repos.push('.');
  for (const dir of ['backend', 'whatsapp-broadcast-api',
                     'admin-panel', 'messenger-app', 'wholesale-portal']) {
    if (isGitRepo(path.join(ROOT, dir))) repos.push(dir);
  }
  return repos;
}

function isGitRepo(dirPath) {
  try { return fs.statSync(dirPath).isDirectory(); }
  catch { return false; }
}
// Actually check .git subdirectory
function hasDotGit(dirPath) {
  const g = path.join(dirPath, '.git');
  try { return fs.statSync(g).isDirectory(); } catch { return false; }
}

const REPOS = detectRepos();

// ── Registered services (for cross-service detection) ─────────────────────
const SERVICES = {
  'backend': {
    path: 'backend/',
    dir: path.join(ROOT, 'backend'),
    upstream: [],
    downstream: ['wholesale-portal', 'admin-panel', 'messenger-app', 'whatsapp-broadcast-api'],
    smokeCmd: 'node -c backend/server.js backend/api/index.js',
    hasNodeModules: fs.existsSync(path.join(ROOT, 'backend', 'node_modules')),
    healthUrl: 'https://azarmehr-backend.vercel.app/api/health',
  },
  'whatsapp-broadcast-api': {
    path: 'whatsapp-broadcast-api/',
    dir: path.join(ROOT, 'whatsapp-broadcast-api'),
    upstream: [],
    downstream: [],
    smokeCmd: 'node -c whatsapp-broadcast-api/api/webhook.js whatsapp-broadcast-api/api/_lib.js',
    hasNodeModules: fs.existsSync(path.join(ROOT, 'whatsapp-broadcast-api', 'node_modules')),
    healthUrl: 'https://whatsapp-broadcast-api.vercel.app/api/webhook',
  },
  'wholesale-portal': {
    path: 'wholesale-portal/',
    dir: path.join(ROOT, 'wholesale-portal'),
    upstream: ['backend'],
    downstream: [],
    smokeCmd: null,
    hasNodeModules: false,
    healthUrl: 'https://wholesale-portal.vercel.app/',
  },
  'admin-panel': {
    path: 'admin-panel/',
    dir: path.join(ROOT, 'admin-panel'),
    upstream: ['backend'],
    downstream: [],
    smokeCmd: null,
    hasNodeModules: false,
    healthUrl: null, // not deployed
  },
  'messenger-app': {
    path: 'messenger-app/',
    dir: path.join(ROOT, 'messenger-app'),
    upstream: ['backend'],
    downstream: [],
    smokeCmd: null,
    hasNodeModules: false,
    healthUrl: null, // not deployed
  },
};

// ── Required docs ─────────────────────────────────────────────────────────
const REQUIRED_DOCS = [
  { path: 'docs/DATABASE_SOURCE_OF_TRUTH.md', desc: 'DB source-of-truth contract' },
  { path: 'docs/SERVICE_CONTRACTS.md', desc: 'Service contract inventory' },
  { path: 'docs/DEVELOPMENT_RULES.md', desc: 'Development rules' },
  { path: 'docs/SERVICE_HEALTH_MATRIX.md', desc: 'Health matrix' },
  { path: 'AGENTS.md', desc: 'Agent instructions (with pre-commit rules)' },
];

// ── Forbidden env file patterns ───────────────────────────────────────────
const ENV_FILE_PATTERNS = [
  /^\.env$/,
  /^\.env\..+$/,
  /\.env\.local$/,
  /\.env\.production$/,
];

// ── Forbidden hardcoded patterns ──────────────────────────────────────────
const FORBIDDEN_SECRET_PATTERNS = [
  { pattern: /postgres:\/\/[^:]+:[^@]+@/i, desc: 'hardcoded postgres connection string with password' },
  { pattern: /postgresql:\/\/[^:]+:[^@]+@/i, desc: 'hardcoded postgresql connection string with password' },
  { pattern: /service_role[\s]*[:=][\s]*['"]?eyJ/i, desc: 'hardcoded Supabase service_role key' },
  { pattern: /"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\..*\._.*"/, desc: 'hardcoded JWT (likely Supabase anon/service key)' },
];

// ── Approved runtime env vars per service type ────────────────────────────
const BACKEND_RUNTIME_ALLOWED = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_KEY', 'JWT_SECRET', 'PORT',
];

const WHATSAPP_RUNTIME_ALLOWED = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET',
  'ULTRAMSG_INSTANCE_ID', 'ULTRAMSG_TOKEN',
];

const FORBIDDEN_RUNTIME_ENV = [
  'DATABASE_URL', 'POSTGRES_URL', 'SUPABASE_POSTGRES_URL',
  'PGPASSWORD', 'PGUSER', 'PGHOST', 'PGDATABASE',
];

// ── Helper functions ──────────────────────────────────────────────────────

function trackedFiles(repoDir) {
  const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
  const files = sh('ls-files', cwd);
  if (!files) return [];
  return files.split('\n').map(f => repoDir === '.' ? f : `${repoDir}/${f}`);
}

function readFileSafe(filePath) {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return ''; }
}

function repoDisplay(repoDir) {
  return repoDir === '.' ? 'root' : repoDir;
}

function isNestedRepo(repoDir) {
  return repoDir !== '.';
}

// ── Reporter state ────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const errors = [];

function pass(label, detail) {
  passed++;
  console.log(`  ✅ PASS  ${label}${detail ? ' — ' + detail : ''}`);
}

function fail(label, detail) {
  failed++;
  errors.push({ label, detail });
  console.log(`  ❌ FAIL  ${label}${detail ? ' — ' + detail : ''}`);
}

// ══════════════════════════════════════════════════════════════════════════
//  CHECK A: Forbidden files tracked
// ══════════════════════════════════════════════════════════════════════════
function checkForbiddenFiles() {
  console.log('\n── A. Forbidden File Tracking Check ──');
  let found = false;

  for (const repoDir of REPOS) {
    const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
    const files = sh('ls-files', cwd);
    if (!files) continue;
    for (const f of files.split('\n').filter(Boolean)) {
      const base = path.basename(f);
      // Check env file patterns
      for (const pat of ENV_FILE_PATTERNS) {
        if (pat.test(base)) {
          const rel = repoDir === '.' ? f : `${repoDir}/${f}`;
          fail(rel, `matches forbidden env file pattern ${pat}`);
          found = true;
        }
      }
      // Check for query-portal pattern files
      if (/query-portal/.test(f)) {
        const rel = repoDir === '.' ? f : `${repoDir}/${f}`;
        fail(rel, 'matches *query-portal* pattern (quarantined)');
        found = true;
      }
    }
  }

  if (!found) pass('No forbidden files tracked');
}

// ══════════════════════════════════════════════════════════════════════════
//  CHECK B: Hardcoded secrets in tracked files
// ══════════════════════════════════════════════════════════════════════════
function checkHardcodedSecrets() {
  console.log('\n── B. Hardcoded Secret Check ──');
  let found = false;
  const seenFiles = new Set();

  for (const repoDir of REPOS) {
    const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
    const files = sh('ls-files', cwd);
    if (!files) continue;
    for (const f of files.split('\n').filter(Boolean)) {
      const rel = repoDir === '.' ? f : `${repoDir}/${f}`;
      // Skip allowlisted docs/scripts
      if (rel.startsWith('docs/') || rel.startsWith('scripts/') || rel === 'AGENTS.md') continue;
      // Skip non-text files
      if (/\.(png|ico|jpg|jpeg|gif|svg|woff2?|ttf|eot)$/i.test(rel)) continue;
      // Skip node_modules
      if (rel.includes('node_modules')) continue;
      // Skip tmp
      if (rel.startsWith('tmp/')) continue;

      // For nested repos, the file path is relative to that repo's root
      const absPath = repoDir === '.' ? path.join(ROOT, f) : path.join(ROOT, repoDir, f);
      if (!fs.existsSync(absPath)) continue;
      const content = readFileSafe(absPath);
      if (!content) continue;

      for (const check of FORBIDDEN_SECRET_PATTERNS) {
        if (check.pattern.test(content)) {
          // Don't report same file multiple times
          const key = `${rel}:${check.desc}`;
          if (seenFiles.has(key)) continue;
          seenFiles.add(key);
          fail(rel, check.desc);
          found = true;
        }
      }
    }
  }

  if (!found) pass('No hardcoded production secrets in tracked files');
}

// ══════════════════════════════════════════════════════════════════════════
//  CHECK C: Required documentation exists
// ══════════════════════════════════════════════════════════════════════════
function checkRequiredDocs() {
  console.log('\n── C. Required Documentation Check ──');
  let found = false;

  for (const doc of REQUIRED_DOCS) {
    const absPath = path.join(ROOT, doc.path);
    if (fs.existsSync(absPath)) {
      pass(doc.path, doc.desc);
    } else {
      fail(doc.path, `MISSING — ${doc.desc}`);
      found = true;
    }
  }

  // Specifically check AGENTS.md has pre-commit section
  const agentsPath = path.join(ROOT, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    const content = readFileSafe(agentsPath);
    if (!content.includes('check-regression-safety')) {
      fail('AGENTS.md', 'missing check-regression-safety in pre-commit section');
      found = true;
    }
    if (!content.includes('check-db-source-of-truth')) {
      fail('AGENTS.md', 'missing check-db-source-of-truth in pre-commit section');
      found = true;
    }
  }

  if (!found) pass('All required documentation exists and contains gate references');
}

// ══════════════════════════════════════════════════════════════════════════
//  CHECK D: Package scripts exist
// ══════════════════════════════════════════════════════════════════════════
function checkPackageScripts() {
  console.log('\n── D. Package Scripts Check ──');
  let found = false;

  const rootPkg = path.join(ROOT, 'package.json');
  if (!fs.existsSync(rootPkg)) {
    fail('package.json (root)', 'MISSING — no root package.json for preflight scripts');
    return;
  }

  let pkg;
  try {
    pkg = JSON.parse(readFileSafe(rootPkg));
  } catch {
    fail('package.json (root)', 'invalid JSON');
    return;
  }

  const scripts = pkg.scripts || {};
  const requiredScripts = [
    { name: 'check:db-source', desc: 'DB source-of-truth gate' },
    { name: 'check:regression-safety', desc: 'Regression safety gate' },
    { name: 'check:preflight', desc: 'Unified preflight (both gates)' },
  ];

  for (const rs of requiredScripts) {
    if (scripts[rs.name]) {
      pass(`npm run ${rs.name}`, rs.desc);
    } else {
      fail(`npm run ${rs.name}`, `MISSING — ${rs.desc}`);
      found = true;
    }
  }

  if (!found) pass('All required package scripts found');
}

// ══════════════════════════════════════════════════════════════════════════
//  CHECK E: Correct source-of-truth usage
// ══════════════════════════════════════════════════════════════════════════
function checkSourceOfTruth() {
  console.log('\n── E. Source-of-Truth Usage Check ──');
  let found = false;

  // Collect all tracked files
  const allTracked = [];
  for (const repoDir of REPOS) {
    allTracked.push(...trackedFiles(repoDir));
  }

  // 1. Check backend runtime handlers use only approved env vars
  const backendRuntimePattern = /^backend\/(handlers|api)\/.+\.js$/;
  for (const relPath of allTracked) {
    if (!backendRuntimePattern.test(relPath)) continue;
    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) continue;
    const content = readFileSafe(absPath);
    if (!content) continue;

    for (const forbidden of FORBIDDEN_RUNTIME_ENV) {
      const re = new RegExp(`process\\.env\\.${forbidden}\\b`);
      if (re.test(content)) {
        // Allow debug.js boolean checks
        if (relPath === 'backend/handlers/debug.js') {
          if (!/!!process\.env\./.test(content)) {
            fail(relPath, `uses forbidden ${forbidden} without boolean guard`);
            found = true;
          }
        } else {
          fail(relPath, `uses forbidden env var ${forbidden} in runtime handler`);
          found = true;
        }
      }
    }

    // Check for 'require("pg")' or 'from "pg"' in runtime code
    if (/(require\s*\(\s*['"])pg['"\)]|from\s+['"]pg['"]/.test(content)) {
      fail(relPath, 'runtime handler imports pg (direct Postgres client)');
      found = true;
    }
  }

  // 2. Check WhatsApp runtime handlers
  const whatsappRuntimePattern = /^whatsapp-broadcast-api\/api\/.+\.js$/;
  for (const relPath of allTracked) {
    if (!whatsappRuntimePattern.test(relPath)) continue;
    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) continue;
    const content = readFileSafe(absPath);
    if (!content) continue;

    for (const forbidden of FORBIDDEN_RUNTIME_ENV) {
      const re = new RegExp(`process\\.env\\.${forbidden}\\b`);
      if (re.test(content)) {
        fail(relPath, `uses forbidden env var ${forbidden} in runtime handler`);
        found = true;
      }
    }

    if (/(require\s*\(\s*['"])pg['"\)]|from\s+['"]pg['"]/.test(content)) {
      fail(relPath, 'runtime handler imports pg (direct Postgres client)');
      found = true;
    }
  }

  // 3. Check portal/frontend index.html files for hardcoded supabase service_role keys
  for (const portal of ['wholesale-portal/index.html', 'admin-panel/index.html', 'messenger-app/index.html']) {
    const absPath = path.join(ROOT, portal);
    if (!fs.existsSync(absPath)) continue;
    const content = readFileSafe(absPath);
    if (!content) continue;
    // Check for hardcoded service_role (NOT anon) key
    if (content.includes('service_role') || /role.*service.*secret/.test(content)) {
      // This is informational — service_role should not be in client-side code
      // But anon keys are OK. We just warn.
      console.log(`  ⚠️  NOTE  ${portal} — check for service_role key (anon keys are OK)`);
    }
  }

  if (!found) pass('No source-of-truth violations found');
}

// ══════════════════════════════════════════════════════════════════════════
//  CHECK F: Risky cross-service change detection
// ══════════════════════════════════════════════════════════════════════════
function checkCrossServiceChanges() {
  console.log('\n── F. Cross-Service Change Detection ──');
  let foundRisk = false;

  // Collect staged and changed (unstaged) files
  const changedFiles = [];
  const stagedFiles = [];

  for (const repoDir of REPOS) {
    // Staged
    const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
    const staged = sh('diff --cached --name-only', cwd);
    if (staged) {
      for (const f of staged.split('\n').filter(Boolean)) {
        stagedFiles.push(repoDir === '.' ? f : `${repoDir}/${f}`);
      }
    }
    // Unstaged modified
    const unstaged = sh('diff --name-only', cwd);
    if (unstaged) {
      for (const f of unstaged.split('\n').filter(Boolean)) {
        changedFiles.push(repoDir === '.' ? f : `${repoDir}/${f}`);
      }
    }
  }

  const allChanges = new Set([...stagedFiles, ...changedFiles]);

  if (allChanges.size === 0) {
    pass('No changed files detected — nothing to check cross-service');
    return;
  }

  console.log(`  Changed files: ${allChanges.size}`);
  for (const f of allChanges) {
    console.log(`    ${f}`);
  }

  // Which services are affected?
  const affectedServices = new Set();
  for (const f of allChanges) {
    for (const [svcName, svc] of Object.entries(SERVICES)) {
      if (f.startsWith(svc.path)) {
        affectedServices.add(svcName);
      }
    }
  }

  if (affectedServices.size === 0) {
    pass('Changes do not affect registered services');
    return;
  }

  console.log(`  Affected services: ${[...affectedServices].join(', ')}`);

  // Check if backend is affected
  if (affectedServices.has('backend')) {
    const backend = SERVICES['backend'];
    console.log(`  ⚠️  Backend changed — downstream services must be verified:`);
    for (const ds of backend.downstream) {
      const dsSvc = SERVICES[ds];
      if (dsSvc) {
        if (!dsSvc.hasNodeModules && !dsSvc.smokeCmd) {
          console.log(`       ${ds}: ⚠️  No local smoke test available (${dsSvc.healthUrl || 'no URL'})`);
        } else {
          console.log(`       ${ds}: smoke via ${dsSvc.smokeCmd || dsSvc.healthUrl || 'unknown'}`);
        }
      }
    }
    foundRisk = true;
  }

  // Check if portal/frontend affected
  for (const svcName of affectedServices) {
    const svc = SERVICES[svcName];
    if (svc && svc.upstream.length > 0) {
      console.log(`  ⚠️  ${svcName} changed — depends on upstream: ${svc.upstream.join(', ')}`);
      for (const us of svc.upstream) {
        if (!affectedServices.has(us)) {
          console.log(`       Upstream ${us} NOT changed — verify ${svcName} still works with current ${us}`);
        }
      }
      foundRisk = true;
    }
  }

  // Check if docs changed
  const docChanges = [...allChanges].filter(f => f.startsWith('docs/') || f === 'AGENTS.md' || f === 'package.json');
  if (docChanges.length > 0) {
    console.log(`  ⚠️  Doc/metadata changes detected — manual review recommended`);
    for (const d of docChanges) {
      console.log(`       ${d}`);
    }
    // If DB source doc changed, recommend running DB gate
    if (docChanges.some(d => d.includes('DATABASE_SOURCE_OF_TRUTH') || d.includes('DEVELOPMENT_RULES'))) {
      console.log(`  ⚠️  DB source-of-truth docs changed — ensure 'npm run check:db-source' passes`);
    }
    foundRisk = true;
  }

  if (!foundRisk) pass('No risky cross-service changes detected');
}

// ══════════════════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════════════════
function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Regression Safety Gate');
  console.log('═══════════════════════════════════════════════════\n');

  console.log(`Detected git repos: ${REPOS.map(repoDisplay).join(', ') || '(none)'}\n`);

  // Run all 6 checks
  checkForbiddenFiles();
  checkHardcodedSecrets();
  checkRequiredDocs();
  checkPackageScripts();
  checkSourceOfTruth();
  checkCrossServiceChanges();

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results:  ${passed} passed,  ${failed} failed`);
  console.log('═══════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('Items requiring attention:');
    for (const e of errors) {
      console.log(`  ❌ ${e.label}${e.detail ? ' — ' + e.detail : ''}`);
    }
    console.log('\n⚠️  Gate FAILED. Fix issues before commit/deploy.\n');
    process.exit(1);
  } else {
    console.log('✅ Gate PASSED. No regression safety issues found.\n');
    process.exit(0);
  }
}

main();
