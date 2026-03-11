import { app, shell, BrowserWindow, ipcMain, net } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync } from 'fs'
import icon from '../../resources/icon.png?asset'

let currentStreamAbort: AbortController | null = null

type ChatStreamConfig = {
  baseUrl: string
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
}

async function handleChatStream(
  sender: Electron.WebContents,
  config: ChatStreamConfig
): Promise<void> {
  currentStreamAbort?.abort()
  const abortController = new AbortController()
  currentStreamAbort = abortController

  const url = `${config.baseUrl}/chat/completions`

  let response: Response
  try {
    response = await net.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: config.messages,
        stream: true
      }),
      signal: abortController.signal
    })
  } catch (err) {
    if (abortController.signal.aborted) return
    sender.send(
      'chat-stream-error',
      err instanceof Error ? err.message : '网络请求失败'
    )
    return
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      detail = body?.error?.message ?? JSON.stringify(body)
    } catch {
      detail = response.statusText
    }
    sender.send('chat-stream-error', `API 错误 (${response.status}): ${detail}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    sender.send('chat-stream-error', '无法读取响应流')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue
        if (trimmed === 'data: [DONE]') {
          sender.send('chat-stream-done')
          currentStreamAbort = null
          return
        }
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6))
            const content = json.choices?.[0]?.delta?.content
            if (content) sender.send('chat-stream-chunk', content)
          } catch {
            /* skip malformed chunks */
          }
        }
      }
    }
    sender.send('chat-stream-done')
  } catch (err) {
    if (!abortController.signal.aborted) {
      sender.send('chat-stream-error', err instanceof Error ? err.message : '流读取失败')
    }
  } finally {
    currentStreamAbort = null
  }
}

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

app.setName('Dobby')

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.isPackaged ? 'com.dobby.app' : process.execPath)
  }

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
    currentStreamAbort?.abort()
    currentStreamAbort = null
  })

  if (process.platform === 'darwin') {
    app.dock.setIcon(icon)
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
