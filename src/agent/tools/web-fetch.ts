import { net } from 'electron'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam, readNumberParam } from './common'

function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? match[1].trim() : ''
}

export const webFetchTool: AgentTool = {
  definition: {
    name: 'web_fetch',
    description: 'Fetch the content of a URL and extract readable text. Useful for reading web pages, articles, and documentation.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to fetch' },
        extract_mode: {
          type: 'string',
          description: 'Extraction mode: "text" for plain text (default)',
          enum: ['text']
        },
        max_chars: {
          type: 'number',
          description: 'Maximum characters to return (default 8000)'
        }
      },
      required: ['url']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const url = readStringParam(args, 'url', true)
      const maxChars = readNumberParam(args, 'max_chars', 8000)!

      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return errorResult('URL must start with http:// or https://')
      }

      const response = await net.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Dobby/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })

      if (!response.ok) {
        return errorResult(`HTTP error ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') ?? ''
      const html = await response.text()

      if (contentType.includes('application/json')) {
        const truncated = html.length > maxChars ? html.slice(0, maxChars) + '\n...(truncated)' : html
        return jsonResult({ url, content: truncated, contentType: 'json' })
      }

      const title = extractTitle(html)
      let content = stripHtmlTags(html)

      if (content.length > maxChars) {
        content = content.slice(0, maxChars) + '\n...(truncated)'
      }

      return jsonResult({ title, url, content })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
