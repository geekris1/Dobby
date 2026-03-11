import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

type ChatStreamConfig = {
  baseUrl: string
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
}

const api = {
  openPath: (path: string): Promise<string> => ipcRenderer.invoke('open-path', path),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),
  getHomeDir: (): Promise<string> => ipcRenderer.invoke('get-home-dir'),
  chatStreamStart: (config: ChatStreamConfig): Promise<void> =>
    ipcRenderer.invoke('chat-stream-start', config),
  chatStreamAbort: (): Promise<void> => ipcRenderer.invoke('chat-stream-abort'),
  onChatStreamChunk: (callback: (content: string) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, content: string): void => callback(content)
    ipcRenderer.on('chat-stream-chunk', handler)
    return () => ipcRenderer.removeListener('chat-stream-chunk', handler)
  },
  onChatStreamDone: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('chat-stream-done', handler)
    return () => ipcRenderer.removeListener('chat-stream-done', handler)
  },
  onChatStreamError: (callback: (error: string) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, error: string): void => callback(error)
    ipcRenderer.on('chat-stream-error', handler)
    return () => ipcRenderer.removeListener('chat-stream-error', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.api = api
}
