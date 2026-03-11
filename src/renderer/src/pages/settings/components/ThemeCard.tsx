import { useSettingsStore, ThemeMode } from '../../../stores/settingsStore'

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' }
]

export function ThemeCard(): React.JSX.Element {
  const { theme, setTheme } = useSettingsStore()

  return (
    <div className="card">
      <h3>外观</h3>
      <div className="theme-options">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            className={`theme-option${theme === opt.value ? ' active' : ''}`}
            onClick={() => setTheme(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
