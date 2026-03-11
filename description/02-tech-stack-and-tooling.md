# 技术栈与工具选型

## 核心栈

| 层级 | 选型 | 说明 |
|------|------|------|
| 桌面壳 | Electron | 主进程、preload、渲染进程分离 |
| 构建 | Vite | 渲染进程用 Vite 构建 React，支持 HMR |
| 前端 | React 18+ | UI 与交互 |
| 语言 | TypeScript | 全项目 TS |
| 状态管理 | **Zustand** | 全局与页面状态（连接、聊天、设置等） |
| 通信 | WebSocket | 与 OpenClaw Gateway 通信（浏览器原生或 `ws` 包） |

## 推荐依赖与版本（参考）

- **electron**：^28 或当前 LTS
- **vite**：^5
- **react** / **react-dom**：^18
- **typescript**：^5
- **zustand**：^4
- **electron-builder**：打包
- **electron-updater**（可选）：自动更新

脚手架 **@quick-start/electron** 会带齐 Electron + Vite + React 的配置；在此基础上增加：

- `zustand`：状态管理
- 视需要：UI 库（如 shadcn/ui）、Tailwind、路由（react-router-dom）

## 为何选 Zustand

- 轻量、无 boilerplate，适合中小型桌面应用。
- 与 React 集成简单，支持在组件外使用（便于在 WebSocket 回调中更新状态）。
- 便于按领域拆 store：如 `gatewayStore`、`chatStore`、`settingsStore`。

## 可选

- UI 库：shadcn/ui、Radix 等
- CSS：Tailwind CSS
- 路由：react-router-dom（若多页/多视图）
