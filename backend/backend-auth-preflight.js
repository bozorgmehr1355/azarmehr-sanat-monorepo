#!/usr/bin/env node

/**
 * backend-auth-preflight.js — Phase 2 auth check only.
 *
 * Checks for required auth environment variables WITHOUT printing values.
 * Outputs SECRET_PRESENT or SECRET_MISSING for each variable.
 *
 * Rules:
 * - No JWT generation
 * - No API calls
 * - No handler changes
 * - No DB writes
 * - No secret logging
 * - Stop at first blocker
 */

const fs = require('fs');
const path = require('path');

function checkEnvVar(name, filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const regex = new RegExp(`^${name}=`, 'm');
    return regex.test(content) ? 'SECRET_PRESENT' : 'SECRET_MISSING';
  } catch (err) {
    if (err.code === 'ENOENT') {
      return 'FILE_NOT_FOUND';
    }
    return 'ERROR';
  }
}

function main() {
  const envFile = path.join(process.cwd(), '.env');
  const backendEnvFile = path.join(process.cwd(), 'backend/.env');
  
  console.log('=== Backend Auth Preflight ===');
  
  let envPath;
  if (fs.existsSync(envFile)) {
    envPath = envFile;
  } else if (fs.existsSync(backendEnvFile)) {
    envPath = backendEnvFile;
  } else {
    console.log('JWT_SECRET: FILE_NOT_FOUND');
    console.log('SUPABASE_URL: FILE_NOT_FOUND');
    console.log('SUPABASE_SERVICE_ROLE_KEY: FILE_NOT_FOUND');
    console.log('BLOCKED: Required auth environment variables are missing');
    process.exit(1);
  }
  
  console.log(`Using .env file: ${envPath}`);
  console.log('JWT_SECRET:', checkEnvVar('JWT_SECRET', envPath));
  console.log('SUPABASE_URL:', checkEnvVar('SUPABASE_URL', envPath));
  console.log('SUPABASE_SERVICE_ROLE_KEY:', checkEnvVar('SUPABASE_SERVICE_ROLE_KEY', envPath));
  
  // Stop at first blocker
  const jwt_result = checkEnvVar('JWT_SECRET', envPath);
  const supabase_url_result = checkEnvVar('SUPABASE_URL', envPath);
  const supabase_key_result = checkEnvVar('SUPABASE_SERVICE_ROLE_KEY', envPath);
  
  if (jwt_result === 'SECRET_MISSING' || supabase_url_result === 'SECRET_MISSING' || supabase_key_result === 'SECRET_MISSING' || jwt_result === 'FILE_NOT_FOUND' || supabase_url_result === 'FILE_NOT_FOUND' || supabase_key_result === 'FILE_NOT_FOUND' || jwt_result === 'ERROR' || supabase_url_result === 'ERROR' || supabase_key_result === 'ERROR') {
    console.log('BLOCKED: Required auth environment variables are missing');
    process.exit(1);
  }
  
  console.log('PASS: All required auth environment variables are present');
}

main();