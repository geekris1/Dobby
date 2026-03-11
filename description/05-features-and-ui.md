# 功能与界面规划

## 功能列表

1. **连接与状态**
   - 检测 Gateway 是否可达，显示「已连接 / 连接中 / 已断开」。
   - 可配置端口、host、认证 token（持久化到本地）。

2. **聊天**
   - 输入框 + 消息列表。
   - 发送 `chat`，展示 `response` 中的文本。
   - 可选展示 `tool_call` / `tool_result`（折叠或内联）。

3. **状态与心跳**
   - 发送 `status` 显示 Gateway 运行状态（可在单独页或侧栏）。
   - 可选触发 `heartbeat_trigger`，展示 `heartbeat_status` 结果。

4. **技能**
   - 入口：技能名 + 参数输入。
   - 发送 `skill_invoke`，展示结果或错误。

5. **设置**
   - Gateway 地址、端口、认证 token。
   - 「打开 ~/.openclaw」「打开工作区 ~/.openclaw/workspace」快捷方式。

6. **记忆/工作区说明**
   - 在帮助或设置中简述 SOUL、USER、AGENTS、MEMORY、memory/* 的作用，引导用户自行编辑工作区文件。

## 界面/路由规划建议

- **单窗口** 即可：主区域为聊天，顶部或侧边为导航/状态。
- **路由**（若用 react-router）示例：
  - `/` 或 `/chat`：聊天
  - `/status`：状态与心跳
  - `/skills`：技能调用
  - `/settings`：设置与工作区入口
  - `/help`：帮助与 Memory/系统提示词简述
- 连接状态全局可见（如顶部状态栏或连接指示器），断线时提示重连或检查配置。
