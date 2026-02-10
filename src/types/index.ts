export interface Note {
  id: string
  title?: string
  content: string
  note_type: string
  tags: string[]
  source_app: string
  created_at: number
  updated_at: number
  is_favorite: boolean
  is_archived: boolean
  use_count: number
}

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

export interface NoteFilters {
  search?: string
  types?: string[]
  isFavorite?: boolean
  isArchived?: boolean
  dateFrom?: Date
  dateTo?: Date
  tags?: string[]
}

export type ContentType = 'phone' | 'email' | 'url' | 'code' | 'password' | 'text'

export interface CustomRule {
  id: string
  name: string
  pattern: string
  action_type: 'popup' | 'silent' | 'ignore'
  is_enabled: boolean
  priority: number
  created_at: number
}

// Utility functions for type conversion
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export const toSnakeCase = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

export const convertKeysToCamelCase = <T>(obj: any): T => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = toCamelCase(key)
      acc[camelKey] = convertKeysToCamelCase(obj[key])
      return acc
    }, {} as any) as T
  }
  return obj as T
}

export const convertKeysToSnakeCase = <T>(obj: any): T => {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = toSnakeCase(key)
      acc[snakeKey] = convertKeysToSnakeCase(obj[key])
      return acc
    }, {} as any) as T
  }
  return obj as T
}
