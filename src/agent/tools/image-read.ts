import { readFileSync, existsSync, statSync } from 'fs'
import { resolve, extname } from 'path'
import { AgentTool, ToolResult, errorResult, readStringParam } from './common'

const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20 MB

const SUPPORTED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'
])

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
}

export const imageReadTool: AgentTool = {
  definition: {
    name: 'image_read',
    description:
      'Read a local image file and return its content as base64 for the AI to see directly. Use this tool whenever the user asks you to look at, describe, or analyze an image file. Supports jpg, jpeg, png, gif, webp, bmp formats.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the image file'
        },
        prompt: {
          type: 'string',
          description:
            'What to analyze about the image, e.g. "What is in this image?", "Read the text in this image" (default: "Describe this image in detail.")'
        }
      },
      required: ['path']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const filePath = readStringParam(args, 'path', true)
      const prompt = readStringParam(args, 'prompt') ?? 'Describe this image in detail.'

      const absPath = resolve(filePath)

      if (!existsSync(absPath)) {
        return errorResult(`File not found: ${filePath}`)
      }

      const stat = statSync(absPath)
      if (!stat.isFile()) {
        return errorResult(`Not a file: ${filePath}`)
      }

      if (stat.size > MAX_IMAGE_SIZE) {
        return errorResult(
          `Image too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.`
        )
      }

      const ext = extname(absPath).toLowerCase()
      if (!SUPPORTED_EXTENSIONS.has(ext)) {
        return errorResult(
          `Unsupported image format: ${ext}. Supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}`
        )
      }

      const mimeType = MIME_TYPES[ext] ?? 'image/jpeg'
      const imageBuffer = readFileSync(absPath)
      const base64 = imageBuffer.toString('base64')
      const dataUrl = `data:${mimeType};base64,${base64}`
      const sizeKB = (stat.size / 1024).toFixed(1)

      return {
        success: true,
        content: JSON.stringify({
          path: absPath,
          format: ext.slice(1),
          imageSize: `${sizeKB} KB`,
          prompt
        }),
        imageDataUrl: dataUrl
      }
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
