/**
 * Repair Overlay — floating progress window for minimized repair operations.
 *
 * Shows a compact always-on-top card in the bottom-right corner while
 * a long-running repair (SFC / DISM / ChkDsk) continues in the background.
 */

const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const windowManager = require('./windowManager');

let _overlayWindow = null;
let _activeState = null; // { tool, toolTitle, color, progress, status, lastLine }
let _autoCloseTimer = null;

// ── Geometry ────────────────────────────────────────────────────────────────
function _getBounds() {
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const ow = 320, oh = 130;
  const margin = 16;
  return { x: sw - ow - margin, y: sh - oh - margin, width: ow, height: oh };
}

// ── Window lifecycle ────────────────────────────────────────────────────────
function createOverlayWindow() {
  if (_overlayWindow && !_overlayWindow.isDestroyed()) return;

  const isDev = !require('electron').app.isPackaged;
  const rootDir = windowManager.getRootDir();
  const bounds = _getBounds();

  _overlayWindow = new BrowserWindow({
    ...bounds,
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: isDev
        ? path.join(rootDir, 'public', 'repair-overlay-preload.js')
        : path.join(rootDir, 'build', 'repair-overlay-preload.js'),
      devTools: false,
    },
  });

  _overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  const htmlPath = isDev
    ? path.join(rootDir, 'public', 'repair-overlay.html')
    : path.join(rootDir, 'build', 'repair-overlay.html');

  _overlayWindow.loadFile(htmlPath).catch(err => {
    console.error('[RepairOverlay] Failed to load:', err);
  });

  _overlayWindow.webContents.once('did-finish-load', () => {
    if (_activeState && _overlayWindow && !_overlayWindow.isDestroyed()) {
      _overlayWindow.webContents.send('repair-overlay:state', _activeState);
    }
  });

  _overlayWindow.on('closed', () => {
    _overlayWindow = null;
    _clearAutoClose();
  });
}

function destroyOverlay() {
  _clearAutoClose();
  if (_overlayWindow && !_overlayWindow.isDestroyed()) {
    _overlayWindow.close();
  }
  _overlayWindow = null;
}

function _clearAutoClose() {
  if (_autoCloseTimer) {
    clearTimeout(_autoCloseTimer);
    _autoCloseTimer = null;
  }
}

// ── State management ────────────────────────────────────────────────────────
function setActiveRepair(tool, toolTitle, color) {
  _activeState = {
    tool,
    toolTitle,
    color,
    progress: 0,
    status: 'running',
    lastLine: 'Starting...',
  };
}

function clearActiveRepair() {
  _activeState = null;
}

function getActiveState() {
  return _activeState;
}

/**
 * Called from tweaks.js on every progress line.
 * @param {{ tool?: string, progress?: number, status?: string, line?: string }} data
 */
function pushProgress(data) {
  if (!_activeState) return;
  if (data.progress !== undefined) _activeState.progress = data.progress;
  if (data.status) _activeState.status = data.status;
  if (data.line) _activeState.lastLine = data.line;

  if (_overlayWindow && !_overlayWindow.isDestroyed()) {
    _overlayWindow.webContents.send('repair-overlay:state', { ..._activeState });
  }

  // Auto-close overlay after completion
  if (data.status === 'done' || data.status === 'error') {
    _clearAutoClose();
    _autoCloseTimer = setTimeout(() => {
      destroyOverlay();
    }, 4000);
  }
}

// ── IPC ─────────────────────────────────────────────────────────────────────
function registerIPC() {
  ipcMain.handle('repair:minimize-to-overlay', (_event, data) => {
    if (!_activeState) {
      _activeState = {
        tool: data.tool,
        toolTitle: data.toolTitle,
        color: data.color,
        progress: data.progress || 0,
        status: 'running',
        lastLine: '',
      };
    }
    createOverlayWindow();
    return { ok: true };
  });

  ipcMain.handle('repair:restore-from-overlay', () => {
    const tool = _activeState?.tool;
    destroyOverlay();
    // Tell the renderer to reopen the modal
    const mainWin = windowManager.getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('repair:restored', { tool });
    }
    return { ok: true };
  });

  ipcMain.handle('repair:get-overlay-state', () => _activeState);
}

module.exports = {
  registerIPC,
  destroyOverlay,
  pushProgress,
  setActiveRepair,
  clearActiveRepair,
  getActiveState,
};
