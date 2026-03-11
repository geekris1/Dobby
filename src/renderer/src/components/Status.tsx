import { useState } from 'react'
import { useGatewayStore } from '../stores/gatewayStore'
import { GatewayMessage } from '../api/gatewayClient'

export function Status(): React.JSX.Element {
  const { status, client, lastError, reconnect } = useGatewayStore()

  const [gatewayStatus, setGatewayStatus] = useState<Record<string, unknown> | null>(null)
  const [heartbeatResult, setHeartbeatResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async (): Promise<void> => {
    if (!client?.connected) return
    setLoading('status')
    setError(null)
    try {
      const res: GatewayMessage = await client.sendAndWait('status', {})
      setGatewayStatus(res.payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(null)
    }
  }

  const triggerHeartbeat = async (dryRun = false): Promise<void> => {
    if (!client?.connected) return
    setLoading('heartbeat')
    setError(null)
    try {
      const res: GatewayMessage = await client.sendAndWait('heartbeat_trigger', {
        dry_run: dryRun
      })
      setHeartbeatResult(res.payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="status-page">
      <div className="page-header">
        <h2>Gateway 状态</h2>
      </div>

      <div className="card">
        <h3>连接状态</h3>
        <div className="status-row">
          <span className={`status-badge badge-${status}`}>{status}</span>
          {lastError && <span className="error-text">{lastError}</span>}
        </div>
        <div className="card-actions">
          <button className="btn" onClick={reconnect}>
            重新连接
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Gateway 运行状态</h3>
        <div className="card-actions">
          <button
            className="btn"
            onClick={fetchStatus}
            disabled={status !== 'connected' || loading === 'status'}
          >
            {loading === 'status' ? '查询中…' : '查询状态'}
          </button>
        </div>
        {gatewayStatus && (
          <pre className="code-block">{JSON.stringify(gatewayStatus, null, 2)}</pre>
        )}
      </div>

      <div className="card">
        <h3>心跳触发</h3>
        <div className="card-actions">
          <button
            className="btn"
            onClick={() => triggerHeartbeat(false)}
            disabled={status !== 'connected' || loading === 'heartbeat'}
          >
            {loading === 'heartbeat' ? '执行中…' : '触发心跳'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => triggerHeartbeat(true)}
            disabled={status !== 'connected' || loading === 'heartbeat'}
          >
            预演 (Dry Run)
          </button>
        </div>
        {heartbeatResult && (
          <pre className="code-block">{JSON.stringify(heartbeatResult, null, 2)}</pre>
        )}
      </div>

      {error && <div className="card error-card">{error}</div>}
    </div>
  )
}
