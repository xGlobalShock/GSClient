#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ── Admin elevation: re-launch via UAC if not already admin ──
function isAdmin() {
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

if (!isAdmin()) {
  console.log('[dev-launcher] Not running as admin — requesting elevation...');

  // Write a temp batch file that cd's to the project and runs npm run client
  const batPath = path.join(os.tmpdir(), 'gs_dev_elevated.bat');
  const batContent = [
    '@echo off',
    'title GS Optimizer Dev (Admin)',
    `cd /d "${__dirname}"`,
    'npm run client',
    'pause',
  ].join('\r\n');
  fs.writeFileSync(batPath, batContent, 'utf8');

  // Elevate the batch file via PowerShell Start-Process -Verb RunAs
  try {
    execSync(`powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '${batPath}'"`, { stdio: 'ignore' });
    console.log('[dev-launcher] Elevated window launched. You can close this terminal.');
  } catch {
    console.error('[dev-launcher] UAC elevation was cancelled or failed.');
    process.exit(1);
  }
  process.exit(0);
}

console.log(`[dev-launcher] Starting as Administrator at ${new Date().toLocaleTimeString()}`);
console.log('[dev-launcher] Launching React dev server and Electron...');

const cmd = 'cross-env NODE_OPTIONS=--no-deprecation NODE_MAX_OLD_SPACE_SIZE=4096 concurrently --silent --names "REACT,ELECTRON" --prefix-colors "cyan.bold,magenta.bold" --kill-others-on-fail "cross-env BROWSER=none npm --silent run react-start" "wait-on http://localhost:3000 --timeout 120000 && electron ."';

// Spawn the process with inherited stdio to show output directly
const proc = spawn(cmd, {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});


proc.on('exit', (code) => {
  console.log(`[dev-launcher] Exited at ${new Date().toLocaleTimeString()} (code: ${code})`);
  process.exit(0);
});

proc.on('error', (err) => {
  console.error('[dev-launcher] Failed to start dev environment:', err);
  process.exit(1);
});
