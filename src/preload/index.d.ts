import { ElectronAPI } from '@electron-toolkit/preload'

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

interface ChatMessage {
  role: string
  content: string | null | ContentPart[]
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

interface ChatStreamConfig {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  enableTools?: boolean
}

interface ToolCallInfo {
  id: string
  name: string
  arguments: string
}

interface ToolResult {
  success: boolean
  content: string
  details?: unknown
  imageDataUrl?: string
  imageDataUrls?: string[]
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
  onChatStreamToolCalls: (callback: (data: { toolCalls: ToolCallInfo[]; reasoningContent?: string }) => void) => () => void
  toolGetDefinitions: () => Promise<unknown[]>
  toolExecute: (name: string, args: Record<string, unknown>) => Promise<ToolResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: DobbyAPI
  }
}
