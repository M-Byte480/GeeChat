// apps/next/main.ts
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

// Necessary for ESM modules in Electron
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
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

  win.webContents.openDevTools() // dev

  if (app.isPackaged) {
    // In production, load the local HTML file
    win.loadFile(path.join(__dirname, 'out', 'index.html'))
  } else {
    // In development, load from localhost
    win.loadURL('http://localhost:3000')
  }

}
app.commandLine.appendSwitch('ignore-certificate-errors') // dev
app.commandLine.appendSwitch('allow-insecure-localhost', 'true') // dev
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})