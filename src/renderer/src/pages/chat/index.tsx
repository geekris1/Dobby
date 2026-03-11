import { useEffect, useRef, FormEvent, KeyboardEvent } from 'react'
import { useChatStore, ChatMessage } from '../../stores/chatStore'
import { useGatewayStore } from '../../stores/gatewayStore'
import { useSettingsStore } from '../../stores/settingsStore'

function ToolCallBlock({ msg }: { msg: ChatMessage }): React.JSX.Element | null {
  if (msg.toolCalls.length === 0 && msg.toolResults.length === 0) return null

  return (
    <div className="tool-blocks">
      {msg.toolCalls.map((tc, i) => (
        <details key={`tc-${i}`} className="tool-call-detail">
          <summary>
            🔧 {tc.tool} <span className="tool-status">{tc.status}</span>
          </summary>
          <pre className="tool-args">{tc.args}</pre>
        </details>
      ))}
      {msg.toolResults.map((tr, i) => (
        <details key={`tr-${i}`} className="tool-result-detail">
          <summary>
            📋 {tr.tool} {tr.exitCode !== undefined && `(exit: ${tr.exitCode})`}
          </summary>
          <pre className="tool-output">{tr.output}</pre>
        </details>
      ))}
    </div>
  )
}

function SendIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  )
}

function StopIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

export function Chat(): React.JSX.Element {
  const { messages, input, setInput, sendMessage, stopGeneration, clearMessages, streaming } =
    useChatStore()
  const { status } = useGatewayStore()
  const directApiConfigured = useSettingsStore((s) => s.isDirectApiConfigured())
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    sendMessage()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const canChat = directApiConfigured || status === 'connected'
  const isStreaming = streaming
  const hasMessages = messages.length > 0

  const placeholder = !canChat
    ? '请先在设置中配置模型或连接 Gateway'
    : '输入消息，Enter 发送，Shift+Enter 换行'

  return (
    <div className="chat-page">
      <div className="chat-messages" ref={listRef}>
        {!hasMessages && (
          <div className="chat-empty">
            <div className="chat-empty-title">Dobby</div>
            <p className="chat-empty-subtitle">有什么可以帮你的？</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`message message-${m.role}`}>
            <div className="message-label">{m.role === 'user' ? '你' : 'Dobby'}</div>
            <div className="message-bubble">
              {m.pending && !m.content && !m.toolCalls.length ? (
                <span className="typing-indicator">思考中…</span>
              ) : (
                <div className="message-content">{m.content}</div>
              )}
              {m.error && <div className="message-error">{m.error}</div>}
              <ToolCallBlock msg={m} />
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-wrapper">
        <form className="chat-input-card" onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!canChat}
            rows={3}
          />
          <div className="chat-input-actions">
            {hasMessages && (
              <button type="button" className="btn-clear" onClick={clearMessages} title="清空对话">
                🗑
              </button>
            )}
            <div className="chat-input-spacer" />
            {isStreaming ? (
              <button
                type="button"
                className="btn-send btn-stop"
                onClick={stopGeneration}
                title="停止生成"
              >
                <StopIcon />
              </button>
            ) : (
              <button
                type="submit"
                className="btn-send"
                disabled={!canChat || !input.trim()}
                title="发送"
              >
                <SendIcon />
              </button>
            )}
          </div>
        </form>
        <div className="chat-input-hint">内容由 AI 生成，请仔细甄别</div>
      </div>
    </div>
  )
}
