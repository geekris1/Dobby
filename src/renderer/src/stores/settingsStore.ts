import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'dark' | 'light'
export type ModelProvider = 'none' | 'kimi' | 'custom'

export const KIMI_BASE_URL = 'https://api.moonshot.cn/v1'

export const KIMI_MODELS = [
  { value: 'kimi-k2.5', label: 'kimi-k2.5' },
  { value: 'kimi-k2-0905-preview', label: 'kimi-k2-0905-preview' },
  { value: 'kimi-k2-turbo-preview', label: 'kimi-k2-turbo-preview' },
  { value: 'kimi-k2-thinking', label: 'kimi-k2-thinking' },
  { value: 'kimi-k2-thinking-turbo', label: 'kimi-k2-thinking-turbo' }
] as const

type SettingsState = {
  gatewayHost: string
  gatewayPort: string
  authToken: string
  selectedModel: string
  theme: ThemeMode

  modelProvider: ModelProvider
  kimiApiKey: string
  kimiModel: string
  customBaseUrl: string
  customApiKey: string
  customModel: string

  setGatewayHost: (host: string) => void
  setGatewayPort: (port: string) => void
  setAuthToken: (token: string) => void
  setSelectedModel: (model: string) => void
  setTheme: (theme: ThemeMode) => void
  setModelProvider: (provider: ModelProvider) => void
  setKimiApiKey: (key: string) => void
  setKimiModel: (model: string) => void
  setCustomBaseUrl: (url: string) => void
  setCustomApiKey: (key: string) => void
  setCustomModel: (model: string) => void
  getWebSocketUrl: () => string
  isDirectApiConfigured: () => boolean
  getDirectApiConfig: () => { baseUrl: string; apiKey: string; model: string } | null
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      gatewayHost: 'localhost',
      gatewayPort: '19090',
      authToken: '',
      selectedModel: '',
      theme: 'system',

      modelProvider: 'none',
      kimiApiKey: '',
      kimiModel: 'kimi-k2.5',
      customBaseUrl: '',
      customApiKey: '',
      customModel: '',

      setGatewayHost: (gatewayHost) => set({ gatewayHost }),
      setGatewayPort: (gatewayPort) => set({ gatewayPort }),
      setAuthToken: (authToken) => set({ authToken }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setTheme: (theme) => set({ theme }),
      setModelProvider: (modelProvider) => set({ modelProvider }),
      setKimiApiKey: (kimiApiKey) => set({ kimiApiKey }),
      setKimiModel: (kimiModel) => set({ kimiModel }),
      setCustomBaseUrl: (customBaseUrl) => set({ customBaseUrl }),
      setCustomApiKey: (customApiKey) => set({ customApiKey }),
      setCustomModel: (customModel) => set({ customModel }),
      getWebSocketUrl: () => {
        const { gatewayHost, gatewayPort, authToken } = get()
        const base = `ws://${gatewayHost}:${gatewayPort}`
        return authToken.trim()
          ? `${base}?token=${encodeURIComponent(authToken)}`
          : base
      },
      isDirectApiConfigured: () => {
        const s = get()
        if (s.modelProvider === 'kimi') return !!s.kimiApiKey.trim()
        if (s.modelProvider === 'custom')
          return !!(s.customBaseUrl.trim() && s.customApiKey.trim() && s.customModel.trim())
        return false
      },
      getDirectApiConfig: () => {
        const s = get()
        if (s.modelProvider === 'kimi' && s.kimiApiKey.trim()) {
          return { baseUrl: KIMI_BASE_URL, apiKey: s.kimiApiKey, model: s.kimiModel }
        }
        if (
          s.modelProvider === 'custom' &&
          s.customBaseUrl.trim() &&
          s.customApiKey.trim() &&
          s.customModel.trim()
        ) {
          return {
            baseUrl: s.customBaseUrl.replace(/\/+$/, ''),
            apiKey: s.customApiKey,
            model: s.customModel
          }
        }
        return null
      }
    }),
    {
      name: 'dobby-settings',
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>
        if (version < 1) {
          const validModels = KIMI_MODELS.map((m) => m.value) as readonly string[]
          if (state.kimiModel && !validModels.includes(state.kimiModel as string)) {
            state.kimiModel = 'kimi-k2.5'
          }
        }
        return state as SettingsState
      }
    }
  )
)
