const { app, ipcMain } = require('electron');
const { autoUpdater, CancellationToken } = require('electron-updater');
const windowManager = require('./windowManager');
const fs = require('fs');
const path = require('path');

let _downloadCancellationToken = null;
let _updateDownloadedAt = null;
let _updateLogPath = null;
let _latestUpdateVersion = null;
let _updateCheckTimer = null;
let _initCalled = false;

/**
 * Write a small marker to userData so the NEXT launch (immediately after NSIS
 * installs and relaunches) knows to use a wider app:ready timeout and a slower
 * progress trickle. Consumed and deleted on first read.
 */
function _writePostUpdateMarker() {
  try {
    fs.writeFileSync(
      path.join(app.getPath('userData'), 'gs-post-update.json'),
      JSON.stringify({ timestamp: Date.now() }),
    );
  } catch { /* best-effort */ }
}

function logUpdateEvent(line) {
  try {
    if (!_updateLogPath) return;
    const entry = `${new Date().toISOString()} ${line}\n`;
    fs.appendFile(_updateLogPath, entry, () => {});
  } catch (e) {
    // Best-effort logging only
  }
}

function sendUpdateStatus(data) {
  const mainWindow = windowManager.getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', data);
  }
}

function initAutoUpdater() {
  if (_initCalled) return; // Prevent duplicate listeners on re-init
  _initCalled = true;

  if (!app.isPackaged) {
    console.log('[AutoUpdater] Skipping — running in dev mode');
    return;
  }

  // Ensure we have a path to write lightweight update telemetry/logs
  try {
    _updateLogPath = path.join(app.getPath('userData'), 'update-finalization.log');
  } catch (e) {
    _updateLogPath = null;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true; // Safety net: if app quits after download, install runs
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ event: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    _latestUpdateVersion = info.version;
    sendUpdateStatus({
      event: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: typeof info.releaseNotes === 'string'
        ? info.releaseNotes
        : Array.isArray(info.releaseNotes)
          ? info.releaseNotes.map(n => n.note || n).join('\n')
          : '',
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({ event: 'not-available', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    sendUpdateStatus({
      event: 'download-progress',
      percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
    windowManager.sendSplashStatus('Downloading update...');
    windowManager.sendSplashProgress(percent);
    _sendToSplash('splash:update-progress', { percent });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ event: 'downloaded', version: info.version });

    _updateDownloadedAt = Date.now();
    logUpdateEvent(`update-downloaded version=${info.version}`);

    windowManager.sendSplashStatus('Update downloaded. Installing...');
    windowManager.sendSplashProgress(100);
    _sendToSplash('splash:update-progress', { percent: 100 });

    // Auto-install immediately — app will quit, NSIS runs silently, then relaunches.
    setTimeout(() => {
      try {
        _writePostUpdateMarker();
        autoUpdater.quitAndInstall(true, true);
      } catch (e) {
        const msg = e?.message || 'Unknown error';
        console.error('[AutoUpdater] quitAndInstall failed:', msg);
        logUpdateEvent(`quitAndInstall-failed: ${msg}`);
        windowManager.sendSplashStatus(`Install failed: ${msg}. Returning to app...`);
        sendUpdateStatus({ event: 'error', message: `Install failed: ${msg}` });

        // Recover: close splash and restore the main window after a brief pause
        setTimeout(() => {
          try {
            const splash = windowManager.getSplashWindow();
            if (splash && !splash.isDestroyed()) splash.close();
          } catch {}
          try {
            const main = windowManager.getMainWindow();
            if (main && !main.isDestroyed()) main.show();
          } catch {}
        }, 3000);
      }
    }, 800);
  });

  autoUpdater.on('before-quit-for-update', () => {
    windowManager.sendSplashStatus('Installing update...');
    windowManager.sendSplashProgress(100);

    // Log how long we waited between download and install kickoff
    try {
      const elapsedMs = _updateDownloadedAt ? Date.now() - _updateDownloadedAt : null;
      logUpdateEvent(`before-quit-for-update elapsedMs=${elapsedMs ?? 'n/a'}`);
      sendUpdateStatus({ event: 'finalizing', elapsedMs: elapsedMs ?? null });
    } catch (e) {}
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err?.message || err);
    sendUpdateStatus({ event: 'error', message: err?.message || 'Unknown update error' });
    _sendToSplash('splash:update-error', { message: err?.message || 'Unknown update error' });
  });

  autoUpdater.checkForUpdates().catch(err => {
    console.warn('[AutoUpdater] Check failed:', err?.message);
  });

  // Check for updates every 4 hours (not 30 seconds)
  _updateCheckTimer = setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);
}

function registerIPC() {
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      return { event: 'not-available', version: app.getVersion(), dev: true };
    }
    const currentVersion = app.getVersion();
    try {
      // Run electron-updater and GitHub API check in parallel for maximum reliability.
      // The GitHub check acts as a fallback if electron-updater's cache/CDN misses the release.
      const [updaterResult, githubVersion] = await Promise.all([
        autoUpdater.checkForUpdates().catch(() => null),
        _checkGitHubRelease(),
      ]);

      const updaterVersion = updaterResult?.updateInfo?.version || null;

      // Pick whichever source found a newer version
      const candidates = [updaterVersion, githubVersion].filter(Boolean);
      const latestVersion = candidates.find(v => _isVersionNewer(v, currentVersion)) || null;

      if (latestVersion) {
        _latestUpdateVersion = latestVersion;
        return { event: 'available', version: latestVersion };
      }
      return { event: 'not-available', version: currentVersion };
    } catch (err) {
      return { event: 'error', message: err?.message || 'Check failed' };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      const mainWindow = windowManager.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.hide();
      }

      // Always create a fresh splash for the update flow
      windowManager.createSplashWindow();

      // Wait for the splash HTML to finish loading before sending any IPC
      const splash = windowManager.getSplashWindow();
      if (splash && !splash.isDestroyed()) {
        await new Promise((resolve) => {
          splash.webContents.once('did-finish-load', resolve);
          setTimeout(resolve, 3000); // safety timeout
        });
        // Send version so it doesn't show "LOADING..."
        splash.webContents.send('splash:version', app.getVersion());
        // Activate the update overlay (instead of the generic boot UI)
        _sendToSplash('splash:update-found', { version: _latestUpdateVersion || 'latest' });
      }

      windowManager.sendSplashStatus('Downloading update...');
      windowManager.sendSplashProgress(0);

      _downloadCancellationToken = new CancellationToken();
      await autoUpdater.downloadUpdate(_downloadCancellationToken);
      _downloadCancellationToken = null;

      // update-downloaded event already fired and queued quitAndInstall.
      // Just return success — do not overwrite the splash status set by the event handler.
      return { success: true };
    } catch (err) {
      _downloadCancellationToken = null;
      windowManager.sendSplashStatus('Download failed. Please retry.');
      _sendToSplash('splash:update-error', { message: err?.message || 'Download failed' });
      if (err?.message === 'cancelled') return { success: false, cancelled: true };
      return { success: false, message: err?.message || 'Download failed' };
    }
  });

  ipcMain.handle('updater:cancel', () => {
    try {
      if (_downloadCancellationToken) {
        _downloadCancellationToken.cancel();
        _downloadCancellationToken = null;
      }
    } catch {}
    return { success: true };
  });

  ipcMain.handle('updater:install', () => {
    // This is a no-op in the auto-install flow — quitAndInstall is already
    // triggered automatically from the update-downloaded event handler.
    // Kept for API compatibility with the renderer.
    return { success: true };
  });

  ipcMain.handle('updater:get-version', () => {
    return app.getVersion();
  });
}

