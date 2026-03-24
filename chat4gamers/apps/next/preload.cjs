const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')

// ── Native audio denoiser ──────────────────────────────────────────────────
// Load the napi-rs .node addon.  The filename is platform-specific; we try the
// packaged path (resources/) first, then the development path (apps/audio-native/).
const { platform, arch } = process
const abi = platform === 'win32' ? '-msvc' : platform === 'linux' ? '-gnu' : ''
const nodeName = `audio-native.${platform}-${arch}${abi}.node`

let denoiser = null
const tryLoad = (filePath) => {
  try {
    const { Denoiser } = require(filePath)
    return new Denoiser()
  } catch {
    return null
  }
}

denoiser =
  tryLoad(path.join(process.resourcesPath ?? '', nodeName)) ??
  tryLoad(path.join(__dirname, '..', 'audio-native', nodeName))

if (!denoiser) {
  console.warn('[audio-native] Native denoiser not loaded — mic will use raw audio')
}

// ── Expose narrow API to the renderer ─────────────────────────────────────
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

  // Synchronous audio frame processing via native RNNoise (.node addon).
  // Called from ScriptProcessorNode.onaudioprocess — must be synchronous.
  // input: Float32Array(480), returns number[](480) or null if native unavailable.
  processAudioFrame: denoiser ? (input) => denoiser.processFrame(Array.from(input)) : null,
})
