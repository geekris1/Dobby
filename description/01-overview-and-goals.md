# 项目背景与目标

## 项目背景

- **OpenClaw** 是开源个人 AI 助手框架，以 Gateway 为中心，通过 WebSocket 控制面（默认 `ws://localhost:18789`）与 Brain、Hands、Memory、Channels、Skills 等组件协作。
- 用户通常通过 CLI（`openclaw chat`）或各渠道桥接（WhatsApp、Telegram 等）与 OpenClaw 交互；缺少一个**本地桌面图形客户端**，便于在桌面环境直接对话、查看状态、触发心跳与技能。

## 项目目标

- 开发一个 **桌面端应用（Dobby）**，作为 OpenClaw 的本地客户端。
- 通过 **Gateway WebSocket API** 与已运行的 OpenClaw 实例通信，实现：
  - 连接状态展示与配置
  - 聊天（发送消息、展示回复与 tool_call/tool_result）
  - 状态查询与心跳触发
  - 技能调用入口
  - 设置（Gateway 地址、端口、认证）与「打开工作区 / 配置目录」等快捷方式。
- 技术选型：**Vite + React + Electron**，状态管理用 **Zustand**，脚手架用 **@quick-start/electron**（选 Vite + React）。

## 与 OpenClaw 的关系

- Dobby **不实现** Gateway、Brain、Hands、Memory、Channels 等后端逻辑。
- **前提**：本机已安装并运行 OpenClaw（`openclaw gateway` 或 daemon），Gateway 监听默认或配置的端口。
- Dobby 仅实现**桌面 UI + 与 Gateway 的协议层**，相当于「带界面的控制台客户端」。

## 非目标（Out of Scope）

- 不替代或嵌入 OpenClaw 的安装与配置流程。
- 不直接读写 OpenClaw 工作区文件（如 SOUL.md、USER.md）；仅通过 UI 引导用户打开工作区目录自行编辑。
- 不实现新的 Channel 桥接或 Skill 运行时；仅通过 Gateway 已有能力（chat、status、heartbeat_trigger、skill_invoke）进行操作。
