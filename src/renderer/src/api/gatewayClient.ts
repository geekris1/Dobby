export interface GatewayMessage {
  type: string
  id?: string
  payload: Record<string, unknown>
  timestamp: string
}

type MessageHandler = (msg: GatewayMessage) => void
type StatusChangeHandler = (status: 'connected' | 'connecting' | 'disconnected') => void

export class GatewayClient {
  private ws: WebSocket | null = null
  private url: string
  private messageHandlers = new Set<MessageHandler>()
  private statusChangeHandlers = new Set<StatusChangeHandler>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private shouldReconnect = true
  private idSeq = 0

  constructor(url: string) {
    this.url = url
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    this.shouldReconnect = true
    this.emitStatus('connecting')

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = (): void => {
        this.reconnectAttempts = 0
        this.emitStatus('connected')
      }

      this.ws.onclose = (): void => {
        this.emitStatus('disconnected')
        this.scheduleReconnect()
      }

      this.ws.onerror = (): void => {
        /* onclose fires after onerror */
      }

      this.ws.onmessage = (event): void => {
        try {
          const msg = JSON.parse(event.data as string) as GatewayMessage
          this.messageHandlers.forEach((h) => h(msg))
        } catch (err) {
          console.error('Failed to parse gateway message', err)
        }
      }
    } catch {
      this.emitStatus('disconnected')
      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
    this.emitStatus('disconnected')
  }

  send(type: string, payload: Record<string, unknown>, id?: string): string {
    const msgId = id ?? this.generateId()
    const msg: GatewayMessage = {
      type,
      id: msgId,
      payload,
      timestamp: new Date().toISOString()
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
    return msgId
  }

  sendAndWait(
    type: string,
    payload: Record<string, unknown>,
    timeout = 30000
  ): Promise<GatewayMessage> {
    return new Promise((resolve, reject) => {
      const id = this.generateId()
      let timer: ReturnType<typeof setTimeout>

      const handler: MessageHandler = (msg) => {
        if (msg.id !== id) return
        clearTimeout(timer)
        this.messageHandlers.delete(handler)
        if (msg.type === 'error') {
          reject(msg)
        } else {
          resolve(msg)
        }
      }

      this.messageHandlers.add(handler)
      this.send(type, payload, id)

      timer = setTimeout(() => {
        this.messageHandlers.delete(handler)
        reject(new Error('Request timeout'))
      }, timeout)
    })
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusChangeHandlers.add(handler)
    return () => this.statusChangeHandlers.delete(handler)
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private generateId(): string {
    return `dobby-${Date.now()}-${++this.idSeq}`
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) return

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private emitStatus(status: 'connected' | 'connecting' | 'disconnected'): void {
    this.statusChangeHandlers.forEach((h) => h(status))
  }
}
