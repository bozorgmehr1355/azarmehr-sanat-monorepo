#!/usr/bin/env node
/**
 * check-db-source-of-truth.js
 * ============================
 * Pre-commit / pre-deploy gate that ensures no tracked file contains
 * hardcoded PostgreSQL connection strings and that runtime handler code
 * uses only the approved Supabase JS client path.
 *
 * Usage: node scripts/check-db-source-of-truth.js
 *
 * Exit code: 0 = PASS, 1 = FAIL
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Find git executable (not on PATH in some environments) ────────────────
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
  return 'git'; // fallback — will fail clearly if not found
}
const GIT = findGit();

function sh(args, cwd) {
  const opts = { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] };
  try {
    return execSync(`"${GIT}" ${args}`, opts).trim();
  } catch (e) {
    return '';
  }
}

// ── Config ────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');

// Git repos to scan (relative to ROOT)
const REPOS = [];

// Check which repos exist
function detectRepos() {
  if (isGitRepo(ROOT)) REPOS.push('.');
  const nested = ['backend', 'whatsapp-broadcast-api',
                  'admin-panel', 'messenger-app', 'wholesale-portal'];
  for (const dir of nested) {
    if (isGitRepo(path.join(ROOT, dir))) {
      REPOS.push(dir);
    }
  }
}

function isGitRepo(dirPath) {
  const gitDir = path.join(dirPath, '.git');
  try {
    return fs.statSync(gitDir).isDirectory();
  } catch { return false; }
}

// Allowlisted files that may mention pattern literals without real secrets
const ALLOWLIST_POSTGRES_PATTERN = new Set([
  'scripts/check-db-source-of-truth.js',
  'docs/DATABASE_SOURCE_OF_TRUTH.md',
  'docs/DEVELOPMENT_RULES.md',
  'AGENTS.md',
]);

// Runtime handler path patterns (checked for forbidden env references)
const RUNTIME_HANDLER_PATTERNS = [
  /^backend\/handlers\/.+\.js$/,
  /^backend\/api\/.+\.js$/,
  /^whatsapp-broadcast-api\/api\/.+\.js$/,
];

// Allowlisted debug files that may check env SET/MISSING only
const ALLOWLIST_RUNTIME_ENV = new Set([
  'backend/handlers/debug.js',
]);

// ── Utilities ─────────────────────────────────────────────────────────────

function gitExec(args, cwd) {
  return sh(args, cwd);
}

function trackedFiles(repoDir) {
  const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
  const files = gitExec('ls-files', cwd);
  if (!files) return [];
  return files.split('\n').map(f => repoDir === '.' ? f : `${repoDir}/${f}`);
}

function stagedFiles(repoDir) {
  const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
  const files = gitExec('diff --cached --name-only', cwd);
  if (!files) return [];
  return files.split('\n').map(f => repoDir === '.' ? f : `${repoDir}/${f}`);
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch { return ''; }
}

function isRuntimeHandler(relPath) {
  return RUNTIME_HANDLER_PATTERNS.some(p => p.test(relPath));
}

function isAllowlisted(relPath) {
  return ALLOWLIST_POSTGRES_PATTERN.has(relPath);
}

function repoDisplay(repoDir) {
  return repoDir === '.' ? 'root' : repoDir;
}

// ── Checks ────────────────────────────────────────────────────────────────

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

// Check A: Hardcoded Postgres URL in tracked files
function checkHardcodedPostgresUrl(tracked) {
  console.log('\n── A. Hardcoded Postgres URL Check ──');
  let found = false;
  for (const relPath of tracked) {
    if (isAllowlisted(relPath)) continue;
    // Skip node_modules
    if (relPath.includes('node_modules')) continue;
    // Skip tmp/ (legacy copies)
    if (relPath.startsWith('tmp/')) continue;

    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) continue;
    // Skip binary/non-text files
    const content = readFileSafe(absPath);
    if (!content) continue;

    // Match postgres:// or postgresql:// but not in comments/docs that are allowlisted
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/postgresql:\/\/|postgres:\/\//.test(line)) {
        fail(`${relPath}:${i + 1}`, 'contains hardcoded postgres URL pattern');
        found = true;
      }
    }
  }
  if (!found) pass('No hardcoded postgres URLs in tracked files');
}

// Check B: Runtime forbidden env usage
function checkForbiddenRuntimeEnv(tracked, staged) {
  console.log('\n── B. Runtime Forbidden Env Usage ──');
  const allRelevant = new Set([...tracked, ...staged]);
  let found = false;

  for (const relPath of allRelevant) {
    if (!isRuntimeHandler(relPath)) continue;
    if (ALLOWLIST_RUNTIME_ENV.has(relPath)) {
      // Verify debug.js only does boolean checks
      const absPath = path.join(ROOT, relPath);
      const content = readFileSafe(absPath);
      if (content) {
        const lines = content.split('\n');
        let ok = true;
        for (let i = 0; i < lines.length; i++) {
          if (/process\.env\.(POSTGRES_URL|DATABASE_URL|SUPABASE_POSTGRES_URL)/.test(lines[i])) {
            // Must use !! (boolean) only
            if (!/!!process\.env\./.test(lines[i])) {
              fail(`${relPath}:${i + 1}`, 'uses forbidden env var without boolean guard');
              ok = false;
              found = true;
            }
          }
        }
        if (ok) pass(relPath, 'allowlisted — uses boolean SET/MISSING only');
      }
      continue;
    }

    const absPath = path.join(ROOT, relPath);
    const content = readFileSafe(absPath);
    if (!content) continue;
    const lines = content.split('\n');
    let fileFailed = false;
    for (let i = 0; i < lines.length; i++) {
      if (/process\.env\.(POSTGRES_URL|DATABASE_URL|SUPABASE_POSTGRES_URL)/.test(lines[i])) {
        fail(`${relPath}:${i + 1}`, 'uses forbidden env var in runtime handler');
        fileFailed = true;
        found = true;
      }
      // Check for require('pg') or import from pg
      if (/(require\s*\(\s*['"])pg['"\)]|from\s+['"]pg['"]/.test(lines[i])) {
        fail(`${relPath}:${i + 1}`, 'runtime handler imports direct Postgres client (pg)');
        fileFailed = true;
        found = true;
      }
    }
    if (!fileFailed) pass(relPath, 'no forbidden env vars or pg import');
  }

  if (!found) pass('No runtime handler uses forbidden env vars or pg');
}

// Check C: Dangerous quarantined file check
function checkQuarantinedFiles() {
  console.log('\n── C. Dangerous Quarantined File Check ──');
  let found = false;

  const patterns = [
    'backend/query-portal.js',
  ];
  for (const p of patterns) {
    const absPath = path.join(ROOT, p);
    if (fs.existsSync(absPath)) {
      fail(p, 'quarantined file still exists on disk');
      found = true;
    }
  }

  // Also check tracked files for query-portal pattern
  for (const repoDir of REPOS) {
    const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
    const files = gitExec('ls-files "*query-portal*.js"', cwd);
    if (files) {
      for (const f of files.split('\n').filter(Boolean)) {
        const rel = repoDir === '.' ? f : `${repoDir}/${f}`;
        fail(rel, 'tracked file matches *query-portal*.js pattern');
        found = true;
      }
    }
  }

  if (!found) pass('No dangerous quarantined files found');
}

// Check D: .env tracking/staging check
function checkEnvTracking() {
  console.log('\n── D. Env File Tracking Check ──');
  let found = false;

  const envPattern = /^\.env|\.env\..+|\.env-.+$/;

  for (const repoDir of REPOS) {
    const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
    // Check tracked files
    const tracked = gitExec('ls-files', cwd);
    if (tracked) {
      for (const f of tracked.split('\n').filter(Boolean)) {
        if (envPattern.test(path.basename(f))) {
          const rel = repoDir === '.' ? f : `${repoDir}/${f}`;
          fail(rel, 'env file is tracked by git');
          found = true;
        }
      }
    }
    // Check staged files
    const staged = gitExec('diff --cached --name-only', cwd);
    if (staged) {
      for (const f of staged.split('\n').filter(Boolean)) {
        if (envPattern.test(path.basename(f))) {
          const rel = repoDir === '.' ? f : `${repoDir}/${f}`;
          fail(rel, 'env file is staged for commit');
          found = true;
        }
      }
    }
  }

  if (!found) pass('No .env files tracked or staged');
}

// Check E: Migration/tooling — only soft-check that tooling isn't hardcoded
function checkToolingSafety() {
  console.log('\n── E. Tooling Script Safety Check ──');
  // We check _run_migration.js style files — they may use env vars (allowed)
  // but must not have hardcoded connection strings
  let found = false;
  for (const repoDir of REPOS) {
    const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
    const files = gitExec('ls-files "*run_migration*" "*migration*"', cwd);
    if (!files) continue;
    for (const f of files.split('\n').filter(Boolean)) {
      const rel = repoDir === '.' ? f : `${repoDir}/${f}`;
      const absPath = path.join(ROOT, rel);
      if (!fs.existsSync(absPath)) continue;
      const content = readFileSafe(absPath);
      if (!content) continue;
      const lines = content.split('\n');
      let fileFail = false;
      for (let i = 0; i < lines.length; i++) {
        if (/postgresql:\/\/|postgres:\/\//.test(lines[i]) &&
            !/process\.env\./.test(lines[i]) &&
            !lines[i].trim().startsWith('//')) {
          fail(`${rel}:${i + 1}`, 'tooling script has hardcoded connection string (not env)');
          fileFail = true;
          found = true;
        }
      }
      if (!fileFail) pass(rel, 'uses env vars (safe)');
    }
  }
  if (!found && filesCount('*run_migration*') === 0) {
    pass('No migration scripts to check');
  }
}

function filesCount(pattern) {
  let count = 0;
  for (const repoDir of REPOS) {
    const cwd = repoDir === '.' ? ROOT : path.join(ROOT, repoDir);
    const files = gitExec(`ls-files "${pattern}"`, cwd);
    if (files) count += files.split('\n').filter(Boolean).length;
  }
  return count;
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Database Source-of-Truth Gate');
  console.log('═══════════════════════════════════════════════════\n');

  detectRepos();
  console.log(`Detected git repos: ${REPOS.map(repoDisplay).join(', ') || '(none)'}\n`);

  // Collect all tracked files across all repos
  const allTracked = [];
  for (const repoDir of REPOS) {
    allTracked.push(...trackedFiles(repoDir));
  }

  const allStaged = [];
  for (const repoDir of REPOS) {
    allStaged.push(...stagedFiles(repoDir));
  }

  console.log(`Tracked files: ${allTracked.length}`);
  console.log(`Staged files:  ${allStaged.length}\n`);

  // Run checks
  checkHardcodedPostgresUrl(allTracked);
  checkForbiddenRuntimeEnv(allTracked, allStaged);
  checkQuarantinedFiles();
  checkEnvTracking();
  checkToolingSafety();

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results:  ${passed} passed,  ${failed} failed`);
  console.log('═══════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('Items requiring attention:');
    for (const e of errors) {
      console.log(`  ❌ ${e.label}${e.detail ? ' — ' + e.detail : ''}`);
    }
    console.log('\n⚠️  Gate FAILED. Fix issues above before commit/deploy.\n');
    process.exit(1);
  } else {
    console.log('✅ Gate PASSED. Database source-of-truth is intact.\n');
    process.exit(0);
  }
}

main();
