import { useState, useEffect } from 'react'

export function WorkspaceCard(): React.JSX.Element {
  const [homeDir, setHomeDir] = useState('')

  useEffect(() => {
    window.api.getHomeDir().then(setHomeDir).catch(console.error)
  }, [])

  const openWorkspace = (): void => {
    window.api.openPath(`${homeDir}/.dobby/workspace`).catch(console.error)
  }

  const openConfigDir = (): void => {
    window.api.openPath(`${homeDir}/.dobby`).catch(console.error)
  }

  return (
    <div className="card">
      <h3>工作区与配置</h3>
      <p className="hint">
        Dobby 工作区位于 <code>{homeDir}/.dobby/workspace</code>
        ，你可以在其中编辑 SOUL.md、USER.md、AGENTS.md、MEMORY.md 等文件来定制 AI 行为。
      </p>
      <div className="card-actions">
        <button className="btn" onClick={openWorkspace}>
          打开工作区目录
        </button>
        <button className="btn btn-secondary" onClick={openConfigDir}>
          打开 ~/.dobby
        </button>
      </div>
    </div>
  )
}
