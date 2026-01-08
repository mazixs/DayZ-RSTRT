import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import Store from 'electron-store'
import { RconService } from './rcon'
import { TelemetryServer } from './telemetry'

// Initialize local store
const store = new Store()
const rcon = new RconService()
const telemetry = new TelemetryServer()

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
let statusInterval: NodeJS.Timeout | null = null

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function startPolling() {
  if (statusInterval) clearInterval(statusInterval)
  statusInterval = setInterval(async () => {
    if (rcon.isConnected() && win) {
      try {
        const players = await rcon.getPlayers()
        win.webContents.send('rcon-update', {
          players,
          playerCount: players.length,
          timestamp: Date.now()
        })
      } catch (e) {
        console.error('Polling error:', e)
        // Check if connection was lost (e.g. max retries reached in RconService)
        if (!rcon.isConnected()) {
          console.warn('RCON Disconnected detected in polling loop')
          win.webContents.send('rcon-disconnected')
          stopPolling()
        }
      }
    } else {
      // Safety check: if we're not connected but polling is running
      stopPolling()
    }
  }, 5000) // Poll every 5 seconds
}

function stopPolling() {
  if (statusInterval) {
    clearInterval(statusInterval)
    statusInterval = null
  }
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Pass window to telemetry server
  telemetry.setMainWindow(win)

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })
  
  // Clean up on close
  win.on('closed', () => {
    stopPolling()
    win = null
    telemetry.setMainWindow(null as any)
  })

  if (VITE_DEV_SERVER_URL) {
    console.log('Loading URL:', VITE_DEV_SERVER_URL)
    const loadLoop = () => {
      win?.loadURL(VITE_DEV_SERVER_URL).catch((e) => {
        console.error('Failed to load URL, retrying in 1s...', e.code)
        setTimeout(loadLoop, 1000)
      })
    }
    loadLoop()
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST || '', 'index.html'))
  }
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return store.store
})

ipcMain.handle('save-settings', (_event, settings) => {
  store.set(settings)
  return true
})

// RCON Handlers
ipcMain.handle('rcon-connect', async (_event, config) => {
  console.log('[RCON] Connect request received with config:', JSON.stringify(config, null, 2)); // Debug log

  // Normalize config from either direct args or store
  const connectionConfig = {
    host: config?.host || config?.rconHost || store.get('rconHost'),
    port: config?.port || config?.rconPort || store.get('rconPort'),
    password: config?.password || config?.rconPassword || store.get('rconPassword')
  }
  
  if (!connectionConfig.host || !connectionConfig.port || !connectionConfig.password) {
    console.error('[RCON] Invalid config:', connectionConfig);
    throw new Error('Invalid RCON configuration: Host, Port, or Password missing')
  }

  const connected = await rcon.connect(connectionConfig)
  if (connected) {
    startPolling()
  }
  return connected
})

ipcMain.handle('rcon-disconnect', async () => {
  stopPolling()
  return await rcon.disconnect()
})

ipcMain.handle('rcon-send', async (_event, command) => {
  return await rcon.send(command)
})

ipcMain.handle('rcon-status', () => {
  return rcon.isConnected()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    telemetry.stop() // Stop telemetry server
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  telemetry.start(3000) // Start telemetry on port 3000
})
