import { create } from 'zustand'
import { GatewayClient } from '../api/gatewayClient'
import { useSettingsStore } from './settingsStore'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

type GatewayState = {
  status: ConnectionStatus
  lastError: string | null
  client: GatewayClient | null
  connect: () => void
  disconnect: () => void
  reconnect: () => void
}

export const useGatewayStore = create<GatewayState>((set, get) => ({
  status: 'disconnected',
  lastError: null,
  client: null,

  connect: () => {
    const current = get()
    if (current.status === 'connecting' || current.status === 'connected') return

    current.client?.disconnect()

    const url = useSettingsStore.getState().getWebSocketUrl()
    const client = new GatewayClient(url)

    client.onStatusChange((status) => {
      set({ status, lastError: status === 'disconnected' ? get().lastError : null })
    })

    set({ client, lastError: null })
    client.connect()
  },

  disconnect: () => {
    get().client?.disconnect()
    set({ client: null, status: 'disconnected' })
  },

  reconnect: () => {
    const { disconnect, connect } = get()
    disconnect()
    setTimeout(connect, 200)
  }
}))
