import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  safeStorage,
  shell,
} from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import electronUpdater from 'electron-updater'

const {autoUpdater} = electronUpdater

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const createSplash = () => {
  const splash = new BrowserWindow({
    width: 420,
    height: 260,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: {nodeIntegration: false},
  })
  splash.loadFile(path.join(__dirname, 'splash.html'))
  return splash
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // revealed after splash
    icon: path.join(__dirname, 'build', 'icon.ico'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: 'rgba(0, 0, 0, 0)',
      symbolColor: '#888888',
      height: 28,
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false, // preload needs Node built-ins (path, require) to load .node addon
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'out', 'index.html'))
  } else {
    win.loadURL('http://localhost:3000')
  }

  if (!app.isPackaged) {
    win.webContents.openDevTools()
  }

  return win
}

let mainWindow = null

const authHeader = Buffer.from('gclient:encryptedSecret_2026_jarv1s').toString(
  'base64'
)
autoUpdater.requestHeaders = {
  Authorization: `Basic ${authHeader}`,
}

autoUpdater.on('update-available', () => {
  console.log('Update available. Downloading...')
})

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update-progress', Math.round(progress.percent))
})

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-ready')
})

ipcMain.handle('get-version', () => app.getVersion())

// Deferred so app.getPath('userData') is only called after app.whenReady()
const getSafeStorePath = () =>
  path.join(app.getPath('userData'), 'identity.enc')

ipcMain.handle('save-identity-file', async (_, jsonContent) => {
  const {filePath, canceled} = await dialog.showSaveDialog({
    title: 'Save Identity File',
    defaultPath: path.join(
      app.getPath('downloads'),
      'geechat-identity.geechat-identity'
    ),
    filters: [{name: 'GeeChat Identity', extensions: ['geechat-identity']}],
  })
  if (canceled || !filePath) return {ok: false}
  fs.writeFileSync(filePath, jsonContent, 'utf8')
  return {ok: true}
})

ipcMain.handle('load-identity-file', async () => {
  const {filePaths, canceled} = await dialog.showOpenDialog({
    title: 'Open Identity File',
    filters: [
      {
        name: 'GeeChat Identity',
        extensions: ['geechat-identity', 'json'],
      },
    ],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return null

  return fs.readFileSync(filePaths[0], 'utf8')
})

ipcMain.handle('select-pfp', async () => {
  const {filePaths, canceled} = await dialog.showOpenDialog({
    title: 'Select Profile Picture',
    filters: [
      {
        name: 'Images',
        extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      },
    ],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return null
  const buf = fs.readFileSync(filePaths[0])
  const ext = path.extname(filePaths[0]).slice(1).toLowerCase()
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
  return `data:${mime};base64,${buf.toString('base64')}`
})

ipcMain.handle('safestore-set', (_, plaintext) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('safeStorage encryption unavailable on this system')
  }
  const encrypted = safeStorage.encryptString(plaintext)
  fs.writeFileSync(getSafeStorePath(), encrypted)
})

ipcMain.handle('safestore-get', () => {
  const p = getSafeStorePath()
  console.log(p)
  if (!fs.existsSync(p)) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  const encrypted = fs.readFileSync(p)
  return safeStorage.decryptString(encrypted)
})

ipcMain.handle('safestore-clear', () => {
  const p = getSafeStorePath()
  if (fs.existsSync(p)) fs.unlinkSync(p)
})

// Open URLs in the default system browser — never inside the Electron window
ipcMain.handle('open-external', (_, url) => {
  if (
    typeof url === 'string' &&
    (url.startsWith('http://') || url.startsWith('https://'))
  ) {
    return shell.openExternal(url)
  }
})

// User clicked "Restart & Update":
// 1. Remove window-all-closed listener so destroying windows doesn't trigger app.quit()
//    in parallel with quitAndInstall (they'd race, leaving file locks open for NSIS).
// 2. setImmediate defers quitAndInstall to the next event-loop tick so all window
//    destruction callbacks finish before we hand off to the installer.
// 3. isSilent=false lets NSIS show a "close the app" prompt as a fallback if any
//    file handle is still open, instead of failing silently with exit code 2.
ipcMain.on('install-update', () => {
  app.removeAllListeners('window-all-closed')
  BrowserWindow.getAllWindows().forEach((w) => w.destroy())
  setImmediate(() => autoUpdater.quitAndInstall(false, true))
})

app.whenReady().then(() => {
  app.setAppUserModelId('ie.REDACTED_USERNAME.geechat')
  Menu.setApplicationMenu(null)

  const splash = createSplash()
  const win = createWindow()
  mainWindow = win

  // Prevent renderer from navigating away from the app (e.g. link clicks bypassing our dialog)
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const isLocal =
      navigationUrl.startsWith('http://localhost') ||
      navigationUrl.startsWith('file://')
    if (!isLocal) event.preventDefault()
  })
  // Block window.open() from spawning new browser windows
  win.webContents.setWindowOpenHandler(() => ({action: 'deny'}))

  const splashStart = Date.now()
  win.once('ready-to-show', () => {
    const elapsed = Date.now() - splashStart
    const remaining = Math.max(0, 1_500 - elapsed)
    setTimeout(() => {
      splash.destroy()
      win.show()
    }, remaining)
  })

  console.log('App is packaged:', app.isPackaged)

  if (app.isPackaged) {
    console.log('Looking for updates...')
    autoUpdater.checkForUpdatesAndNotify().then((r) => console.log(r))
    autoUpdater.logger = console
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
