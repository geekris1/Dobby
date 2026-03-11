import { useState } from 'react'
import { useGatewayStore } from '../../../stores/gatewayStore'
import { GatewayMessage } from '../../../api/gatewayClient'

export function GatewayStatusCard(): React.JSX.Element {
  const { status, client, lastError } = useGatewayStore()

  const [gatewayStatus, setGatewayStatus] = useState<Record<string, unknown> | null>(null)
  const [heartbeatResult, setHeartbeatResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  const fetchStatus = async (): Promise<void> => {
    if (!client?.connected) return
    setLoading('status')
    setStatusError(null)
    try {
      const res: GatewayMessage = await client.sendAndWait('status', {})
      setGatewayStatus(res.payload)
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(null)
    }
  }

  const triggerHeartbeat = async (dryRun = false): Promise<void> => {
    if (!client?.connected) return
    setLoading('heartbeat')
    setStatusError(null)
    try {
      const res: GatewayMessage = await client.sendAndWait('heartbeat_trigger', {
        dry_run: dryRun
      })
      setHeartbeatResult(res.payload)
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="card">
      <h3>Gateway 状态</h3>
      <div className="status-row">
        <span className={`status-badge badge-${status}`}>{status}</span>
        {lastError && <span className="error-text">{lastError}</span>}
      </div>

      <div className="card-actions">
        <button
          className="btn"
          onClick={fetchStatus}
          disabled={status !== 'connected' || loading === 'status'}
        >
          {loading === 'status' ? '查询中…' : '查询状态'}
        </button>
        <button
          className="btn btn-secondary"
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

      {gatewayStatus && (
        <pre className="code-block">{JSON.stringify(gatewayStatus, null, 2)}</pre>
      )}
      {heartbeatResult && (
        <pre className="code-block">{JSON.stringify(heartbeatResult, null, 2)}</pre>
      )}
      {statusError && <div className="inline-error">{statusError}</div>}
    </div>
  )
}
