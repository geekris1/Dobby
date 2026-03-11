import { useState, useEffect } from 'react'

export function Help(): React.JSX.Element {
  const [homeDir, setHomeDir] = useState('')

  useEffect(() => {
    window.api.getHomeDir().then(setHomeDir).catch(console.error)
  }, [])

  const openWorkspace = (): void => {
    window.api.openPath(`${homeDir}/.dobby/workspace`).catch(console.error)
  }

  return (
    <div className="help-page">
      <div className="page-header">
        <h2>帮助</h2>
      </div>

      <div className="card">
        <h3>关于 Dobby</h3>
        <p>
          Dobby 是一个 AI 桌面助手，通过 Gateway WebSocket API 与本机运行的
          Gateway 实例通信。它提供聊天、状态查询、心跳触发和技能调用等功能。
        </p>
        <p>
          <strong>前提</strong>：需要先在本机启动 Gateway（
          <code>dobby gateway</code> 或 daemon），默认监听{' '}
          <code>ws://localhost:19090</code>。
        </p>
      </div>

      <div className="card">
        <h3>Memory 机制与工作区文件</h3>
        <p>
          Dobby 使用工作区文件（<code>~/.dobby/workspace/</code>
          ）来存储记忆与行为配置。桌面端不直接读写这些文件，但你可以通过「打开工作区目录」在本地编辑器中编辑它们。
        </p>

        <table className="help-table">
          <thead>
            <tr>
              <th>文件</th>
              <th>用途</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>SOUL.md</code>
              </td>
              <td>行为核心：性格、价值观、不可妥协的约束；影响跨会话一致性</td>
            </tr>
            <tr>
              <td>
                <code>USER.md</code>
              </td>
              <td>用户偏好层：沟通风格、输出格式、常用偏好、已知约束</td>
            </tr>
            <tr>
              <td>
                <code>AGENTS.md</code>
              </td>
              <td>顶层操作契约：优先级、边界、工作流、质量要求</td>
            </tr>
            <tr>
              <td>
                <code>IDENTITY.md</code>
              </td>
              <td>结构化身份：名称、角色、目标、语气</td>
            </tr>
            <tr>
              <td>
                <code>MEMORY.md</code>
              </td>
              <td>长期记忆：持久事实与压缩历史，跨日保留</td>
            </tr>
            <tr>
              <td>
                <code>memory/YYYY-MM-DD.md</code>
              </td>
              <td>按日工作日志，自动预注入、可被记忆检索</td>
            </tr>
            <tr>
              <td>
                <code>memory/projects.md</code>
              </td>
              <td>项目相关记忆（项目约定、进度摘要等）</td>
            </tr>
            <tr>
              <td>
                <code>memory/infra.md</code>
              </td>
              <td>基础设施/环境相关记忆（路径、环境变量、工具约定等）</td>
            </tr>
            <tr>
              <td>
                <code>memory/lessons.md</code>
              </td>
              <td>经验教训与复盘</td>
            </tr>
          </tbody>
        </table>

        <p>
          其他运维文件：<code>TOOLS.md</code>（工具与环境）、<code>HEARTBEAT.md</code>
          （心跳节奏）、<code>BOOT.md</code>（启动钩子）、<code>BOOTSTRAP.md</code>
          （首次访谈脚本）。
        </p>
      </div>

      <div className="card">
        <h3>系统提示词</h3>
        <p>
          Dobby 的系统提示词由 Gateway 在每次运行时动态组装，包含固定部分（Reasoning、Runtime、Heartbeats
          等）和工作区引导注入（SOUL.md、USER.md、AGENTS.md 等文件内容）。
        </p>
        <p>
          <strong>promptMode</strong>：
        </p>
        <ul>
          <li>
            <code>full</code>（默认）——完整提示词
          </li>
          <li>
            <code>minimal</code>——子智能体模式，省略 Skills/记忆召回等
          </li>
          <li>
            <code>none</code>——仅身份行
          </li>
        </ul>
      </div>

      <div className="card">
        <h3>快捷操作</h3>
        <div className="card-actions">
          <button className="btn" onClick={openWorkspace}>
            打开工作区目录
          </button>
        </div>
        <p className="hint">
          工作区路径：<code>{homeDir}/.dobby/workspace</code>
        </p>
      </div>
    </div>
  )
}
