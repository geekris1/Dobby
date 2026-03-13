import { platform, arch, cpus, totalmem, freemem, homedir, hostname, release, uptime, userInfo } from 'os'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam } from './common'

type Category = 'all' | 'os' | 'cpu' | 'memory' | 'user'

function getOsInfo(): Record<string, unknown> {
  return {
    platform: platform(),
    arch: arch(),
    release: release(),
    hostname: hostname(),
    uptime: `${Math.floor(uptime() / 3600)}h ${Math.floor((uptime() % 3600) / 60)}m`
  }
}

function getCpuInfo(): Record<string, unknown> {
  const cpuList = cpus()
  return {
    model: cpuList[0]?.model ?? 'unknown',
    cores: cpuList.length,
    speed: `${cpuList[0]?.speed ?? 0} MHz`
  }
}

function getMemoryInfo(): Record<string, unknown> {
  const total = totalmem()
  const free = freemem()
  const used = total - free
  const format = (bytes: number): string => `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  return {
    total: format(total),
    used: format(used),
    free: format(free),
    usagePercent: `${((used / total) * 100).toFixed(1)}%`
  }
}

function getUserInfo(): Record<string, unknown> {
  const info = userInfo()
  return {
    username: info.username,
    homeDir: homedir(),
    shell: info.shell || undefined
  }
}

export const systemInfoTool: AgentTool = {
  definition: {
    name: 'system_info',
    description: 'Get information about the system environment: OS, CPU, memory, and user info.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Information category: "all", "os", "cpu", "memory", "user" (default "all")',
          enum: ['all', 'os', 'cpu', 'memory', 'user']
        }
      }
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const category = (readStringParam(args, 'category') ?? 'all') as Category

      const result: Record<string, unknown> = {}

      if (category === 'all' || category === 'os') result.os = getOsInfo()
      if (category === 'all' || category === 'cpu') result.cpu = getCpuInfo()
      if (category === 'all' || category === 'memory') result.memory = getMemoryInfo()
      if (category === 'all' || category === 'user') result.user = getUserInfo()

      return jsonResult(result)
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
