import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type ChatMessage = {
  role: string
  content: string | null | ContentPart[]
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

type ChatStreamConfig = {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  enableTools?: boolean
}

type ToolCallInfo = {
  id: string
  name: string
  arguments: string
}

type ToolResult = {
  success: boolean
  content: string
  details?: unknown
  imageDataUrl?: string
  imageDataUrls?: string[]
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
  },
  onChatStreamToolCalls: (
    callback: (data: { toolCalls: ToolCallInfo[]; reasoningContent?: string }) => void
  ): (() => void) => {
    const handler = (
      _e: IpcRendererEvent,
      data: { toolCalls: ToolCallInfo[]; reasoningContent?: string }
    ): void => callback(data)
    ipcRenderer.on('chat-stream-tool-calls', handler)
    return () => ipcRenderer.removeListener('chat-stream-tool-calls', handler)
  },
  toolGetDefinitions: (): Promise<unknown[]> => ipcRenderer.invoke('tool-get-definitions'),
  toolExecute: (name: string, args: Record<string, unknown>): Promise<ToolResult> =>
    ipcRenderer.invoke('tool-execute', name, args)
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
