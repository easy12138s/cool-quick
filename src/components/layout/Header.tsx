import React from 'react'
import { Moon, Sun, Monitor, Circle, CircleOff } from 'lucide-react'
import { useConfigStore } from '../../stores/useConfigStore'
import { invoke } from '@tauri-apps/api/tauri'

export const Header: React.FC = () => {
  const { config, setTheme, updateConfig } = useConfigStore()

  // Toggle floating window visibility
  const toggleFloatingWindow = async () => {
    try {
      const newVisible = !config.floating_visible
      if (newVisible) {
        await invoke('window_show_floating')
      } else {
        await invoke('window_hide_floating')
      }
      // Persist the state
      await updateConfig({ floating_visible: newVisible })
    } catch (e) {
      console.error('Failed to toggle floating window:', e)
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
      <div className="flex items-center gap-3">
        <button
          onClick={toggleFloatingWindow}
          title={config.floating_visible ? '隐藏悬浮球' : '显示悬浮球'}
          className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 ${
            config.floating_visible ? 'text-primary-500' : 'text-gray-400'
          }`}
        >
          {config.floating_visible ? <Circle size={20} /> : <CircleOff size={20} />}
          <span className="text-sm">{config.floating_visible ? '悬浮球开启' : '悬浮球关闭'}</span>
        </button>

        <button
          onClick={cycleTheme}
          title={`切换主题模式 (${themeDisplay.label})`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
        >
          {themeDisplay.icon}
          <span className="text-sm text-gray-600 dark:text-gray-300">{themeDisplay.label}</span>
        </button>
      </div>
    </header>
  )
}
