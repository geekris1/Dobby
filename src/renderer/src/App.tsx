import { useEffect, useCallback } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { Chat } from './pages/chat'
import { Settings } from './pages/settings'
import { useGatewayStore } from './stores/gatewayStore'
import { useChatStore } from './stores/chatStore'
import { useSettingsStore } from './stores/settingsStore'
import { GatewayMessage } from './api/gatewayClient'

function resolveTheme(mode: string): string {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return mode
}

function App(): React.JSX.Element {
  const { client, connect } = useGatewayStore()
  const theme = useSettingsStore((s) => s.theme)

  const applyTheme = useCallback(() => {
    document.documentElement.setAttribute('data-theme', resolveTheme(theme))
  }, [theme])

  useEffect(() => {
    applyTheme()
    if (theme !== 'system') return

    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (): void => applyTheme()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, applyTheme])

  useEffect(() => {
    connect()
  }, [connect])

  useEffect(() => {
    if (!client) return

    return client.onMessage((msg: GatewayMessage) => {
      const cs = useChatStore.getState()
      switch (msg.type) {
        case 'response':
          cs.handleResponse(msg)
          break
        case 'tool_call':
          cs.handleToolCall(msg)
          break
        case 'tool_result':
          cs.handleToolResult(msg)
          break
        case 'error':
          if (msg.id) cs.handleError(msg)
          break
      }
    })
  }, [client])

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">Dobby</h1>
          <span className="app-subtitle">AI Desktop Assistant</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end>
            <span className="nav-icon">💬</span>
            聊天
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/settings" className="settings-link">
            <span className="nav-icon">⚙️</span>
            <span>设置</span>
          </NavLink>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
