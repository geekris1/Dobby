import { clipboard } from 'electron'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam } from './common'

export const clipboardTool: AgentTool = {
  definition: {
    name: 'clipboard',
    description: 'Read from or write to the system clipboard.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: '"read" to get clipboard content, "write" to set clipboard content',
          enum: ['read', 'write']
        },
        content: {
          type: 'string',
          description: 'Text to write to clipboard (required when action is "write")'
        }
      },
      required: ['action']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const action = readStringParam(args, 'action', true)

      if (action === 'read') {
        const text = clipboard.readText()
        return jsonResult({ action: 'read', content: text })
      }

      if (action === 'write') {
        const content = readStringParam(args, 'content', true)
        clipboard.writeText(content)
        return jsonResult({ action: 'write', bytesWritten: content.length })
      }

      return errorResult(`Unknown action: ${action}. Use "read" or "write".`)
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
