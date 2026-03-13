import {
  streamChatCompletion,
  OpenAIChatMessage,
  ContentPart,
  ToolCallInfo
} from '../api/openaiClient'
import type { ChatMessage, ChatState } from './chatStore'

let seq = 0
export const localId = (): string => `local-${++seq}-${Date.now()}`

let cachedSystemPrompt: string | null = null

export async function getSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt) return cachedSystemPrompt
  try {
    const platform = await window.api.getPlatform()
    const homeDir = await window.api.getHomeDir()
    cachedSystemPrompt = [
      'You are Dobby, a helpful desktop AI assistant with access to various tools.',
      '',
      `System environment: platform=${platform}, home_directory=${homeDir}`,
      '',
      'IMPORTANT RULES:',
      '- You MUST use the web_search tool to search for any real-time or current information (news, weather, prices, events, etc.). NEVER fabricate URLs or information.',
      '- You MUST use the web_fetch tool to read the content of a specific URL. NEVER make up webpage content.',
      '- You MUST use the image_read tool when the user asks you to look at, analyze, describe, or read any image file. Pass the absolute file path to the tool.',
      '- You MUST use the pdf_read tool when the user asks you to read, analyze, or summarize a PDF file. Pass the absolute file path to the tool. You can specify page ranges like "1-5" or "1,3,7".',
      '- When the user asks about current events, news, or anything that requires up-to-date information, ALWAYS call web_search first.',
      '- When using tools that require file paths, always use actual absolute paths based on the system environment above. Never use placeholder paths.',
      '- If a task can be accomplished with available tools, prefer using tools over generating text from your training data.'
    ].join('\n')
  } catch {
    cachedSystemPrompt =
      'You are Dobby, a helpful desktop AI assistant with access to various tools.'
  }
  return cachedSystemPrompt
}

export function buildOpenAIMessages(
  messages: ChatMessage[],
  systemPrompt?: string
): OpenAIChatMessage[] {
  const result: OpenAIChatMessage[] = []

  if (systemPrompt) {
    result.push({ role: 'system', content: systemPrompt })
  }

  for (const m of messages) {
    if (m.role === 'user') {
      if (m.content.trim()) {
        result.push({ role: 'user', content: m.content })
      }
    } else if (m.role === 'assistant') {
      if (m.toolCalls.length > 0) {
        const assistantMsg: OpenAIChatMessage = {
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls
            .filter((tc) => tc.id)
            .map((tc) => ({
              id: tc.id!,
              type: 'function' as const,
              function: { name: tc.tool, arguments: tc.args }
            }))
        }
        if (m.reasoningContent) {
          assistantMsg.reasoning_content = m.reasoningContent
        }
        result.push(assistantMsg)

        const pendingImages: ContentPart[] = []

        for (const tr of m.toolResults) {
          if (tr.tool_call_id) {
            result.push({
              role: 'tool',
              content: tr.output,
              tool_call_id: tr.tool_call_id
            })
          }

          if (tr.imageDataUrl) {
            pendingImages.push({ type: 'image_url', image_url: { url: tr.imageDataUrl } })
          }
          if (tr.imageDataUrls) {
            for (const url of tr.imageDataUrls) {
              pendingImages.push({ type: 'image_url', image_url: { url } })
            }
          }
        }

        if (pendingImages.length > 0) {
          const parts: ContentPart[] = [
            ...pendingImages,
            { type: 'text', text: '以上是工具读取的图片内容，请根据用户的问题分析这些图片。' }
          ]
          result.push({ role: 'user', content: parts })
        }
      } else if (m.content.trim()) {
        result.push({ role: 'assistant', content: m.content })
      }
    }
  }

  return result
}

type ToolExecResult = {
  tool_call_id: string
  tool: string
  output: string
  imageDataUrl?: string
  imageDataUrls?: string[]
}

export async function executeToolCalls(
  toolCalls: ToolCallInfo[]
): Promise<ToolExecResult[]> {
  const results: ToolExecResult[] = []

  for (const tc of toolCalls) {
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(tc.arguments || '{}')
    } catch {
      args = {}
    }

    try {
      const result = await window.api.toolExecute(tc.name, args)
      results.push({
        tool_call_id: tc.id,
        tool: tc.name,
        output: result.content,
        imageDataUrl: result.imageDataUrl,
        imageDataUrls: result.imageDataUrls
      })
    } catch (err) {
      results.push({
        tool_call_id: tc.id,
        tool: tc.name,
        output: `Error: ${err instanceof Error ? err.message : String(err)}`
      })
    }
  }

  return results
}

type SetState = {
  (fn: (s: ChatState) => Partial<ChatState>): void
  (partial: Partial<ChatState>): void
}

export function startDirectApiStream(
  assistantId: string,
  directConfig: { baseUrl: string; apiKey: string; model: string },
  apiMessages: OpenAIChatMessage[],
  set: SetState,
  get: () => ChatState,
  systemPrompt?: string
): void {
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
      },
      onToolCalls: async (toolCalls, reasoningContent) => {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  reasoningContent: reasoningContent || m.reasoningContent,
                  toolCalls: toolCalls.map((tc) => ({
                    id: tc.id,
                    tool: tc.name,
                    args: tc.arguments,
                    status: 'running'
                  }))
                }
              : m
          )
        }))

        const results = await executeToolCalls(toolCalls)

        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  toolCalls: m.toolCalls.map((tc) => ({ ...tc, status: 'done' })),
                  toolResults: results.map((r) => ({
                    tool_call_id: r.tool_call_id,
                    tool: r.tool,
                    output: r.output,
                    imageDataUrl: r.imageDataUrl,
                    imageDataUrls: r.imageDataUrls
                  })),
                  pending: false
                }
              : m
          )
        }))

        const currentMessages = get().messages
        const allApiMessages = buildOpenAIMessages(currentMessages, systemPrompt)

        const nextAssistantId = localId()
        const nextAssistantMsg: ChatMessage = {
          id: nextAssistantId,
          role: 'assistant',
          content: '',
          toolCalls: [],
          toolResults: [],
          pending: true
        }

        set((s) => ({
          messages: [...s.messages, nextAssistantMsg],
          streaming: true
        }))

        startDirectApiStream(
          nextAssistantId,
          directConfig,
          allApiMessages,
          set,
          get,
          systemPrompt
        )
      }
    },
    true
  )

  set({ abortStream: abort })
}
