import { create } from 'zustand'
import { GatewayMessage } from '../api/gatewayClient'
import { streamChatCompletion, OpenAIChatMessage } from '../api/openaiClient'
import { useGatewayStore } from './gatewayStore'
import { useSettingsStore } from './settingsStore'

export type ToolCall = {
  tool: string
  args: string
  status: string
}

export type ToolResult = {
  tool: string
  output: string
  exitCode?: number
}

export type ChatMessage = {
  id: string
  requestId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls: ToolCall[]
  toolResults: ToolResult[]
  pending: boolean
  error?: string
}

type ChatState = {
  messages: ChatMessage[]
  input: string
  streaming: boolean
  abortStream: (() => void) | null
  setInput: (v: string) => void
  sendMessage: () => void
  stopGeneration: () => void
  canSend: () => boolean
  handleResponse: (msg: GatewayMessage) => void
  handleToolCall: (msg: GatewayMessage) => void
  handleToolResult: (msg: GatewayMessage) => void
  handleError: (msg: GatewayMessage) => void
  clearMessages: () => void
}

let seq = 0
const localId = (): string => `local-${++seq}-${Date.now()}`

function buildOpenAIMessages(messages: ChatMessage[]): OpenAIChatMessage[] {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim())
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  input: '',
  streaming: false,
  abortStream: null,

  setInput: (input) => set({ input }),

  canSend: () => {
    const settings = useSettingsStore.getState()
    const { client } = useGatewayStore.getState()
    return settings.isDirectApiConfigured() || !!client?.connected
  },

  sendMessage: () => {
    const settings = useSettingsStore.getState()
    const directConfig = settings.getDirectApiConfig()
    const { client } = useGatewayStore.getState()
    const { input, messages } = get()

    if (!input.trim()) return

    const useDirectApi = !!directConfig
    const useGateway = !useDirectApi && !!client?.connected

    if (!useDirectApi && !useGateway) return

    const userMsg: ChatMessage = {
      id: localId(),
      role: 'user',
      content: input,
      toolCalls: [],
      toolResults: [],
      pending: false
    }

    const assistantId = localId()

    if (useDirectApi) {
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        toolCalls: [],
        toolResults: [],
        pending: true
      }

      set((s) => ({
        messages: [...s.messages, userMsg, assistantMsg],
        input: '',
        streaming: true
      }))

      const apiMessages = buildOpenAIMessages([...messages, userMsg])

      const abort = streamChatCompletion(
        directConfig.baseUrl,
        directConfig.apiKey,
        directConfig.model,
        apiMessages,
        {
          onChunk: (content) => {
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + content } : m
              )
            }))
          },
          onDone: () => {
            set((s) => ({
              streaming: false,
              abortStream: null,
              messages: s.messages.map((m) =>
                m.id === assistantId ? { ...m, pending: false } : m
              )
            }))
          },
          onError: (error) => {
            set((s) => ({
              streaming: false,
              abortStream: null,
              messages: s.messages.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content || `错误: ${error}`, error, pending: false }
                  : m
              )
            }))
          }
        }
      )

      set({ abortStream: abort })
    } else if (useGateway && client) {
      const requestId = client.send('chat', {
        text: input,
        options: {
          ...(settings.selectedModel ? { model: settings.selectedModel } : {}),
          no_memory: false
        }
      })

      const assistantMsg: ChatMessage = {
        id: assistantId,
        requestId,
        role: 'assistant',
        content: '',
        toolCalls: [],
        toolResults: [],
        pending: true
      }

      set((s) => ({
        messages: [...s.messages, userMsg, assistantMsg],
        input: ''
      }))
    }
  },

  stopGeneration: () => {
    const { abortStream } = get()
    if (abortStream) {
      abortStream()
      set((s) => ({
        streaming: false,
        abortStream: null,
        messages: s.messages.map((m) => (m.pending ? { ...m, pending: false } : m))
      }))
    }
  },

  handleResponse: (msg) => {
    const payload = msg.payload as { text?: string; tokens_used?: number }
    set((s) => ({
      messages: s.messages.map((m) =>
        m.requestId === msg.id
          ? { ...m, content: payload.text ?? m.content, pending: false }
          : m
      )
    }))
  },

  handleToolCall: (msg) => {
    const p = msg.payload as { tool?: string; args?: string; status?: string }
    set((s) => ({
      messages: s.messages.map((m) =>
        m.requestId === msg.id
          ? {
              ...m,
              toolCalls: [
                ...m.toolCalls,
                { tool: p.tool ?? '', args: p.args ?? '', status: p.status ?? 'running' }
              ]
            }
          : m
      )
    }))
  },

  handleToolResult: (msg) => {
    const p = msg.payload as { tool?: string; output?: string; exit_code?: number }
    set((s) => ({
      messages: s.messages.map((m) =>
        m.requestId === msg.id
          ? {
              ...m,
              toolResults: [
                ...m.toolResults,
                { tool: p.tool ?? '', output: p.output ?? '', exitCode: p.exit_code }
              ]
            }
          : m
      )
    }))
  },

  handleError: (msg) => {
    const p = msg.payload as { message?: string; code?: string }
    set((s) => ({
      messages: s.messages.map((m) =>
        m.requestId === msg.id
          ? {
              ...m,
              content: m.content || `Error: ${p.message ?? 'Unknown error'}`,
              error: p.message ?? 'Unknown error',
              pending: false
            }
          : m
      )
    }))
  },

  clearMessages: () => {
    get().abortStream?.()
    set({ messages: [], streaming: false, abortStream: null })
  }
}))
