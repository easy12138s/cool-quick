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
  floating_hover_open_drawer: boolean
  floating_hover_delay_ms: number
  floating_hide_drawer_on_drag: boolean
  drawer_auto_hide: boolean
  drawer_hide_delay_ms: number
  drawer_default_limit: number
  drawer_sort: 'recent' | 'frequent'
  popup_enabled: boolean
  popup_types: string[]
  popup_dedupe_window_ms: number
  save_mode: 'manual' | 'auto'
  dedupe_mode: 'merge' | 'new'
  never_archive_favorites: boolean
  export_mask_sensitive: boolean
  shortcut_search: string
  shortcut_paste_last: string
  shortcut_toggle_drawer: string
  shortcut_toggle_popup: string
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
  floating_window_size: 48,
  floating_window_opacity: 0.9,
  floating_visible: true,
  floating_hover_open_drawer: true,
  floating_hover_delay_ms: 300,
  floating_hide_drawer_on_drag: true,
  drawer_auto_hide: true,
  drawer_hide_delay_ms: 800,
  drawer_default_limit: 10,
  drawer_sort: 'recent',
  popup_enabled: true,
  popup_types: ['phone', 'email', 'url', 'code', 'password', 'text'],
  popup_dedupe_window_ms: 3000,
  save_mode: 'manual',
  dedupe_mode: 'merge',
  never_archive_favorites: true,
  export_mask_sensitive: true,
  shortcut_search: 'Ctrl+Shift+V',
  shortcut_paste_last: 'Ctrl+Shift+1',
  shortcut_toggle_drawer: 'Ctrl+Shift+D',
  shortcut_toggle_popup: 'Ctrl+Shift+P',
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
  setTheme: (theme: AppConfig['theme']) => Promise<void>

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

  setTheme: async theme => {
    await get().updateConfig({ theme })
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

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    const { config, effectiveTheme } = useConfigStore.getState()
    if (config.theme !== 'system') return
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')
  }

  if ('addEventListener' in media) {
    media.addEventListener('change', onChange)
  } else {
    // @ts-ignore
    media.addListener(onChange)
  }
}

export const setupConfigListener = () => {
  listen('config-updated', (event: { payload: AppConfig }) => {
    const nextConfig = event.payload
    useConfigStore.setState({ config: nextConfig })

    const effectiveTheme = useConfigStore.getState().effectiveTheme
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark')

    invoke('window_apply_floating_style', {
      size: nextConfig.floating_window_size,
      opacity: nextConfig.floating_window_opacity,
    }).catch(() => {})

    if (nextConfig.floating_visible) {
      invoke('window_show_floating').catch(() => {})
    } else {
      invoke('window_hide_floating').catch(() => {})
    }
  })
}