/**
 * checkForUpdateEarly()
 * Called once during the splash boot sequence before any UI is shown.
 * Resolves with { hasUpdate: true } if an update was found (download has started).
 * Resolves with { hasUpdate: false } if up-to-date, check failed, or timed out.
 * In the hasUpdate=true path the download runs to completion and quitAndInstall()
 * is invoked automatically — the main boot sequence should halt and never show the app.
 */
async function checkForUpdateEarly() {
  if (!app.isPackaged) return { hasUpdate: false };

  // initAutoUpdater() runs AFTER this function, so apply critical settings now
  // to prevent electron-updater from auto-downloading on its own before we
  // control the process ourselves.
  autoUpdater.autoDownload = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.autoInstallOnAppQuit = true;

  return new Promise((resolve) => {
    let resolved = false;
    const done = (val) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      autoUpdater.removeListener('update-available',   onAvailable);
      autoUpdater.removeListener('update-not-available', onNotAvailable);
      autoUpdater.removeListener('error',              onEarlyError);
      resolve(val);
    };

    // Safety net — if the update server doesn't respond in 12 s, boot normally.
    const timeout = setTimeout(() => done({ hasUpdate: false }), 12000);

    const onAvailable = async (info) => {
      // Notify the splash that an update is downloading
      windowManager.sendSplashStatus(`Update v${info.version} found — downloading...`);
      windowManager.sendSplashProgress(0);
      _sendToSplash('splash:update-found', { version: info.version });

      // Resolve true immediately so main.js halts the boot sequence.
      // The download + install carry on independently.
      done({ hasUpdate: true });

      // Wire download progress → splash
      const onProgress = (progress) => {
        const pct = Math.round(progress.percent);
        windowManager.sendSplashStatus(`Downloading update…  ${pct}%`);
        _sendToSplash('splash:update-progress', { percent: pct });
      };

      const onDownloaded = (dlInfo) => {
        autoUpdater.removeListener('download-progress', onProgress);
        autoUpdater.removeListener('update-downloaded', onDownloaded);

        _sendToSplash('splash:update-progress', { percent: 100 });
        windowManager.sendSplashStatus('Update downloaded — installing…');

        setTimeout(() => {
          try {
            _writePostUpdateMarker();
            autoUpdater.quitAndInstall(true, true);
          } catch (e) {
            console.error('[AutoUpdater-Early] quitAndInstall failed:', e?.message);
            _sendToSplash('splash:update-error', { message: 'Install failed. Please restart manually.' });
          }
        }, 800);
      };

      autoUpdater.on('download-progress', onProgress);
      autoUpdater.on('update-downloaded',  onDownloaded);

      try {
        const { CancellationToken } = require('electron-updater');
        await autoUpdater.downloadUpdate(new CancellationToken());
      } catch (e) {
        if (e?.message !== 'cancelled') {
          console.error('[AutoUpdater-Early] Download error:', e?.message);
          _sendToSplash('splash:update-error', { message: e?.message || 'Download failed.' });
        }
      }
    };

    const onNotAvailable = () => done({ hasUpdate: false });
    const onEarlyError    = (err) => {
      console.warn('[AutoUpdater-Early] Error:', err?.message);
      done({ hasUpdate: false });
    };

    autoUpdater.once('update-available',    onAvailable);
    autoUpdater.once('update-not-available', onNotAvailable);
    autoUpdater.once('error',               onEarlyError);

    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[AutoUpdater-Early] checkForUpdates failed:', err?.message);
      done({ hasUpdate: false });
    });
  });
}

