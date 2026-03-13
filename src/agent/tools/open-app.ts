import { shell } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam } from './common'

export const openPathTool: AgentTool = {
  definition: {
    name: 'open_path',
    description: 'Open a file, folder, or URL using the system default application.',
    parameters: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'File path, folder path, or URL to open'
        }
      },
      required: ['target']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const target = readStringParam(args, 'target', true)

      const isUrl = target.startsWith('http://') || target.startsWith('https://')

      if (isUrl) {
        await shell.openExternal(target)
        return jsonResult({ opened: true, target, type: 'url' })
      }

      if (!existsSync(target)) {
        mkdirSync(target, { recursive: true })
      }

      const errorMessage = await shell.openPath(target)
      if (errorMessage) {
        return errorResult(`Failed to open: ${errorMessage}`)
      }

      return jsonResult({ opened: true, target, type: 'path' })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
