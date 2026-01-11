import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import Store from 'electron-store'
import { RconService } from './rcon'
import { TelemetryServer } from './telemetry'
import { ProcessManager } from './process-manager'
import { SchedulerService } from './scheduler'

// Initialize local store
const store = new Store()
const rcon = new RconService()
const telemetry = new TelemetryServer()
const processManager = new ProcessManager()
const scheduler = new SchedulerService(rcon, processManager)

// Load saved scheduler settings
const savedMessages = store.get('messages');
if (savedMessages) {
    scheduler.setMessages(savedMessages as any);
}
const savedInterval = store.get('restartInterval') as number;
const schedulerEnabled = store.get('schedulerEnabled') as boolean;
if (schedulerEnabled && savedInterval) {
    // Auto-start scheduler if it was enabled
    scheduler.start(savedInterval);
}

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
let statusInterval: NodeJS.Timeout | null = null

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function startPolling() {
  if (statusInterval) clearInterval(statusInterval)
  statusInterval = setInterval(async () => {
    // console.log('[Polling] Tick...'); 
    if (rcon.isConnected() && win) {
      try {
        console.log('[Polling] Requesting players...');
        const players = await rcon.getPlayers()
        console.log(`[Polling] Got ${players.length} players`);
        
        win.webContents.send('rcon-update', {
          players,
          playerCount: players.length,
          timestamp: Date.now()
        })
      } catch (e) {
        console.error('[Polling] Error:', e)
        // Check if connection was lost (e.g. max retries reached in RconService)
        if (!rcon.isConnected()) {
          console.warn('[Polling] RCON Disconnected detected in loop')
          win.webContents.send('rcon-disconnected')
          stopPolling()
        }
      }
    } else {
      // Safety check: if we're not connected but polling is running
      // Notify frontend that we are stopping
      if (!rcon.isConnected() && win) {
          win.webContents.send('rcon-disconnected')
      }
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

  // Pass window to services
  telemetry.setMainWindow(win)
  scheduler.setMainWindow(win)

  // Listen for ProcessManager events
  processManager.on('status-change', (status) => {
    win?.webContents.send('process-status-change', status)
  })

  processManager.on('crash', () => {
    win?.webContents.send('process-crash')
  })

  processManager.on('error', (err) => {
    win?.webContents.send('process-error', err.message)
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })
  
  // Clean up on close
  win.on('closed', () => {
    stopPolling()
    win = null
    telemetry.setMainWindow(null as any)
    scheduler.setMainWindow(null as any)
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

// Process Manager Handlers
ipcMain.handle('process-start', async (_event, config) => {
    // Config: { executablePath: string, args: string[], autoRestart: boolean }
    processManager.configure(config.executablePath, config.args, config.autoRestart);
    await processManager.start();
    return true;
});

ipcMain.handle('process-stop', async (_event, force) => {
    await processManager.stop(force);
    return true;
});

ipcMain.handle('process-status', () => {
    return processManager.isRunning();
});

// Scheduler Handlers
ipcMain.handle('scheduler-start', (_event, intervalMinutes) => {
    scheduler.start(intervalMinutes);
    return true;
});

ipcMain.handle('scheduler-stop', () => {
    scheduler.stop();
    return true;
});

ipcMain.handle('scheduler-status', () => {
    return scheduler.getStatus();
});

ipcMain.handle('scheduler-set-messages', (_event, messages) => {
    scheduler.setMessages(messages);
    return true;
});


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    telemetry.stop() // Stop telemetry server
    scheduler.stop() // Stop scheduler
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
