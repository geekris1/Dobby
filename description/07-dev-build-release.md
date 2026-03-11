# 开发、构建与发布

## 开发流程

- 确保本机已安装并可选运行 OpenClaw Gateway（`openclaw gateway` 或 daemon），以便联调。
- 在项目根目录执行脚手架提供的 **dev** 脚本（通常为 `npm run dev`）：
  - 先启动 Vite dev server（如 `http://localhost:5173`），再启动 Electron 并加载该 URL。
- 修改 Renderer 代码会触发热更新；修改 Main/Preload 通常需重启 Electron。

## 调试

- **Renderer**：Electron 内置 DevTools，或 Chrome 远程调试。
- **Main**：使用 VS Code/Cursor 的 Electron 调试配置，或 `--inspect` 启动主进程。
- **WebSocket**：在 DevTools Network 中查看 WS 帧，或在前端对 GatewayClient 的收发包打 log。

## 构建

- 执行脚手架提供的 **build** 脚本，生成：
  - 渲染进程产物（如 `dist` 或 `dist/renderer`）
  - 主进程产物（如 `dist-electron` 或 `dist/main`）
- 再执行 **pack** / **dist** 等脚本，使用 electron-builder 打包成各平台安装包（dmg、exe、AppImage 等）。

## 发布

- 若使用 **electron-updater**：配置更新服务器或 GitHub Releases，在应用内检查更新并下载安装。
- 否则：将构建出的安装包上传到发布渠道（官网、商店等），由用户手动下载安装。
