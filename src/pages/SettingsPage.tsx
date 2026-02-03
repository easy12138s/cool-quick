import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useConfigStore } from '../stores/useConfigStore'
import { 
  Moon, 
  Sun, 
  Monitor, 
  Type, 
  Clock, 
  Shield,
  Save,
  RotateCcw,
  Check
} from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const { config, loadConfig, updateConfig } = useConfigStore()
  const [hasChanges, setHasChanges] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleChange = <K extends keyof typeof config>(
    key: K, 
    value: typeof config[K]
  ) => {
    if (config) {
      updateConfig({ [key]: value })
      setHasChanges(true)
    }
  }

  const handleSave = async () => {
    setShowSuccess(true)
    setHasChanges(false)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  if (!config) {
    return <div>Loading...</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          自定义 CoolQuick 的行为和外观
        </p>
      </div>

      {/* Theme Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Monitor size={20} />
          主题设置
        </h2>
        
        <div className="grid grid-cols-3 gap-4">
          {(['light', 'dark', 'system'] as const).map((theme) => (
            <button
              key={theme}
              onClick={() => handleChange('theme', theme)}
              className={`p-4 rounded-xl border-2 transition-all ${
                config.theme === theme
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              {theme === 'light' && <Sun size={24} className="mx-auto mb-2" />}
              {theme === 'dark' && <Moon size={24} className="mx-auto mb-2" />}
              {theme === 'system' && <Monitor size={24} className="mx-auto mb-2" />}
              <span className="text-sm font-medium">
                {theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Popup Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock size={20} />
          弹窗设置
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自动关闭时间: {config.popup_auto_close_seconds} 秒
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={config.popup_auto_close_seconds}
              onChange={(e) => handleChange('popup_auto_close_seconds', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              最小触发长度: {config.min_popup_length} 字符
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={config.min_popup_length}
              onChange={(e) => handleChange('min_popup_length', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-green-600"
          >
            <Check size={18} />
            已保存
          </motion.div>
        )}
        
        <div className="flex gap-3 ml-auto">
          <button
            onClick={() => setHasChanges(false)}
            disabled={!hasChanges}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <RotateCcw size={18} />
            重置
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save size={18} />
            保存设置
          </button>
        </div>
      </div>
    </motion.div>
  )
}
