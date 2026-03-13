import { AgentTool, ToolDefinition, ToolResult, errorResult } from './common'
import { webSearchTool } from './web-search'
import { webFetchTool } from './web-fetch'
import { memorySearchTool } from './memory-search'
import { memoryGetTool } from './memory-get'
import { fileReadTool } from './file-read'
import { fileWriteTool } from './file-write'
import { fileListTool } from './file-list'
import { shellExecTool } from './shell-exec'
import { systemInfoTool } from './system-info'
import { openPathTool } from './open-app'
import { clipboardTool } from './clipboard'
import { imageReadTool } from './image-read'
import { pdfReadTool } from './pdf-read'

const allTools: AgentTool[] = [
  webSearchTool,
  webFetchTool,
  memorySearchTool,
  memoryGetTool,
  fileReadTool,
  fileWriteTool,
  fileListTool,
  shellExecTool,
  systemInfoTool,
  openPathTool,
  clipboardTool,
  imageReadTool,
  pdfReadTool
]

const toolMap = new Map<string, AgentTool>(allTools.map((t) => [t.definition.name, t]))

export function getAllTools(): AgentTool[] {
  return allTools
}

export function getToolDefinitions(): ToolDefinition[] {
  return allTools.map((t) => t.definition)
}

export function getOpenAIToolDefinitions(): Array<{
  type: 'function'
  function: { name: string; description: string; parameters: Record<string, unknown> }
}> {
  return allTools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.definition.name,
      description: t.definition.description,
      parameters: t.definition.parameters
    }
  }))
}

export function getToolByName(name: string): AgentTool | undefined {
  return toolMap.get(name)
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const tool = toolMap.get(name)
  if (!tool) {
    return errorResult(`Unknown tool: ${name}`)
  }
  try {
    return await tool.execute(args)
  } catch (err) {
    return errorResult(`Tool execution error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export type { AgentTool, ToolDefinition, ToolResult } from './common'
export { setWebSearchConfig } from './web-search'
