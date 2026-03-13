import { readFileSync, existsSync, statSync } from 'fs'
import { join, resolve, relative } from 'path'
import { homedir } from 'os'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam, readNumberParam } from './common'

function getWorkspacePath(): string {
  return join(homedir(), '.openclaw', 'workspace')
}

export const memoryGetTool: AgentTool = {
  definition: {
    name: 'memory_get',
    description: 'Read the content of a specific memory file from the workspace (e.g. "MEMORY.md", "memory/notes.md").',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to the workspace, e.g. "MEMORY.md" or "memory/notes.md"'
        },
        from: { type: 'number', description: 'Starting line number (1-based)' },
        lines: { type: 'number', description: 'Number of lines to read' }
      },
      required: ['path']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const relPath = readStringParam(args, 'path', true)
      const from = readNumberParam(args, 'from')
      const lineCount = readNumberParam(args, 'lines')

      const workspace = getWorkspacePath()
      const fullPath = resolve(workspace, relPath)

      const rel = relative(workspace, fullPath)
      if (rel.startsWith('..') || rel.startsWith('/')) {
        return errorResult('Path traversal not allowed. Path must be within the workspace.')
      }

      if (!existsSync(fullPath)) {
        return errorResult(`File not found: ${relPath}`)
      }

      const stat = statSync(fullPath)
      if (!stat.isFile()) {
        return errorResult(`Not a file: ${relPath}`)
      }

      const raw = readFileSync(fullPath, 'utf-8')
      const allLines = raw.split('\n')
      const totalLines = allLines.length

      let content: string
      if (from !== undefined) {
        const start = Math.max(0, from - 1)
        const end = lineCount !== undefined ? start + lineCount : allLines.length
        content = allLines.slice(start, end).join('\n')
      } else if (lineCount !== undefined) {
        content = allLines.slice(0, lineCount).join('\n')
      } else {
        content = raw
      }

      return jsonResult({ path: relPath, content, totalLines })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
