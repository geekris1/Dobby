# Gateway 集成

## 连接

- 默认地址：`ws://localhost:18789`。
- 若 Gateway 启用认证，URL 形式：`ws://localhost:18789?token=YOUR_TOKEN`。
- 配置（端口、host、token）应可从设置页读取并持久化（如 localStorage 或 Electron store）。

## 消息格式（Gateway API）

所有消息为 JSON，统一结构：

```ts
interface GatewayMessage {
  type: string;
  id?: string;      // 关联请求/响应
  payload: object;
  timestamp: string; // ISO 8601
}
```

## 客户端 → Gateway

| type | 说明 | payload 示例 |
|------|------|--------------|
| `chat` | 发送对话 | `{ text, context?, options?: { model?, no_memory? } }` |
| `status` | 请求状态 | `{}` |
| `heartbeat_trigger` | 触发心跳 | `{ dry_run?: boolean }` |
| `skill_invoke` | 调用技能 | `{ skill: string, args: string }` |

示例（chat）：

```json
{
  "type": "chat",
  "id": "msg-001",
  "payload": {
    "text": "What files are in my home directory?",
    "options": { "model": "claude-opus-4-6", "no_memory": false }
  }
}
```

## Gateway → 客户端

| type | 说明 |
|------|------|
| `response` | 对话回复（含 text、tool_calls、tokens_used 等） |
| `tool_call` | 工具执行通知（tool、args、status） |
| `tool_result` | 工具执行结果（tool、output、exit_code） |
| `error` | 错误（code、message） |
| `heartbeat_status` | 心跳结果（result、actions_taken、tokens_used） |

## Client 封装设计建议

- **GatewayClient** 类或单例：
  - `connect(url?: string)` / `disconnect()`，内部维护 `WebSocket` 与重连逻辑。
  - `send(type, payload)`：生成 `id`、写入消息、返回 Promise，在收到同 `id` 的响应或 `error` 时 resolve/reject。
  - 对无请求关联的推送（如 `tool_call`、`tool_result`）通过事件或 Zustand 注入，供 UI 展示。
- **重连**：断线后指数退避重连，并更新连接状态到 store，便于 UI 显示「连接中 / 已断开」。

## 错误与重连

- 收到 `type: 'error'` 时，将错误信息写入 store 或 reject 对应 Promise。
- 网络断开或 WebSocket `close` 时：更新 store 为未连接，触发重连逻辑；可选在设置中提供「手动重连」按钮。
