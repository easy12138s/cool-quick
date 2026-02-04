import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Moon, Sun, Monitor, 
  Download, Trash2, Save, RotateCcw, Check,
  Keyboard, Clock, Database, Palette
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'
import type { AppConfig } from '../types'

interface SettingsProps {
  config: AppConfig
  onConfigChange: (config: AppConfig) => void
  onClose: () => void
}

const Settings: React.FC<SettingsProps> = ({ config, onConfigChange, onClose }) => {
  const [activeTab, setActiveTab] = useState('general')
  const [localConfig, setLocalConfig] = useState<AppConfig>(config)
  const [hasChanges, setHasChanges] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleChange = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setLocalConfig((prev: AppConfig) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await invoke('update_config', { newConfig: localConfig })
      onConfigChange(localConfig)
      setHasChanges(false)
      setShowSaveSuccess(true)
      setTimeout(() => setShowSaveSuccess(false), 2000)
    } catch (e) {
      console.error('Failed to save config:', e)
    }
  }

  const handleReset = () => {
    setLocalConfig(config)
    setHasChanges(false)
  }

  const tabs = [
    { id: 'general', label: '常规', icon: Monitor },
    { id: 'appearance', label: '外观', icon: Palette },
    { id: 'behavior', label: '行为', icon: Clock },
    { id: 'shortcuts', label: '快捷键', icon: Keyboard },
    { id: 'data', label: '数据', icon: Database },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">设置</h2>
              <p className="text-xs text-gray-500">自定义 CoolQuick</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'general' && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">启动设置</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">开机自启动</p>
                          <p className="text-xs text-gray-500">系统启动时自动运行</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={localConfig.auto_start}
                          onChange={(e) => handleChange('auto_start', e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">语言</h3>
                    <select
                      value={localConfig.language}
                      onChange={(e) => handleChange('language', e.target.value)}
                      className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <option value="zh">简体中文</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {activeTab === 'appearance' && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">主题</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {(['light', 'dark', 'system'] as const).map((theme) => (
                        <button
                          key={theme}
                          onClick={() => handleChange('theme', theme)}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            localConfig.theme === theme
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {theme === 'light' && <Sun size={24} className="mx-auto mb-2" />}
                          {theme === 'dark' && <Moon size={24} className="mx-auto mb-2" />}
                          {theme === 'system' && <Monitor size={24} className="mx-auto mb-2" />}
                          <span className="text-xs font-medium">
                            {theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">悬浮窗</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-500 mb-2 block">大小</label>
                        <input
                          type="range"
                          min="32"
                          max="64"
                          value={localConfig.floating_window_size}
                          onChange={(e) => handleChange('floating_window_size', parseInt(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>小</span>
                          <span>{localConfig.floating_window_size}px</span>
                          <span>大</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 mb-2 block">透明度</label>
                        <input
                          type="range"
                          min="0.5"
                          max="1"
                          step="0.05"
                          value={localConfig.floating_window_opacity}
                          onChange={(e) => handleChange('floating_window_opacity', parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>透明</span>
                          <span>{Math.round(localConfig.floating_window_opacity * 100)}%</span>
                          <span>不透明</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'behavior' && (
                <motion.div
                  key="behavior"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">弹窗设置</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">最小触发长度</span>
                          <span className="text-xs text-gray-500">{localConfig.min_popup_length} 字符</span>
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={localConfig.min_popup_length}
                          onChange={(e) => handleChange('min_popup_length', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">自动关闭时间</span>
                          <span className="text-xs text-gray-500">{localConfig.popup_auto_close_seconds} 秒</span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={localConfig.popup_auto_close_seconds}
                          onChange={(e) => handleChange('popup_auto_close_seconds', parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">归档设置</h3>
                    <div>
                      <label className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">自动归档时间</span>
                        <span className="text-xs text-gray-500">{localConfig.archive_after_days} 天后</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={localConfig.archive_after_days}
                        onChange={(e) => handleChange('archive_after_days', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'shortcuts' && (
                <motion.div
                  key="shortcuts"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">快捷键</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">搜索笔记</span>
                        <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs font-mono border border-gray-200 dark:border-gray-600">
                          {localConfig.shortcut_search}
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-gray-700 dark:text-gray-300">粘贴最近一条</span>
                        <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs font-mono border border-gray-200 dark:border-gray-600">
                          {localConfig.shortcut_paste_last}
                        </kbd>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      快捷键将在后续版本中支持自定义
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'data' && (
                <motion.div
                  key="data"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">数据安全</h3>
                    <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">启用数据库加密</p>
                        <p className="text-xs text-gray-500">使用 AES-256 加密本地数据</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={localConfig.enable_encryption}
                        onChange={(e) => handleChange('enable_encryption', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </label>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">数据管理</h3>
                    <div className="space-y-3">
                      <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        <Download size={18} />
                        <span className="text-sm font-medium">导出数据</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <Trash2 size={18} />
                        <span className="text-sm font-medium">清除所有数据</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {showSaveSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 text-sm text-green-600"
                >
                  <Check size={16} />
                  已保存
                </motion.div>
              )}
            </AnimatePresence>
            {hasChanges && !showSaveSuccess && (
              <span className="text-sm text-amber-600">有未保存的更改</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw size={16} />
              重置
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              保存
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Settings
