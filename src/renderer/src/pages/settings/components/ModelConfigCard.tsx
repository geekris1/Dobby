import { useSettingsStore, ModelProvider, KIMI_MODELS } from '../../../stores/settingsStore'

const providerOptions: { value: ModelProvider; label: string }[] = [
  { value: 'none', label: '未配置' },
  { value: 'kimi', label: 'Kimi (Moonshot AI)' },
  { value: 'custom', label: '自定义 (OpenAI 兼容)' }
]

export function ModelConfigCard(): React.JSX.Element {
  const settings = useSettingsStore()
  const configured = settings.isDirectApiConfigured()

  return (
    <div className="card">
      <h3>模型配置</h3>

      <div className="form-group">
        <label htmlFor="model-provider">模型供应商</label>
        <select
          id="model-provider"
          value={settings.modelProvider}
          onChange={(e) => settings.setModelProvider(e.target.value as ModelProvider)}
        >
          {providerOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {settings.modelProvider === 'kimi' && (
        <>
          <div className="form-group">
            <label htmlFor="kimi-api-key">API Key</label>
            <input
              id="kimi-api-key"
              type="password"
              value={settings.kimiApiKey}
              onChange={(e) => settings.setKimiApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="kimi-model">模型</label>
            <select
              id="kimi-model"
              value={settings.kimiModel}
              onChange={(e) => settings.setKimiModel(e.target.value)}
            >
              {KIMI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {settings.modelProvider === 'custom' && (
        <>
          <div className="form-group">
            <label htmlFor="custom-base-url">Base URL</label>
            <input
              id="custom-base-url"
              value={settings.customBaseUrl}
              onChange={(e) => settings.setCustomBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </div>
          <div className="form-group">
            <label htmlFor="custom-api-key">API Key</label>
            <input
              id="custom-api-key"
              type="password"
              value={settings.customApiKey}
              onChange={(e) => settings.setCustomApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="custom-model">模型名称</label>
            <input
              id="custom-model"
              value={settings.customModel}
              onChange={(e) => settings.setCustomModel(e.target.value)}
              placeholder="gpt-4o / deepseek-chat / ..."
            />
          </div>
        </>
      )}

      {settings.modelProvider !== 'none' && (
        <div className={`status-row model-config-status ${configured ? 'configured' : ''}`}>
          <span className={`status-badge badge-${configured ? 'connected' : 'disconnected'}`}>
            {configured ? '已配置' : '未完成'}
          </span>
          {configured && <span className="hint">配置完成，可直接对话（无需 Gateway）</span>}
        </div>
      )}
    </div>
  )
}
