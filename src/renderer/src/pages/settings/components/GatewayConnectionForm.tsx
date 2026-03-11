import { FormEvent } from 'react'
import { useSettingsStore } from '../../../stores/settingsStore'
import { useGatewayStore } from '../../../stores/gatewayStore'

export function GatewayConnectionForm(): React.JSX.Element {
  const settings = useSettingsStore()
  const { reconnect, status } = useGatewayStore()

  const handleSave = (e: FormEvent): void => {
    e.preventDefault()
    reconnect()
  }

  return (
    <form className="card" onSubmit={handleSave}>
      <h3>Gateway 连接</h3>

      <div className="form-group">
        <label htmlFor="gw-host">主机 (Host)</label>
        <input
          id="gw-host"
          value={settings.gatewayHost}
          onChange={(e) => settings.setGatewayHost(e.target.value)}
          placeholder="localhost"
        />
      </div>

      <div className="form-group">
        <label htmlFor="gw-port">端口 (Port)</label>
        <input
          id="gw-port"
          value={settings.gatewayPort}
          onChange={(e) => settings.setGatewayPort(e.target.value)}
          placeholder="19090"
        />
      </div>

      <div className="form-group">
        <label htmlFor="gw-token">认证 Token（可选）</label>
        <input
          id="gw-token"
          type="password"
          value={settings.authToken}
          onChange={(e) => settings.setAuthToken(e.target.value)}
          placeholder="留空则不认证"
        />
      </div>

      <div className="form-group">
        <label htmlFor="gw-model">默认模型</label>
        <input
          id="gw-model"
          value={settings.selectedModel}
          onChange={(e) => settings.setSelectedModel(e.target.value)}
          placeholder="留空使用 Gateway 默认模型"
        />
      </div>

      <div className="settings-url-preview">
        WebSocket URL: <code>{settings.getWebSocketUrl()}</code>
      </div>

      <div className="card-actions">
        <button className="btn" type="submit">
          保存并重连
        </button>
        <span className={`status-badge badge-${status}`}>{status}</span>
      </div>
    </form>
  )
}
