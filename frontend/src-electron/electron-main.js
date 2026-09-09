import { app, BrowserWindow, globalShortcut } from 'electron'
import path from 'node:path'
import os from 'node:os'
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from '#q-app/electron/main'

const platform = process.platform || os.platform()

async function createWindow () {
  const mainWindow = new BrowserWindow({
    icon: resolveElectronAssetsPath('icons/icon.png'),
    width: 1200,
    height: 750,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(import.meta.dirname, 'electron-preload.cjs')
    }
  })

  if (import.meta.env.QUASAR_DEV) {
    await mainWindow.loadURL(import.meta.env.QUASAR_APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  // Permitir la apertura de DevTools mediante F12 o Ctrl+Shift+I para diagnósticos en Windows/Linux
  globalShortcut.register('F12', () => {
    mainWindow.webContents.toggleDevTools()
  })

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    mainWindow.webContents.toggleDevTools()
  })

  if (import.meta.env.QUASAR_DEBUG) {
    mainWindow.webContents.openDevTools()
  }
}

void app.whenReady().then(() => {
  registerQuasarRuntime()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})
