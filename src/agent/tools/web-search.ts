import { net } from 'electron'
import {
  AgentTool,
  ToolResult,
  jsonResult,
  errorResult,
  readStringParam,
  readNumberParam
} from './common'

export type WebSearchProvider = 'kimi' | 'tavily'

export interface WebSearchConfig {
  provider: WebSearchProvider
  apiKey: string
  baseUrl?: string
  model?: string
}

let searchConfig: WebSearchConfig | null = null

export function setWebSearchConfig(config: WebSearchConfig): void {
  searchConfig = config
}

const KIMI_WEB_SEARCH_TOOL = {
  type: 'builtin_function',
  function: { name: '$web_search' }
} as const

type KimiToolCall = {
  id?: string
  type?: string
  function?: { name?: string; arguments?: string }
}

type KimiMessage = {
  role?: string
  content?: string
  reasoning_content?: string
  tool_calls?: KimiToolCall[]
}

type KimiSearchResponse = {
  choices?: Array<{
    finish_reason?: string
    message?: KimiMessage
  }>
  search_results?: Array<{
    title?: string
    url?: string
    content?: string
  }>
}

function extractKimiCitations(data: KimiSearchResponse): string[] {
  const citations = (data.search_results ?? [])
    .map((entry) => entry.url?.trim())
    .filter((url): url is string => Boolean(url))

  for (const toolCall of data.choices?.[0]?.message?.tool_calls ?? []) {
    const rawArgs = toolCall.function?.arguments
    if (!rawArgs) continue
    try {
      const parsed = JSON.parse(rawArgs) as {
        search_results?: Array<{ url?: string }>
        url?: string
      }
      if (typeof parsed.url === 'string' && parsed.url.trim()) {
        citations.push(parsed.url.trim())
      }
      for (const result of parsed.search_results ?? []) {
        if (typeof result.url === 'string' && result.url.trim()) {
          citations.push(result.url.trim())
        }
      }
    } catch {
      /* ignore malformed tool arguments */
    }
  }

  return [...new Set(citations)]
}

function buildKimiToolResultContent(data: KimiSearchResponse): string {
  return JSON.stringify({
    search_results: (data.search_results ?? []).map((entry) => ({
      title: entry.title ?? '',
      url: entry.url ?? '',
      content: entry.content ?? ''
    }))
  })
}

async function searchWithKimi(query: string): Promise<ToolResult> {
  if (!searchConfig?.apiKey) {
    return errorResult('Kimi API key not configured. The web_search tool reuses your Kimi API key.')
  }

  const baseUrl = (searchConfig.baseUrl ?? 'https://api.moonshot.cn/v1').replace(/\/+$/, '')
  const model = searchConfig.model ?? 'kimi-k2.5'
  const endpoint = `${baseUrl}/chat/completions`

  const messages: Array<Record<string, unknown>> = [
    { role: 'user', content: query }
  ]

  const collectedCitations = new Set<string>()
  const collectedSearchResults: Array<{ title: string; url: string; content: string }> = []
  const MAX_ROUNDS = 3

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await net.fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${searchConfig.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools: [KIMI_WEB_SEARCH_TOOL]
      })
    })

    if (!response.ok) {
      const text = await response.text()
      return errorResult(`Kimi API error (${response.status}): ${text}`)
    }

    const data = (await response.json()) as KimiSearchResponse

    for (const citation of extractKimiCitations(data)) {
      collectedCitations.add(citation)
    }
    for (const sr of data.search_results ?? []) {
      collectedSearchResults.push({
        title: sr.title ?? '',
        url: sr.url ?? '',
        content: sr.content ?? ''
      })
    }

    const choice = data.choices?.[0]
    const message = choice?.message
    const toolCalls = message?.tool_calls ?? []

    if (choice?.finish_reason !== 'tool_calls' || toolCalls.length === 0) {
      const content = message?.content?.trim() || message?.reasoning_content?.trim() || ''
      return jsonResult({
        content,
        citations: [...collectedCitations],
        results: collectedSearchResults.map((sr) => ({
          title: sr.title,
          url: sr.url,
          snippet: sr.content.slice(0, 300)
        }))
      })
    }

    messages.push({
      role: 'assistant',
      content: message?.content ?? '',
      ...(message?.reasoning_content ? { reasoning_content: message.reasoning_content } : {}),
      tool_calls: toolCalls
    })

    const toolContent = buildKimiToolResultContent(data)
    let pushedToolResult = false
    for (const toolCall of toolCalls) {
      const toolCallId = toolCall.id?.trim()
      if (!toolCallId) continue
      pushedToolResult = true
      messages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: toolContent
      })
    }

    if (!pushedToolResult) {
      const content = message?.content?.trim() || ''
      return jsonResult({
        content,
        citations: [...collectedCitations],
        results: collectedSearchResults.map((sr) => ({
          title: sr.title,
          url: sr.url,
          snippet: sr.content.slice(0, 300)
        }))
      })
    }
  }

  return jsonResult({
    content: 'Search completed but no final answer was produced.',
    citations: [...collectedCitations],
    results: collectedSearchResults.map((sr) => ({
      title: sr.title,
      url: sr.url,
      snippet: sr.content.slice(0, 300)
    }))
  })
}

async function searchWithTavily(
  query: string,
  count: number,
  _language?: string
): Promise<ToolResult> {
  if (!searchConfig?.apiKey) {
    return errorResult('Tavily API key not configured. Please set it in settings.')
  }

  const response = await net.fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: searchConfig.apiKey,
      query,
      max_results: count,
      include_answer: true
    })
  })

  if (!response.ok) {
    const text = await response.text()
    return errorResult(`Tavily API error (${response.status}): ${text}`)
  }

  const data = (await response.json()) as {
    answer?: string
    results?: Array<{ title: string; url: string; content: string }>
  }

  return jsonResult({
    answer: data.answer,
    results: (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content
    }))
  })
}

export const webSearchTool: AgentTool = {
  definition: {
    name: 'web_search',
    description:
      'Search the internet for up-to-date information. Returns relevant results with titles, URLs, snippets, and optionally an AI-synthesized answer.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' },
        count: {
          type: 'number',
          description: 'Number of results to return, 1-10 (default 5). Only used with Tavily provider.'
        },
        language: {
          type: 'string',
          description: 'Search language, e.g. "zh" or "en". Only used with Tavily provider.'
        }
      },
      required: ['query']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const query = readStringParam(args, 'query', true)
      const count = readNumberParam(args, 'count', 5)!
      const language = readStringParam(args, 'language')

      const provider = searchConfig?.provider ?? 'kimi'

      if (provider === 'kimi') {
        return await searchWithKimi(query)
      }

      return await searchWithTavily(query, count, language)
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
