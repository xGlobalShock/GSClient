#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Check if running as admin on Windows
function isAdmin() {
  try {
    require('child_process').execSync('net session', { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

// If Windows and not admin, relaunch as admin
if (process.platform === 'win32' && !isAdmin()) {
  const ps = spawn('powershell.exe', [
    '-Command',
    `Start-Process node -ArgumentList "${__filename}" -Verb RunAs`
  ], {
    stdio: 'inherit'
  });
  
  ps.on('exit', () => process.exit());
  process.exit();
}

require('./main.js');