function _sendToSplash(channel, data) {
  const splash = windowManager.getSplashWindow();
  if (splash && !splash.isDestroyed()) {
    splash.webContents.send(channel, data);
  }
}

/**
 * Compare two semver strings. Returns true if `latest` is strictly newer than `current`.
 */
function _isVersionNewer(latest, current) {
  const parse = (v) => String(v || '0').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const a = parse(latest);
  const b = parse(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

/**
 * Directly query the GitHub Releases API for the latest release tag.
 * Resolves with a version string (e.g. "2.2.0") or null on any failure.
 */
function _checkGitHubRelease() {
  const { net } = require('electron');
  const currentVersion = app.getVersion();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 8000);

    let request;
    try {
      request = net.request({
        method: 'GET',
        url: 'https://api.github.com/repos/xGlobalShock/GS-Center/releases/latest',
        headers: {
          'User-Agent': `GS-Center/${currentVersion}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
    } catch {
      clearTimeout(timeout);
      resolve(null);
      return;
    }

    let body = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => { body += chunk.toString(); });
      response.on('end', () => {
        clearTimeout(timeout);
        try {
          const data = JSON.parse(body);
          const tagName = data.tag_name || '';
          resolve(tagName.replace(/^v/, '') || null);
        } catch {
          resolve(null);
        }
      });
      response.on('error', () => { clearTimeout(timeout); resolve(null); });
    });
    request.on('error', () => { clearTimeout(timeout); resolve(null); });
    request.end();
  });
}

function cleanup() {
  if (_updateCheckTimer) {
    clearInterval(_updateCheckTimer);
    _updateCheckTimer = null;
  }
}

module.exports = { initAutoUpdater, registerIPC, checkForUpdateEarly, cleanup };
