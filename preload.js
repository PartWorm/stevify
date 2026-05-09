const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onSkinUpdated: (callback) => ipcRenderer.on('skin-updated', callback)
});