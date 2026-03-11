import { ElectronAPI } from '@electron-toolkit/preload'

interface ChatStreamConfig {
  baseUrl: string
  apiKey: string
  model: string
  messages: Array<{ role: string; content: string }>
}

interface DobbyAPI {
  openPath: (path: string) => Promise<string>
  getPlatform: () => Promise<string>
  getHomeDir: () => Promise<string>
  chatStreamStart: (config: ChatStreamConfig) => Promise<void>
  chatStreamAbort: () => Promise<void>
  onChatStreamChunk: (callback: (content: string) => void) => () => void
  onChatStreamDone: (callback: () => void) => () => void
  onChatStreamError: (callback: (error: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: DobbyAPI
  }
}
