import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'

export interface AppConfig {
  db_path: string
  auto_start: boolean
  min_popup_length: number
  popup_auto_close_seconds: number
  floating_window_size: number
  floating_window_opacity: number
  floating_visible: boolean
  shortcut_search: string
  shortcut_paste_last: string
  enable_encryption: boolean
  archive_after_days: number
  theme: 'light' | 'dark' | 'system'
  language: string
  backup_enabled: boolean
  backup_interval_days: number
}

const defaultConfig: AppConfig = {
  db_path: '',
  auto_start: false,
  min_popup_length: 20,
  popup_auto_close_seconds: 3,
  floating_window_size: 56,
  floating_window_opacity: 0.95,
  floating_visible: true,
  shortcut_search: 'Ctrl+Shift+V',
  shortcut_paste_last: 'Ctrl+Shift+1',
  enable_encryption: false,
  archive_after_days: 7,
  theme: 'system',
  language: 'zh',
  backup_enabled: true,
  backup_interval_days: 7,
}

interface ConfigState {
  config: AppConfig
  isLoading: boolean
  error: string | null

  // Actions
  loadConfig: () => Promise<void>
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>
  resetConfig: () => Promise<void>
  setTheme: (theme: AppConfig['theme']) => void

  // Computed
  effectiveTheme: 'light' | 'dark'
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: defaultConfig,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null })
    try {
      const config = await invoke<AppConfig>('config_get')
      set({ config, isLoading: false })

      // Apply theme
      const effectiveTheme = get().effectiveTheme
      document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')
    } catch (error) {
      set({ error: String(error), isLoading: false })
    }
  },

  updateConfig: async updates => {
    try {
      const newConfig = { ...get().config, ...updates }
      await invoke('config_update', { newConfig })
      set({ config: newConfig })

      // Re-apply theme if changed
      if (updates.theme) {
        const effectiveTheme = get().effectiveTheme
        document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  resetConfig: async () => {
    try {
      await invoke('config_update', { newConfig: defaultConfig })
      set({ config: defaultConfig })
    } catch (error) {
      set({ error: String(error) })
    }
  },

  setTheme: theme => {
    get().updateConfig({ theme })
  },

  get effectiveTheme() {
    const { config } = get()
    if (config.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return config.theme
  },
}))

// Listen for theme changes from other windows
export const setupThemeListener = () => {
  listen('theme-changed', (event: { payload: 'light' | 'dark' }) => {
    document.documentElement.classList.toggle('dark', event.payload === 'dark')
  })
}
