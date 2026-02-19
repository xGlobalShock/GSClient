#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');


console.log(`[dev-launcher] Starting at ${new Date().toLocaleTimeString()}`);
console.log('[dev-launcher] Launching React dev server and Electron...');

const cmd = 'cross-env NODE_OPTIONS=--no-deprecation NODE_MAX_OLD_SPACE_SIZE=4096 concurrently --silent --kill-others-on-fail --hide-from-output REACT,ELECTRON "cross-env BROWSER=none npm --silent run react-start" "wait-on http://localhost:3000 --timeout 40000 2>nul && electron . 2>nul"';

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
