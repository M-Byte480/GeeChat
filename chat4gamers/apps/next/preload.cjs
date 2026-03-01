const { contextBridge, ipcRenderer } = require('electron')

// Expose a narrow, named API to the renderer — no raw ipcRenderer access
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Auto-update events — return cleanup functions so callers can unsubscribe
  onUpdateProgress: (callback) => {
    const handler = (_, percent) => callback(percent)
    ipcRenderer.on('update-progress', handler)
    return () => ipcRenderer.removeListener('update-progress', handler)
  },

  onUpdateReady: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('update-ready', handler)
    return () => ipcRenderer.removeListener('update-ready', handler)
  },

  installUpdate: () => ipcRenderer.send('install-update'),

  // Open a URL in the system browser (Electron handles this safely)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Identity file I/O
  saveIdentityFile: (jsonContent) => ipcRenderer.invoke('save-identity-file', jsonContent),
  loadIdentityFile: () => ipcRenderer.invoke('load-identity-file'),
  selectPfp: () => ipcRenderer.invoke('select-pfp'),

  // safeStorage — OS-encrypted identity persistence
  safestoreSet: (plaintext) => ipcRenderer.invoke('safestore-set', plaintext),
  safestoreGet: () => ipcRenderer.invoke('safestore-get'),
  safestoreClear: () => ipcRenderer.invoke('safestore-clear'),
})
