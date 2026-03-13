import { exec } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { AgentTool, ToolResult, jsonResult, errorResult, readStringParam, readNumberParam } from './common'

const MAX_OUTPUT = 100_000 // chars

export const shellExecTool: AgentTool = {
  definition: {
    name: 'shell_exec',
    description: 'Execute a shell command and return stdout, stderr, and exit code.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (optional)' },
        timeout: { type: 'number', description: 'Timeout in milliseconds (default 30000)' }
      },
      required: ['command']
    }
  },

  async execute(args): Promise<ToolResult> {
    try {
      const command = readStringParam(args, 'command', true)
      const cwd = readStringParam(args, 'cwd')
      const timeout = readNumberParam(args, 'timeout', 30_000)!

      if (cwd) {
        const absCwd = resolve(cwd)
        if (!existsSync(absCwd)) {
          return errorResult(`Working directory not found: ${cwd}`)
        }
      }

      return await new Promise<ToolResult>((res) => {
        const child = exec(
          command,
          {
            cwd: cwd ? resolve(cwd) : undefined,
            timeout,
            maxBuffer: 5 * 1024 * 1024,
            shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
          },
          (error, stdout, stderr) => {
            const truncate = (s: string): string =>
              s.length > MAX_OUTPUT ? s.slice(0, MAX_OUTPUT) + '\n...(truncated)' : s

            const exitCode = error?.code ?? (error ? 1 : 0)
            const timedOut = error?.killed ?? false

            res(
              jsonResult({
                stdout: truncate(stdout),
                stderr: truncate(stderr),
                exitCode: typeof exitCode === 'number' ? exitCode : 1,
                timedOut
              })
            )
          }
        )

        if (!child) {
          res(errorResult('Failed to spawn child process'))
        }
      })
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err))
    }
  }
}
