const { contextBridge, ipcRenderer } = require('electron');

// ── IPC Channel Allowlist ────────────────────────────────────────────────────
// Only channels matching these prefixes are forwarded to the renderer.
const ALLOWED_INVOKE_PREFIXES = [
  'system:', 'tweak:', 'repair:', 'cleaner:', 'wdebloat:',
  'appinstall:', 'appuninstall:', 'space:', 'software:',
  'obs:', 'gameprofile:', 'vconfig:', 'network:', 'preset:',
  'updater:', 'gpu:', 'app:', 'window-is-maximized',
  'overlay:', 'health:', 'advisor:',
  'resolution:', 'startup:',
];
const ALLOWED_SEND_PREFIXES = [
  'window-', 'app:', 'splash:',
];
const ALLOWED_ON_PREFIXES = [
  'hw-info-update', 'realtime-hw-update', 'wdebloat:', 'appinstall:',
  'appuninstall:', 'space:', 'software:', 'repair:', 'window-maximized-changed',
  'updater:', 'gpu:', 'splash:', 'overlay:',
];

function isAllowed(channel, prefixes) {
  return prefixes.some(p => channel === p || channel.startsWith(p));
}

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => {
      if (!isAllowed(channel, ALLOWED_INVOKE_PREFIXES)) {
        return Promise.reject(new Error(`IPC channel blocked: ${channel}`));
      }
      return ipcRenderer.invoke(channel, ...args);
    },
    send: (channel, ...args) => {
      if (!isAllowed(channel, ALLOWED_SEND_PREFIXES)) return;
      ipcRenderer.send(channel, ...args);
    },
    on: (channel, func) => {
      if (!isAllowed(channel, ALLOWED_ON_PREFIXES)) return () => {};
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once: (channel, func) => {
      if (!isAllowed(channel, ALLOWED_ON_PREFIXES)) return;
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    },
    removeAllListeners: (channel) => {
      if (!isAllowed(channel, ALLOWED_ON_PREFIXES)) return;
      ipcRenderer.removeAllListeners(channel);
    },
  },
  getAppPath: () => ipcRenderer.invoke('app:get-path'),
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    onMaximizedChange: (callback) => {
      const subscription = (event, isMaximized) => callback(isMaximized);
      ipcRenderer.on('window-maximized-changed', subscription);
      return () => ipcRenderer.removeListener('window-maximized-changed', subscription);
    },
  },
  gpu: {
    getStatus:   () => ipcRenderer.invoke('gpu:get-status'),
    getHwAccel:  () => ipcRenderer.invoke('gpu:get-hw-accel'),
    setHwAccel:  (enabled) => ipcRenderer.invoke('gpu:set-hw-accel', enabled),
    relaunch:    () => ipcRenderer.invoke('app:relaunch'),
    onStatusChanged: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('gpu:status-changed', subscription);
      return () => ipcRenderer.removeListener('gpu:status-changed', subscription);
    },
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    cancelUpdate: () => ipcRenderer.invoke('updater:cancel'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    getVersion: () => ipcRenderer.invoke('updater:get-version'),
    onStatus: (callback) => {
      const subscription = (event, data) => callback(data);
      ipcRenderer.on('updater:status', subscription);
      return () => ipcRenderer.removeListener('updater:status', subscription);
    },
  },
});
