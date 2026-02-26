// apps/next/main.ts
import { app, BrowserWindow } from 'electron'
const path = require('path');
// import { fileURLToPath } from 'url'
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;

// Necessary for ESM modules in Electron
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)
// const __dirname = path.dirname(fileURLToPath(import.meta.url))

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Useful for connecting to your local Node server IP
      // Todo: remove websecurty false and use proper CORS headers in your Node server for production
    },
  })


  if (app.isPackaged) {
    // In production, load the local HTML file
    win.loadFile(path.join(__dirname, 'out', 'index.html'))
  } else {
    // In development, load from localhost
    win.loadURL('http://localhost:3000')
  }

  if (!app.isPackaged) {
    win.webContents.openDevTools() // dev
  }
}
const authHeader = Buffer.from('gclient:encryptedSecret_2026_jarv1s').toString('base64');

autoUpdater.requestHeaders = {
  "Authorization": `Basic ${authHeader}`
};

autoUpdater.on('update-available', () => {
  console.log('Update available. Downloading...')
})

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})


// app.commandLine.appendSwitch('ignore-certificate-errors') // dev
// app.commandLine.appendSwitch('allow-insecure-localhost', 'true') // dev
app.whenReady().then(() => {
  createWindow();
  console.log("App is packages: ", app.isPackaged);

  if (app.isPackaged) {
    console.log("Looking for updates...")
    autoUpdater.checkForUpdatesAndNotify().then(r => console.log(r));
    autoUpdater.logger = console;
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})