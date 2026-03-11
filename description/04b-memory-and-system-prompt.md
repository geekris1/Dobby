# Memory 机制与系统提示词

桌面端不直接读写 OpenClaw 工作区文件，但应在文档与 UI 中体现（如「打开工作区」、设置里展示路径），便于用户理解与维护。

## 工作区记忆文件结构（~/.openclaw/workspace/）

| 文件 | 用途 |
|------|------|
| **SOUL.md** | 行为核心：性格、价值观、不可妥协的约束；影响跨会话一致性 |
| **USER.md** | 用户偏好层：沟通风格、输出格式、常用偏好、已知约束 |
| **AGENTS.md** | 顶层操作契约：优先级、边界、工作流、质量要求（稳定规则，非临时任务） |
| **IDENTITY.md** | 结构化身份：名称、角色、目标、语气；可用 `openclaw agents set-identity --from-identity` 应用 |
| **MEMORY.md** | 长期记忆：持久事实与压缩历史，跨日保留；受 `agents.defaults.compaction.memoryFlush` 控制 |
| **memory/YYYY-MM-DD.md** | 按日工作日志，自动预注入、可被记忆检索 |
| **memory/projects.md** | 项目相关记忆（项目约定、进度摘要等，可选） |
| **memory/infra.md** | 基础设施/环境相关记忆（路径、环境变量、工具约定等，可选） |
| **memory/lessons.md** | 经验教训与复盘（可选） |

其他运维相关：**TOOLS.md**（工具与环境）、**HEARTBEAT.md**（心跳节奏与仪式）、**BOOT.md**（启动钩子）、**BOOTSTRAP.md**（首次访谈脚本）。

## 系统内置提示词（由 OpenClaw 组装）

- **性质**：每次运行由 OpenClaw 动态组装，非单段静态文本。
- **固定部分**：Reasoning、Runtime（主机/OS/Node/模型/仓库根/思考级别）、Heartbeats、Reply Tags、Current Date & Time、Sandbox、Workspace Files（注入）、Documentation、Skills、Safety、Tooling。
- **工作区引导注入**：以下文件被修剪后注入（每文件默认最大约 20k 字符，总上限约 150k）：BOOTSTRAP.md、HEARTBEAT.md、USER.md、IDENTITY.md、TOOLS.md、SOUL.md、AGENTS.md；MEMORY.md / memory.md 亦在项目上下文中。
- **promptMode**：`none`（仅身份行）、`minimal`（子智能体，省略 Skills/记忆召回等）、`full`（默认，完整）。

## 桌面端如何展示与打开工作区

- **设置或帮助**：展示工作区路径 `~/.openclaw/workspace`（或当前系统下的展开路径），并简短说明 SOUL/USER/AGENTS/MEMORY 及 memory/* 的作用。
- **快捷操作**：提供「打开工作区目录」按钮，通过 Electron 主进程调用系统 API 打开该目录（如 `shell.openPath` 或 `shell.showItemInFolder` 的目录等价），便于用户用本地编辑器编辑 soul、user、agents、memory 等文件。
- 可选：提供「打开 ~/.openclaw」按钮，用于查看配置与日志。
