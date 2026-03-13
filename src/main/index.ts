import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync } from 'fs'
import icon from '../../resources/icon.png?asset'
import { getOpenAIToolDefinitions, executeTool } from '../agent/tools'
import { handleChatStream, abortCurrentStream, ChatStreamConfig } from './chatStream'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 680,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('open-path', async (_event, path: string) => {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true })
    }
    return shell.openPath(path)
  })

  ipcMain.handle('get-platform', () => process.platform)

  ipcMain.handle('get-home-dir', () => homedir())

  ipcMain.handle('chat-stream-start', (event, config: ChatStreamConfig) => {
    handleChatStream(event.sender, config)
  })

  ipcMain.handle('chat-stream-abort', () => {
    abortCurrentStream()
  })

  ipcMain.handle('tool-get-definitions', () => {
    return getOpenAIToolDefinitions()
  })

  ipcMain.handle(
    'tool-execute',
    async (_event, name: string, args: Record<string, unknown>) => {
      return await executeTool(name, args)
    }
  )
}

app.setName('Dobby')

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.isPackaged ? 'com.dobby.app' : process.execPath)
  }

  registerIpcHandlers()

  if (process.platform === 'darwin') {
    app.dock?.setIcon(icon)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
