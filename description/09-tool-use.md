# Tool Use 功能

## 概述

为 Dobby 桌面助手实现本地 tool_use 系统，使 Direct API 模式下的 LLM 能通过 OpenAI function calling 协议调用本地工具。工具在 Electron Main 进程中执行，通过 IPC 与 Renderer 通信。

## 架构

### 数据流

```
用户输入 → chatStore.sendMessage
  → Main 进程 handleChatStream (带 tools 参数)
  → LLM API /chat/completions
  → 返回 tool_calls
  → Main 进程解析 → IPC 通知 Renderer
  → Renderer 回调 Main 进程 executeToolCall
  → toolRegistry 路由到具体 Tool.execute()
  → ToolResult → IPC 返回 Renderer
  → 追加 tool_result 消息继续对话
```

### 核心接口

- `ToolDefinition` — 工具名称、描述、JSON Schema 参数定义
- `ToolResult` — 执行结果：success/content/details
- `AgentTool` — 工具实例：definition + execute()

## 工具列表

| 文件 | 工具名 | 说明 |
|------|--------|------|
| common.ts | — | 基础类型、接口、辅助函数 |
| web-search.ts | `web_search` | 搜索互联网获取最新信息 |
| web-fetch.ts | `web_fetch` | 抓取 URL 网页内容转为可读文本 |
| memory-search.ts | `memory_search` | 在记忆文件中搜索相关内容 |
| memory-get.ts | `memory_get` | 读取指定记忆文件 |
| file-read.ts | `file_read` | 读取本地文件内容 |
| file-write.ts | `file_write` | 创建或写入本地文件 |
| file-list.ts | `file_list` | 列出目录中的文件和子目录 |
| shell-exec.ts | `shell_exec` | 执行 Shell 命令 |
| system-info.ts | `system_info` | 获取系统运行环境信息 |
| open-app.ts | `open_path` | 用系统默认程序打开文件/文件夹/URL |
| clipboard.ts | `clipboard` | 读取或写入系统剪贴板 |
| index.ts | — | 工具注册表，统一导出与路由 |

## 集成改造

### Main 进程

- 新增 IPC: `tool-get-definitions`、`tool-execute`
- 改造 `handleChatStream`：请求体加入 `tools`，解析 SSE 中的 `tool_calls`

### Renderer / Preload

- `openaiClient.ts` — 支持 tool_calls 回调
- `chatStore.ts` — Direct API 模式下 tool_call/tool_result 循环
- `preload/index.ts` — 新增 tool 相关 IPC 桥接

## 依赖

首版使用 Node.js 内置模块，无新依赖。后续可选：`turndown`、`@mozilla/readability`。
