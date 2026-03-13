import { readFileSync, existsSync, statSync } from 'fs'
import { resolve, extname } from 'path'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam, readNumberParam } from './common'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.ico', '.tiff', '.tif', '.svg'
])

export const fileReadTool: AgentTool = {
  definition: {
    name: 'file_read',
    description: 'Read the contents of a local file. Supports line range reading for large files.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute or relative file path' },
        from: { type: 'number', description: 'Starting line number (1-based)' },
        lines: { type: 'number', description: 'Number of lines to read' },
        encoding: {
          type: 'string',
          description: 'File encoding (default "utf-8")',
          enum: ['utf-8', 'ascii', 'latin1', 'base64']
        }
      },
      required: ['path']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const filePath = readStringParam(args, 'path', true)
      const from = readNumberParam(args, 'from')
      const lineCount = readNumberParam(args, 'lines')
      const encoding = (readStringParam(args, 'encoding') ?? 'utf-8') as BufferEncoding

      const absPath = resolve(filePath)

      const ext = extname(absPath).toLowerCase()
      if (IMAGE_EXTENSIONS.has(ext)) {
        return errorResult(
          `"${filePath}" is an image file (${ext}). Use the image_read tool instead of file_read to view images.`
        )
      }
      if (ext === '.pdf') {
        return errorResult(
          `"${filePath}" is a PDF file. Use the pdf_read tool instead of file_read to read PDF documents.`
        )
      }

      if (!existsSync(absPath)) {
        return errorResult(`File not found: ${filePath}`)
      }

      const stat = statSync(absPath)
      if (!stat.isFile()) {
        return errorResult(`Not a file: ${filePath}`)
      }

      if (stat.size > MAX_FILE_SIZE) {
        return errorResult(`File too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`)
      }

      const raw = readFileSync(absPath, encoding)
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

      return jsonResult({
        path: absPath,
        content,
        totalLines,
        size: stat.size
      })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
