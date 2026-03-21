/**
 * Network & Video Settings Presets Module
 */

const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const pingCache = new Map();
const pendingPings = new Map();
const PING_CACHE_MS = 900;

const isWin = process.platform === 'win32';
const pingArgsBase = isWin ? ['-n', '1', '-w', '2000'] : ['-c', '1', '-W', '2'];

async function execPing(host) {
  return new Promise((resolve) => {
    const args = [...pingArgsBase, host];
    execFile('ping', args, { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve({ success: false, time: null, error: err ? err.message : 'no output' });
      }

      const output = stdout.toString();
      let match = output.match(/time[=<]\s*([\d.]+)\s*ms/i);
      if (!match && !isWin) {
        match = output.match(/time=([\d.]+)\s*ms/i);
      }

      if (match) {
        const ms = Math.round(parseFloat(match[1]));
        return resolve({ success: true, time: ms });
      }

      return resolve({ success: false, time: null, error: 'parse error' });
    });
  });
}

async function checkHostLatency(host) {
  const now = Date.now();
  const cache = pingCache.get(host);
  if (cache && now - cache.ts < PING_CACHE_MS) {
    return cache.value;
  }

  if (pendingPings.has(host)) {
    return pendingPings.get(host);
  }

  const promise = (async () => {
    try {
      const value = await execPing(host);
      pingCache.set(host, { ts: Date.now(), value });
      return value;
    } catch (err) {
      const value = { success: false, time: null, error: err?.message || 'unreachable' };
      pingCache.set(host, { ts: Date.now(), value });
      return value;
    } finally {
      pendingPings.delete(host);
    }
  })();

  pendingPings.set(host, promise);
  return promise;
}

function registerIPC() {

  ipcMain.handle('network:ping', async (event, host) => {
    if (typeof host !== 'string' || !host.trim()) {
      return { success: false, error: 'invalid host' };
    }
    try {
      return await checkHostLatency(host);
    } catch (err) {
      return { success: false, error: err?.message || 'failed' };
    }
  });

  ipcMain.handle('preset:save-video-settings', async (event, filename, content) => {
    try {
      const dir = path.join(app.getPath('userData'), 'videosettings-presets');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, filename);
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

}

module.exports = { registerIPC };
