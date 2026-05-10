const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    on_skin_updated: cb => ipcRenderer.on('skin-updated', cb),
    select_skin: () => ipcRenderer.invoke('select-skin'),
    set_always_on_top: enabled => ipcRenderer.invoke('set-always-on-top', enabled),
});
