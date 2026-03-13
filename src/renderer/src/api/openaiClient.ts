export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export type OpenAIChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null | ContentPart[]
  reasoning_content?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

export type ToolCallInfo = {
  id: string
  name: string
  arguments: string
}

export type StreamCallbacks = {
  onChunk: (content: string) => void
  onDone: () => void
  onError: (error: string) => void
  onToolCalls?: (toolCalls: ToolCallInfo[], reasoningContent?: string) => void
}

/**
 * Starts a streaming chat completion via the main process IPC bridge.
 * Returns an abort function to cancel the stream.
 */
export function streamChatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIChatMessage[],
  callbacks: StreamCallbacks,
  enableTools = false
): () => void {
  let finished = false
  const unsubs: (() => void)[] = []

  const cleanup = (): void => {
    if (finished) return
    finished = true
    unsubs.forEach((fn) => fn())
  }

  unsubs.push(
    window.api.onChatStreamChunk((content) => {
      if (!finished) callbacks.onChunk(content)
    })
  )

  unsubs.push(
    window.api.onChatStreamDone(() => {
      cleanup()
      callbacks.onDone()
    })
  )

  unsubs.push(
    window.api.onChatStreamError((error) => {
      cleanup()
      callbacks.onError(error)
    })
  )

  unsubs.push(
    window.api.onChatStreamToolCalls((data) => {
      cleanup()
      callbacks.onToolCalls?.(data.toolCalls, data.reasoningContent)
    })
  )

  window.api.chatStreamStart({ baseUrl, apiKey, model, messages, enableTools })

  return () => {
    cleanup()
    window.api.chatStreamAbort()
  }
}
