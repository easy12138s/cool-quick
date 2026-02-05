import React, { useState } from 'react'
import { Search, Bell, Moon, Sun, Monitor, Circle } from 'lucide-react'
import { useConfigStore } from '../../stores/useConfigStore'
import { invoke } from '@tauri-apps/api/tauri'

export const Header: React.FC = () => {
  const { config, effectiveTheme, setTheme } = useConfigStore()
  const [searchQuery, setSearchQuery] = useState('')

  const showFloatingWindow = async () => {
    try {
      await invoke('window_show_floating')
    } catch (e) {
      console.error('Failed to show floating window:', e)
    }
  }

  // Cycle through themes: light → dark → system → light
  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(config.theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  // Get icon and label based on current theme
  const getThemeDisplay = () => {
    switch (config.theme) {
      case 'light':
        return { icon: <Sun size={20} />, label: '浅色模式' }
      case 'dark':
        return { icon: <Moon size={20} />, label: '深色模式' }
      case 'system':
        return { icon: <Monitor size={20} />, label: '跟随系统' }
      default:
        return { icon: <Sun size={20} />, label: '浅色模式' }
    }
  }

  const themeDisplay = getThemeDisplay()

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="全局搜索笔记... (Ctrl+Shift+V)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={showFloatingWindow}
          title="打开悬浮窗"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-primary-500"
        >
          <Circle size={20} />
        </button>

        <button
          onClick={cycleTheme}
          title={`切换主题模式 (${themeDisplay.label})`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
        >
          {themeDisplay.icon}
          <span className="text-sm text-gray-600 dark:text-gray-300">{themeDisplay.label}</span>
        </button>

        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
