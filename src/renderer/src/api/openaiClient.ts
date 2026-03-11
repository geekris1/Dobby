export type OpenAIChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type StreamCallbacks = {
  onChunk: (content: string) => void
  onDone: () => void
  onError: (error: string) => void
}

/**
 * Starts a streaming chat completion via the main process IPC bridge
 * (bypasses CORS restrictions in Electron renderer).
 * Returns an abort function to cancel the stream.
 */
export function streamChatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAIChatMessage[],
  callbacks: StreamCallbacks
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

  window.api.chatStreamStart({ baseUrl, apiKey, model, messages })

  return () => {
    cleanup()
    window.api.chatStreamAbort()
  }
}
