import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;

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
    webPreferences: { nodeIntegration: false },
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
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
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

const authHeader = Buffer.from('gclient:encryptedSecret_2026_jarv1s').toString('base64');
autoUpdater.requestHeaders = {
  "Authorization": `Basic ${authHeader}`
};

autoUpdater.on('update-available', () => {
  console.log('Update available. Downloading...')
})

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update-progress', Math.round(progress.percent))
})

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-ready')
})

// User clicked "Restart & Update" — destroy windows first to release file locks,
// then hand off to the installer so it can replace the old build cleanly
ipcMain.on('install-update', () => {
  BrowserWindow.getAllWindows().forEach(w => w.destroy())
  autoUpdater.quitAndInstall(true, true)
})

app.whenReady().then(() => {
  app.setAppUserModelId('ie.milan.geechat')
  Menu.setApplicationMenu(null)

  const splash = createSplash()
  const win = createWindow()
  mainWindow = win

  const splashStart = Date.now()
  win.once('ready-to-show', () => {
    const elapsed = Date.now() - splashStart
    const remaining = Math.max(0, 3000 - elapsed)
    setTimeout(() => {
      splash.destroy()
      win.show()
    }, remaining)
  })

  console.log("App is packaged:", app.isPackaged)

  if (app.isPackaged) {
    console.log("Looking for updates...")
    autoUpdater.checkForUpdatesAndNotify().then(r => console.log(r))
    autoUpdater.logger = console
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
