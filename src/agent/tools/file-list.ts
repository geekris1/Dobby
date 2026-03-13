import { readdirSync, statSync, existsSync, Dirent } from 'fs'
import { join, resolve } from 'path'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam, readBooleanParam, readNumberParam } from './common'

interface FileEntry {
  name: string
  type: 'file' | 'directory' | 'other'
  size: number
  modified: string
}

function listDir(
  dirPath: string,
  recursive: boolean,
  maxDepth: number,
  currentDepth: number,
  pattern?: RegExp
): FileEntry[] {
  const entries: FileEntry[] = []

  let items: Dirent[]
  try {
    items = readdirSync(dirPath, { withFileTypes: true }) as unknown as Dirent[]
  } catch {
    return entries
  }

  for (const item of items) {
    const itemName = String(item.name)
    if (pattern && !pattern.test(itemName)) continue

    const fullPath = join(dirPath, itemName)
    let stat: ReturnType<typeof statSync>
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    const type = item.isFile() ? 'file' : item.isDirectory() ? 'directory' : 'other'
    entries.push({
      name: currentDepth === 0 ? itemName : fullPath.slice(resolve(dirPath).length - dirPath.length),
      type,
      size: stat.size,
      modified: stat.mtime.toISOString()
    })

    if (recursive && item.isDirectory() && currentDepth < maxDepth - 1) {
      const subEntries = listDir(fullPath, true, maxDepth, currentDepth + 1, pattern)
      for (const sub of subEntries) {
        entries.push({
          ...sub,
          name: join(itemName, sub.name)
        })
      }
    }
  }

  return entries
}

export const fileListTool: AgentTool = {
  definition: {
    name: 'file_list',
    description: 'List files and subdirectories in a given directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to list' },
        recursive: { type: 'boolean', description: 'List recursively (default false)' },
        max_depth: { type: 'number', description: 'Maximum recursion depth (default 3)' },
        pattern: { type: 'string', description: 'Filename filter pattern (simple glob: * matches any chars)' }
      },
      required: ['path']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const dirPath = readStringParam(args, 'path', true)
      const recursive = readBooleanParam(args, 'recursive', false)!
      const maxDepth = readNumberParam(args, 'max_depth', 3)!
      const patternStr = readStringParam(args, 'pattern')

      const absPath = resolve(dirPath)

      if (!existsSync(absPath)) {
        return errorResult(`Directory not found: ${dirPath}`)
      }

      let pattern: RegExp | undefined
      if (patternStr) {
        const escaped = patternStr.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
        pattern = new RegExp(`^${escaped}$`, 'i')
      }

      const entries = listDir(absPath, recursive, maxDepth, 0, pattern)

      return jsonResult({
        path: absPath,
        entries,
        count: entries.length
      })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
