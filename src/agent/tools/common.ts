export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ToolResult {
  success: boolean
  content: string
  details?: unknown
  imageDataUrl?: string
  imageDataUrls?: string[]
}

export interface AgentTool {
  definition: ToolDefinition
  execute(args: Record<string, unknown>): Promise<ToolResult>
}

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToolInputError'
  }
}

export function jsonResult(data: unknown): ToolResult {
  return {
    success: true,
    content: JSON.stringify(data, null, 2),
    details: data
  }
}

export function errorResult(message: string): ToolResult {
  return {
    success: false,
    content: message
  }
}

export function readStringParam(
  args: Record<string, unknown>,
  key: string,
  required: true
): string
export function readStringParam(
  args: Record<string, unknown>,
  key: string,
  required?: false
): string | undefined
export function readStringParam(
  args: Record<string, unknown>,
  key: string,
  required?: boolean
): string | undefined {
  const value = args[key]
  if (value === undefined || value === null) {
    if (required) throw new ToolInputError(`Missing required parameter: ${key}`)
    return undefined
  }
  return String(value)
}

export function readNumberParam(
  args: Record<string, unknown>,
  key: string,
  defaultValue?: number
): number | undefined {
  const value = args[key]
  if (value === undefined || value === null) return defaultValue
  const num = Number(value)
  if (isNaN(num)) throw new ToolInputError(`Parameter ${key} must be a number`)
  return num
}

export function readBooleanParam(
  args: Record<string, unknown>,
  key: string,
  defaultValue?: boolean
): boolean | undefined {
  const value = args[key]
  if (value === undefined || value === null) return defaultValue
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  throw new ToolInputError(`Parameter ${key} must be a boolean`)
}
