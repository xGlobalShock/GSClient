const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, func) => {
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      // Return unsubscribe function for cleanup
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once: (channel, func) => ipcRenderer.once(channel, (event, ...args) => func(...args)),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
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
});
