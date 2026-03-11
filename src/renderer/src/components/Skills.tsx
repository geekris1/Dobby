import { useState, FormEvent } from 'react'
import { useGatewayStore } from '../stores/gatewayStore'
import { GatewayMessage } from '../api/gatewayClient'

export function Skills(): React.JSX.Element {
  const { status, client } = useGatewayStore()

  const [skillName, setSkillName] = useState('')
  const [skillArgs, setSkillArgs] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInvoke = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!client?.connected || !skillName.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res: GatewayMessage = await client.sendAndWait('skill_invoke', {
        skill: skillName.trim(),
        args: skillArgs.trim()
      })
      setResult(res.payload)
    } catch (err) {
      if (err && typeof err === 'object' && 'payload' in err) {
        const gwErr = err as GatewayMessage
        setError(
          (gwErr.payload as { message?: string }).message ?? JSON.stringify(gwErr.payload)
        )
      } else {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  const isDisconnected = status !== 'connected'

  return (
    <div className="skills-page">
      <div className="page-header">
        <h2>技能调用</h2>
      </div>

      <form className="card" onSubmit={handleInvoke}>
        <div className="form-group">
          <label htmlFor="skill-name">技能名称</label>
          <input
            id="skill-name"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            placeholder="如：web_search"
            disabled={isDisconnected}
          />
        </div>
        <div className="form-group">
          <label htmlFor="skill-args">参数</label>
          <textarea
            id="skill-args"
            value={skillArgs}
            onChange={(e) => setSkillArgs(e.target.value)}
            placeholder="传递给技能的参数（字符串或 JSON）"
            rows={4}
            disabled={isDisconnected}
          />
        </div>
        <div className="card-actions">
          <button
            className="btn"
            type="submit"
            disabled={isDisconnected || !skillName.trim() || loading}
          >
            {loading ? '调用中…' : '调用技能'}
          </button>
        </div>
      </form>

      {result && (
        <div className="card">
          <h3>调用结果</h3>
          <pre className="code-block">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {error && <div className="card error-card">{error}</div>}
    </div>
  )
}
