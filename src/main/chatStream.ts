import { net } from 'electron'
import { getOpenAIToolDefinitions, setWebSearchConfig } from '../agent/tools'

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

type ChatMessage = {
  role: string
  content: string | null | ContentPart[]
  reasoning_content?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

export type ChatStreamConfig = {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  enableTools?: boolean
}

type ToolCallDelta = {
  index: number
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}

let currentAbort: AbortController | null = null

export function abortCurrentStream(): void {
  currentAbort?.abort()
  currentAbort = null
}

function configureToolProviders(config: ChatStreamConfig): void {
  const isKimi =
    config.baseUrl.includes('moonshot.cn') || config.baseUrl.includes('moonshot.ai')
  setWebSearchConfig({
    provider: isKimi ? 'kimi' : 'tavily',
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model
  })
}

async function fetchChatStream(
  config: ChatStreamConfig,
  signal: AbortSignal
): Promise<Response> {
  const url = `${config.baseUrl}/chat/completions`

  const body: Record<string, unknown> = {
    model: config.model,
    messages: config.messages,
    stream: true
  }

  if (config.enableTools) {
    const toolDefs = getOpenAIToolDefinitions()
    body.tools = toolDefs
    console.log(`[Dobby] Sending ${toolDefs.length} tool definitions to LLM`)
  }

  return net.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(body),
    signal
  })
}

type StreamEvents = {
  onChunk: (content: string) => void
  onDone: () => void
  onError: (error: string) => void
  onToolCalls: (toolCalls: Array<{ id: string; name: string; arguments: string }>, reasoningContent?: string) => void
}

function parseSSELine(
  json: Record<string, unknown>,
  state: {
    pendingToolCalls: Map<number, { id: string; name: string; arguments: string }>
    reasoningContent: string
  },
  events: StreamEvents
): 'tool_calls_done' | 'continue' {
  const choice = (json as { choices?: Array<Record<string, unknown>> }).choices?.[0]
  const delta = choice?.delta as Record<string, unknown> | undefined

  if (delta?.content) {
    events.onChunk(delta.content as string)
  }

  if (delta?.reasoning_content) {
    state.reasoningContent += delta.reasoning_content as string
  }

  const toolCallsDelta = delta?.tool_calls
  if (toolCallsDelta && Array.isArray(toolCallsDelta)) {
    for (const tc of toolCallsDelta as ToolCallDelta[]) {
      const idx = tc.index ?? 0
      const existing = state.pendingToolCalls.get(idx)
      if (existing) {
        if (tc.function?.name) existing.name = existing.name || tc.function.name
        if (tc.function?.arguments) existing.arguments += tc.function.arguments
        if (tc.id) existing.id = existing.id || tc.id
      } else {
        state.pendingToolCalls.set(idx, {
          id: tc.id ?? '',
          name: tc.function?.name ?? '',
          arguments: tc.function?.arguments ?? ''
        })
      }
    }
  }

  const finishReason = choice?.finish_reason
  if (finishReason === 'tool_calls' && state.pendingToolCalls.size > 0) {
    return 'tool_calls_done'
  }

  return 'continue'
}

async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  events: StreamEvents
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''

  const state = {
    pendingToolCalls: new Map<number, { id: string; name: string; arguments: string }>(),
    reasoningContent: ''
  }

  const emitToolCalls = (): void => {
    const toolCalls = Array.from(state.pendingToolCalls.values())
    console.log('[Dobby] Tool calls received:', JSON.stringify(toolCalls))
    events.onToolCalls(toolCalls, state.reasoningContent || undefined)
  }

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
        if (state.pendingToolCalls.size > 0) {
          emitToolCalls()
        } else {
          events.onDone()
        }
        return
      }

      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6))
          const result = parseSSELine(json, state, events)
          if (result === 'tool_calls_done') {
            emitToolCalls()
            return
          }
        } catch {
          /* skip malformed chunks */
        }
      }
    }
  }

  if (state.pendingToolCalls.size > 0) {
    emitToolCalls()
  } else {
    events.onDone()
  }
}

export async function handleChatStream(
  sender: Electron.WebContents,
  config: ChatStreamConfig
): Promise<void> {
  configureToolProviders(config)

  currentAbort?.abort()
  const abortController = new AbortController()
  currentAbort = abortController

  let response: Response
  try {
    response = await fetchChatStream(config, abortController.signal)
  } catch (err) {
    if (abortController.signal.aborted) return
    sender.send('chat-stream-error', err instanceof Error ? err.message : '网络请求失败')
    return
  }

  if (!response.ok) {
    let detail = ''
    try {
      const respBody = (await response.json()) as { error?: { message?: string } }
      detail = respBody?.error?.message ?? JSON.stringify(respBody)
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

  try {
    await processStream(reader, {
      onChunk: (content) => sender.send('chat-stream-chunk', content),
      onDone: () => sender.send('chat-stream-done'),
      onError: (error) => sender.send('chat-stream-error', error),
      onToolCalls: (toolCalls, reasoningContent) => {
        sender.send('chat-stream-tool-calls', { toolCalls, reasoningContent })
      }
    })
  } catch (err) {
    if (!abortController.signal.aborted) {
      sender.send('chat-stream-error', err instanceof Error ? err.message : '流读取失败')
    }
  } finally {
    currentAbort = null
  }
}
