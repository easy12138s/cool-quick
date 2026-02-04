import React, { useState } from 'react'
import { Search, Bell, Moon, Sun, User, Circle } from 'lucide-react'
import { useConfigStore } from '../../stores/useConfigStore'
import { invoke } from '@tauri-apps/api/tauri'

export const Header: React.FC = () => {
  const { effectiveTheme, setTheme } = useConfigStore()
  const [searchQuery, setSearchQuery] = useState('')

  const showFloatingWindow = async () => {
    try {
      await invoke('window_show_floating')
    } catch (e) {
      console.error('Failed to show floating window:', e)
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="全局搜索笔记... (Ctrl+Shift+V)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          {effectiveTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <User size={20} />
        </button>
      </div>
    </header>
  )
}
