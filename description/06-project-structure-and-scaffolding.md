# 项目结构与脚手架

## 脚手架

- 使用 **@quick-start/electron**，创建时选择 **Vite** 与 **React**（推荐 **react-ts**）。
- 命令示例：
  ```bash
  npm create @quick-start/electron Dobby
  ```
  在交互中选择 Vite、React（或 react-ts）。
- 生成结构通常包含：`src/main`（主进程）、`src/preload`、`src/renderer`（Vite + React），以及 electron-builder、electron-updater 等配置。

## 目录结构（生成后调整）

```
Dobby/
├── description/           # 本计划与说明文档
│   ├── plan.md
│   ├── 00-README.md
│   └── ...
├── src/
│   ├── main/              # Electron 主进程
│   ├── preload/           # Preload 脚本
│   └── renderer/          # Vite + React 渲染进程
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── api/       # Gateway WebSocket 封装（GatewayClient）
│           ├── components/
│           ├── pages/
│           └── stores/    # Zustand stores
├── package.json
└── electron-builder 等配置
```

## Zustand stores 规划

- **gatewayStore**：连接状态（connected / connecting / disconnected）、当前配置（url、port、token）、错误信息；方法：connect、disconnect、setConfig。
- **chatStore**：消息列表（含 id、role、content、tool_calls/results）、当前输入；方法：sendMessage、appendMessage、clear。
- **settingsStore**：持久化设置（Gateway URL、port、token、工作区路径展示用）；方法：load、save、update。
- 可选：**skillsStore**（技能列表、最近调用结果），视 UI 复杂度再拆。

## npm 脚本与环境变量

- 以脚手架为准，通常包含：
  - `dev`：启动 Vite dev server + Electron（如 wait-on + concurrently）
  - `build`：构建渲染进程与主进程
  - `dist` 或 `pack`：electron-builder 打包
- 环境变量：若需区分开发/生产 Gateway 默认地址，可用 `import.meta.env`（Vite）或 `process.env`（主进程）配置。
