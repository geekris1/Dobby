import { create } from 'zustand'
import { GatewayMessage } from '../api/gatewayClient'
import { useGatewayStore } from './gatewayStore'
import { useSettingsStore } from './settingsStore'
import {
  localId,
  getSystemPrompt,
  buildOpenAIMessages,
  startDirectApiStream
} from './chatHelpers'

export type ToolCall = {
  id?: string
  tool: string
  args: string
  status: string
}

export type ToolResult = {
  tool_call_id?: string
  tool: string
  output: string
  exitCode?: number
  imageDataUrl?: string
  imageDataUrls?: string[]
}

export type ChatMessage = {
  id: string
  requestId?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoningContent?: string
  toolCalls: ToolCall[]
  toolResults: ToolResult[]
  pending: boolean
  error?: string
}

export type ChatState = {
  messages: ChatMessage[]
  input: string
  streaming: boolean
  abortStream: (() => void) | null
  setInput: (v: string) => void
  sendMessage: () => Promise<void> | void
  stopGeneration: () => void
  canSend: () => boolean
  handleResponse: (msg: GatewayMessage) => void
  handleToolCall: (msg: GatewayMessage) => void
  handleToolResult: (msg: GatewayMessage) => void
  handleError: (msg: GatewayMessage) => void
  clearMessages: () => void
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

  sendMessage: async () => {
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

      const systemPrompt = await getSystemPrompt()
      const apiMessages = buildOpenAIMessages([...messages, userMsg], systemPrompt)

      startDirectApiStream(assistantId, directConfig, apiMessages, set, get, systemPrompt)
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
