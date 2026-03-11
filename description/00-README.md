# description 目录说明

本目录存放 **Dobby**（OpenClaw 桌面版）的技术计划与实现说明文档，便于按文档执行与迭代。

## 文档索引

| 文档 | 说明 |
|------|------|
| [plan.md](plan.md) | 总览：目标、技术栈、架构、Gateway 集成、Memory、功能、脚手架、实施顺序 |
| [01-overview-and-goals.md](01-overview-and-goals.md) | 项目背景、目标、与 OpenClaw 的关系、非目标 |
| [02-tech-stack-and-tooling.md](02-tech-stack-and-tooling.md) | Vite/React/Electron/TypeScript、Zustand、推荐依赖与版本 |
| [03-architecture.md](03-architecture.md) | Electron 三进程、数据流、与 Gateway 的集成架构 |
| [04-gateway-integration.md](04-gateway-integration.md) | WebSocket 连接、Gateway API 消息格式、Client 封装、错误与重连 |
| [04b-memory-and-system-prompt.md](04b-memory-and-system-prompt.md) | Memory 机制、系统内置提示词、桌面端展示与打开工作区 |
| [05-features-and-ui.md](05-features-and-ui.md) | 功能列表与界面/路由规划 |
| [06-project-structure-and-scaffolding.md](06-project-structure-and-scaffolding.md) | @quick-start/electron 脚手架、目录结构、Zustand stores、脚本 |
| [07-dev-build-release.md](07-dev-build-release.md) | 开发、调试、构建、打包与发布步骤 |
| [08-implementation-phases.md](08-implementation-phases.md) | 建议实施阶段与里程碑 |

## 使用方式

- 开发前：先读 [plan.md](plan.md) 与 [01-overview-and-goals.md](01-overview-and-goals.md)。
- 搭脚手架：按 [06-project-structure-and-scaffolding.md](06-project-structure-and-scaffolding.md) 执行。
- 实现功能：按 [08-implementation-phases.md](08-implementation-phases.md) 分阶段，参考 [04-gateway-integration.md](04-gateway-integration.md)、[05-features-and-ui.md](05-features-and-ui.md)。
- 打包发布：按 [07-dev-build-release.md](07-dev-build-release.md)。
