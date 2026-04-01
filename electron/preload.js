const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  fullscreen: () => ipcRenderer.send('window:fullscreen'),
  listMusicFiles: () => ipcRenderer.invoke('list-music-files'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  // Auto-updater
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
  // Deep link handler
  onDeepLink: (callback) => {
    const handler = (_event, url) => callback(url);
    ipcRenderer.on('deep-link', handler);
    return () => ipcRenderer.removeListener('deep-link', handler);
  },
});
