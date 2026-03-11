# 实施阶段建议

按以下顺序分阶段实现，每阶段可单独验证。

1. **脚手架**
   - 使用 `npm create @quick-start/electron`，选择 Vite 与 React（或 react-ts）。
   - 确认 `npm run dev`、`npm run build` 正常。
   - 在 renderer 中引入 Zustand，建一个简单 store 验证。

2. **连接层**
   - 实现 GatewayClient（WebSocket 连接、重连、send/onMessage）。
   - 实现 gatewayStore（连接状态、配置、错误）。
   - 在 UI 上显示连接状态（如顶部指示器）。

3. **最小可用聊天**
   - 发送一条 `chat`，收到一条 `response` 并展示。
   - 输入框 + 发送按钮 + 单条消息展示即可。

4. **完善聊天**
   - 消息列表、多轮对话、`id` 关联请求/响应。
   - 可选：展示 `tool_call` / `tool_result`（折叠或内联）。

5. **状态与技能**
   - 状态页：发送 `status`，展示返回信息。
   - 可选：`heartbeat_trigger` 按钮与 `heartbeat_status` 展示。
   - 技能页：技能名 + args 输入，发送 `skill_invoke`，展示结果或错误。

6. **设置与打包**
   - 设置页：Gateway 地址、端口、token，持久化并应用至 GatewayClient。
   - 「打开 ~/.openclaw」「打开工作区 ~/.openclaw/workspace」按钮（通过 Main 进程调系统 API）。
   - 帮助/关于：简述 Memory 与系统提示词，并指向工作区路径。
   - 使用 electron-builder 打安装包，可选配置 electron-updater。
