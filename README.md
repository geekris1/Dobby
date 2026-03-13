# Dobby

English / [中文](./README.zh-CN.md)

> A cross-platform AI desktop assistant powered by Electron, React and TypeScript.

Dobby is a local-first AI assistant that runs on your desktop. It connects to OpenAI-compatible LLM APIs (including Kimi / Moonshot) and provides a rich set of built-in tools so the AI can interact with your system — read & write files, execute shell commands, search the web, read images & PDFs, and more.

## Features

- **Streaming Chat** — Real-time streaming responses with reasoning content support
- **Tool Use (Function Calling)** — 13 built-in tools that the AI can invoke autonomously:

  | Tool | Description |
  |------|-------------|
  | `web_search` | Search the web via Tavily or Kimi |
  | `web_fetch` | Fetch and extract content from a URL |
  | `file_read` | Read text file contents |
  | `file_write` | Create or overwrite files |
  | `file_list` | List directory contents with metadata |
  | `shell_exec` | Execute shell commands |
  | `image_read` | Read and encode images for vision analysis |
  | `pdf_read` | Extract text from PDF files |
  | `clipboard` | Read from / write to system clipboard |
  | `open_path` | Open files or URLs with default application |
  | `system_info` | Get system environment information |
  | `memory_search` | Search stored memories |
  | `memory_get` | Retrieve a specific memory |

- **Multi-turn Tool Loops** — Automatically chains tool calls → execution → re-prompting until the task is complete
- **Direct API Mode** — Connect directly to any OpenAI-compatible endpoint (no gateway required)
- **Gateway Mode** — Optional WebSocket-based gateway integration
- **Cross-platform** — macOS, Windows, and Linux

## Tech Stack

- **Framework**: Electron + React 19 + TypeScript
- **Build Tool**: electron-vite (Vite-based)
- **State Management**: Zustand
- **Styling**: Less

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
# macOS
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux
```

## Project Structure

```
src/
├── main/                # Electron main process
│   ├── index.ts         # App entry, IPC handlers
│   └── chatStream.ts    # SSE streaming & tool call parsing
├── preload/             # Preload scripts (IPC bridge)
├── renderer/            # React frontend
│   └── src/
│       ├── api/         # OpenAI client
│       ├── pages/       # Chat & Settings pages
│       ├── stores/      # Zustand stores
│       └── components/  # Shared UI components
└── agent/
    └── tools/           # Built-in tool implementations
```

## Configuration

Launch the app and go to **Settings** to configure:

1. **API Base URL** — e.g. `https://api.openai.com/v1` or `https://api.moonshot.cn/v1`
2. **API Key** — Your LLM provider API key
3. **Model** — Select from available models

## License

MIT
