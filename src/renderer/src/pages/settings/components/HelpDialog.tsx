import { forwardRef } from 'react'

export const HelpDialog = forwardRef<HTMLDialogElement>(function HelpDialog(_props, ref) {
  const dialogRef = ref as React.RefObject<HTMLDialogElement>

  return (
    <dialog ref={ref} className="help-dialog">
      <div className="help-dialog-content">
        <div className="help-dialog-header">
          <h2>帮助</h2>
          <button className="btn-close" onClick={() => dialogRef.current?.close()}>
            ✕
          </button>
        </div>

        <div className="help-dialog-body">
          <section>
            <h3>关于 Dobby</h3>
            <p>
              Dobby 是一个 AI 桌面助手，通过 Gateway WebSocket API 与本机运行的 Gateway
              实例通信。它提供聊天、状态查询、心跳触发等功能。
            </p>
            <p>
              <strong>前提</strong>：需要先在本机启动 Gateway（
              <code>dobby gateway</code> 或 daemon），默认监听{' '}
              <code>ws://localhost:19090</code>。
            </p>
          </section>

          <section>
            <h3>Memory 机制与工作区文件</h3>
            <p>
              Dobby 使用工作区文件（<code>~/.dobby/workspace/</code>
              ）来存储记忆与行为配置。你可以通过「打开工作区目录」在本地编辑器中编辑它们。
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
                  <td><code>SOUL.md</code></td>
                  <td>行为核心：性格、价值观、不可妥协的约束</td>
                </tr>
                <tr>
                  <td><code>USER.md</code></td>
                  <td>用户偏好层：沟通风格、输出格式、常用偏好</td>
                </tr>
                <tr>
                  <td><code>AGENTS.md</code></td>
                  <td>顶层操作契约：优先级、边界、工作流、质量要求</td>
                </tr>
                <tr>
                  <td><code>IDENTITY.md</code></td>
                  <td>结构化身份：名称、角色、目标、语气</td>
                </tr>
                <tr>
                  <td><code>MEMORY.md</code></td>
                  <td>长期记忆：持久事实与压缩历史，跨日保留</td>
                </tr>
                <tr>
                  <td><code>memory/YYYY-MM-DD.md</code></td>
                  <td>按日工作日志</td>
                </tr>
                <tr>
                  <td><code>memory/projects.md</code></td>
                  <td>项目相关记忆</td>
                </tr>
                <tr>
                  <td><code>memory/infra.md</code></td>
                  <td>基础设施/环境相关记忆</td>
                </tr>
                <tr>
                  <td><code>memory/lessons.md</code></td>
                  <td>经验教训与复盘</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section>
            <h3>系统提示词</h3>
            <p>
              Dobby 的系统提示词由 Gateway 在每次运行时动态组装，包含固定部分和工作区引导注入。
            </p>
            <p><strong>promptMode</strong>：</p>
            <ul>
              <li><code>full</code>（默认）——完整提示词</li>
              <li><code>minimal</code>——子智能体模式</li>
              <li><code>none</code>——仅身份行</li>
            </ul>
          </section>
        </div>
      </div>
    </dialog>
  )
})
