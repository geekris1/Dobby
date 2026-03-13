import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { homedir } from 'os'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam, readNumberParam } from './common'

interface MemoryChunk {
  file: string
  section: string
  content: string
  score: number
}

function getWorkspacePath(): string {
  return join(homedir(), '.openclaw', 'workspace')
}

function collectMemoryFiles(): string[] {
  const workspace = getWorkspacePath()
  const files: string[] = []

  const memoryMd = join(workspace, 'MEMORY.md')
  if (existsSync(memoryMd)) files.push(memoryMd)

  const memoryDir = join(workspace, 'memory')
  if (existsSync(memoryDir)) {
    for (const entry of readdirSync(memoryDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(join(memoryDir, entry.name))
      }
    }
  }

  return files
}

function splitIntoSections(content: string): Array<{ heading: string; body: string }> {
  const sections: Array<{ heading: string; body: string }> = []
  const lines = content.split('\n')
  let currentHeading = '(top)'
  let currentBody: string[] = []

  for (const line of lines) {
    if (line.startsWith('#')) {
      if (currentBody.length > 0) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
      }
      currentHeading = line.replace(/^#+\s*/, '')
      currentBody = []
    } else {
      currentBody.push(line)
    }
  }

  if (currentBody.length > 0) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() })
  }

  return sections
}

function scoreMatch(text: string, queryTerms: string[]): number {
  const lower = text.toLowerCase()
  let score = 0
  for (const term of queryTerms) {
    const idx = lower.indexOf(term)
    if (idx !== -1) {
      score += 1
      const occurrences = lower.split(term).length - 1
      score += Math.min(occurrences - 1, 3) * 0.3
    }
  }
  return score
}

export const memorySearchTool: AgentTool = {
  definition: {
    name: 'memory_search',
    description: 'Search through memory files (MEMORY.md, memory/*.md) for relevant content using keyword matching.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords' },
        max_results: { type: 'number', description: 'Maximum number of results (default 5)' }
      },
      required: ['query']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const query = readStringParam(args, 'query', true)
      const maxResults = readNumberParam(args, 'max_results', 5)!
      const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean)

      const files = collectMemoryFiles()
      if (files.length === 0) {
        return jsonResult({ results: [], message: 'No memory files found in workspace.' })
      }

      const chunks: MemoryChunk[] = []

      for (const filePath of files) {
        const content = readFileSync(filePath, 'utf-8')
        const sections = splitIntoSections(content)
        const fileName = basename(filePath)

        for (const section of sections) {
          if (!section.body) continue
          const score = scoreMatch(section.heading + ' ' + section.body, queryTerms)
          if (score > 0) {
            chunks.push({
              file: fileName,
              section: section.heading,
              content: section.body.slice(0, 500),
              score
            })
          }
        }
      }

      chunks.sort((a, b) => b.score - a.score)

      return jsonResult({
        results: chunks.slice(0, maxResults),
        totalMatches: chunks.length
      })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
