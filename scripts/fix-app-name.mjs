import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

const plist = join('node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'Info.plist')

if (process.platform === 'darwin' && existsSync(plist)) {
  execSync(`plutil -replace CFBundleDisplayName -string "Dobby" "${plist}"`)
  execSync(`plutil -replace CFBundleName -string "Dobby" "${plist}"`)
  console.log('Patched Electron.app name → Dobby')
}
