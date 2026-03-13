import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam, readBooleanParam } from './common'

export const fileWriteTool: AgentTool = {
  definition: {
    name: 'file_write',
    description: 'Create or overwrite a local file with the given content.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write to' },
        content: { type: 'string', description: 'Content to write' },
        create_dirs: {
          type: 'boolean',
          description: 'Automatically create parent directories if they do not exist (default true)'
        }
      },
      required: ['path', 'content']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const filePath = readStringParam(args, 'path', true)
      const content = readStringParam(args, 'content', true)
      const createDirs = readBooleanParam(args, 'create_dirs', true)!

      const absPath = resolve(filePath)
      const dir = dirname(absPath)

      if (createDirs && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      writeFileSync(absPath, content, 'utf-8')
      const bytesWritten = Buffer.byteLength(content, 'utf-8')

      return jsonResult({ path: absPath, bytesWritten })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
