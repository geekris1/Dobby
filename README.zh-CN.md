# Dobby

[English](./README.md) / 中文

> 基于 Electron、React 和 TypeScript 的跨平台 AI 桌面助手。

Dobby 是一款运行在桌面端的本地优先 AI 助手。它可以连接任何 OpenAI 兼容的 LLM API（包括 Kimi / Moonshot），并提供丰富的内置工具，让 AI 能够与你的系统交互 —— 读写文件、执行 Shell 命令、搜索网页、读取图片和 PDF 等。

## 功能特性

- **流式对话** — 实时流式响应，支持推理过程（reasoning content）展示
- **Tool Use（函数调用）** — 13 个内置工具，AI 可自主调用：

  | 工具 | 说明 |
  |------|------|
  | `web_search` | 通过 Tavily 或 Kimi 搜索网页 |
  | `web_fetch` | 抓取并提取网页内容 |
  | `file_read` | 读取文本文件内容 |
  | `file_write` | 创建或覆盖写入文件 |
  | `file_list` | 列出目录内容及元信息 |
  | `shell_exec` | 执行 Shell 命令 |
  | `image_read` | 读取并编码图片，用于视觉分析 |
  | `pdf_read` | 提取 PDF 文件文本 |
  | `clipboard` | 读写系统剪贴板 |
  | `open_path` | 使用默认应用打开文件或 URL |
  | `system_info` | 获取系统环境信息 |
  | `memory_search` | 搜索已存储的记忆 |
  | `memory_get` | 获取指定记忆内容 |

- **多轮工具调用循环** — 自动链式执行：工具调用 → 执行 → 重新请求，直到任务完成
- **直连 API 模式** — 直接连接任意 OpenAI 兼容接口（无需 Gateway）
- **Gateway 模式** — 可选的 WebSocket Gateway 集成
- **跨平台** — 支持 macOS、Windows 和 Linux

## 技术栈

- **框架**: Electron + React 19 + TypeScript
- **构建工具**: electron-vite（基于 Vite）
- **状态管理**: Zustand
- **样式**: Less

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9

### 安装依赖

```bash
pnpm install
```

### 开发调试

```bash
pnpm dev
```

### 构建打包

```bash
# macOS
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux
```

## 项目结构

```
src/
├── main/                # Electron 主进程
│   ├── index.ts         # 应用入口、IPC 处理
│   └── chatStream.ts    # SSE 流式解析与工具调用处理
├── preload/             # 预加载脚本（IPC 桥接）
├── renderer/            # React 前端
│   └── src/
│       ├── api/         # OpenAI 客户端
│       ├── pages/       # 对话与设置页面
│       ├── stores/      # Zustand 状态管理
│       └── components/  # 公共 UI 组件
└── agent/
    └── tools/           # 内置工具实现
```

## 配置说明

启动应用后进入 **设置** 页面进行配置：

1. **API Base URL** — 例如 `https://api.openai.com/v1` 或 `https://api.moonshot.cn/v1`
2. **API Key** — 你的 LLM 服务商 API 密钥
3. **模型** — 从可用模型列表中选择

## 许可证

MIT
