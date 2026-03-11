import { useRef } from 'react'
import { ThemeCard } from './components/ThemeCard'
import { ModelConfigCard } from './components/ModelConfigCard'
import { GatewayConnectionForm } from './components/GatewayConnectionForm'
import { GatewayStatusCard } from './components/GatewayStatusCard'
import { WorkspaceCard } from './components/WorkspaceCard'
import { HelpDialog } from './components/HelpDialog'

export function Settings(): React.JSX.Element {
  const helpDialogRef = useRef<HTMLDialogElement>(null)

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>设置</h2>
        <button className="btn btn-secondary" onClick={() => helpDialogRef.current?.showModal()}>
          ❓ 帮助
        </button>
      </div>

      <ThemeCard />
      <ModelConfigCard />
      <GatewayConnectionForm />
      <GatewayStatusCard />
      <WorkspaceCard />
      <HelpDialog ref={helpDialogRef} />
    </div>
  )
}
