#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');


console.log(`[dev-launcher] Starting at ${new Date().toLocaleTimeString()}`);
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
