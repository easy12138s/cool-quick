import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useConfigStore } from '../stores/useConfigStore'
import { 
  Clock, 
  Save,
  RotateCcw,
  Check,
  Circle,
  PanelRight,
  Shield,
  Keyboard
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/tauri'

export const SettingsPage: React.FC = () => {
  const { config, loadConfig, updateConfig } = useConfigStore()
  const [hasChanges, setHasChanges] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [draft, setDraft] = useState(config)
  const [shortcutValidity, setShortcutValidity] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  useEffect(() => {
    setDraft(config)
    setHasChanges(false)
  }, [config])

  const handleChange = <K extends keyof typeof draft>(key: K, value: typeof draft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    const shortcutKeys: Array<keyof typeof draft> = [
      'shortcut_search',
      'shortcut_paste_last',
      'shortcut_toggle_drawer',
      'shortcut_toggle_popup',
    ]

    const validityEntries = await Promise.all(
      shortcutKeys.map(async (key) => {
        const value = String(draft[key] ?? '')
        try {
          const ok = await invoke<boolean>('config_validate_shortcut', { shortcut: value })
          return [key as string, ok] as const
        } catch {
          return [key as string, false] as const
        }
      })
    )
    const nextValidity = Object.fromEntries(validityEntries)
    setShortcutValidity(nextValidity)

    const hasInvalid = Object.values(nextValidity).some(v => v === false)
    if (hasInvalid) return

    const prevFloatingVisible = config.floating_visible
    await updateConfig(draft)

    if (draft.floating_visible !== prevFloatingVisible) {
      if (draft.floating_visible) {
        await invoke('window_show_floating').catch(() => {})
      } else {
        await invoke('window_hide_floating').catch(() => {})
      }
    }

    setShowSuccess(true)
    setHasChanges(false)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const popupTypeOptions = useMemo(
    () => [
      { key: 'phone', label: '手机号' },
      { key: 'email', label: '邮箱' },
      { key: 'url', label: '网址' },
      { key: 'code', label: '代码' },
      { key: 'password', label: '密码' },
      { key: 'text', label: '文本' },
    ],
    []
  )

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

      {/* Popup Settings */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock size={20} />
          弹窗设置
        </h2>
        
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">启用弹窗提示</p>
              <p className="text-xs text-gray-500">复制内容时弹出识别提示</p>
            </div>
            <input
              type="checkbox"
              checked={draft.popup_enabled}
              onChange={(e) => handleChange('popup_enabled', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自动关闭时间: {draft.popup_auto_close_seconds} 秒
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={draft.popup_auto_close_seconds}
              onChange={(e) => handleChange('popup_auto_close_seconds', parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              最小触发长度: {draft.min_popup_length} 字符
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={draft.min_popup_length}
              onChange={(e) => handleChange('min_popup_length', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              重复内容去重窗口: {Math.round(draft.popup_dedupe_window_ms / 1000)} 秒
            </label>
            <input
              type="range"
              min="0"
              max="10000"
              step="500"
              value={draft.popup_dedupe_window_ms}
              onChange={(e) => handleChange('popup_dedupe_window_ms', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">弹窗类型</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {popupTypeOptions.map(opt => {
                const checked = draft.popup_types.includes(opt.key)
                return (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...draft.popup_types, opt.key]))
                          : draft.popup_types.filter(t => t !== opt.key)
                        handleChange('popup_types', next)
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{opt.label}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Floating & Drawer */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Circle size={20} />
          悬浮球与抽屉
        </h2>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">显示悬浮球</p>
              <p className="text-xs text-gray-500">在桌面显示悬浮球入口</p>
            </div>
            <input
              type="checkbox"
              checked={draft.floating_visible}
              onChange={(e) => handleChange('floating_visible', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">悬停打开抽屉</p>
              <p className="text-xs text-gray-500">鼠标悬停在悬浮球上显示抽屉</p>
            </div>
            <input
              type="checkbox"
              checked={draft.floating_hover_open_drawer}
              onChange={(e) => handleChange('floating_hover_open_drawer', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              悬停延迟: {draft.floating_hover_delay_ms} ms
            </label>
            <input
              type="range"
              min="0"
              max="1000"
              step="50"
              value={draft.floating_hover_delay_ms}
              onChange={(e) => handleChange('floating_hover_delay_ms', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">拖动时隐藏抽屉</p>
              <p className="text-xs text-gray-500">拖动悬浮球时自动隐藏抽屉，避免遮挡</p>
            </div>
            <input
              type="checkbox"
              checked={draft.floating_hide_drawer_on_drag}
              onChange={(e) => handleChange('floating_hide_drawer_on_drag', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">抽屉自动隐藏</p>
              <p className="text-xs text-gray-500">鼠标离开抽屉后自动隐藏</p>
            </div>
            <input
              type="checkbox"
              checked={draft.drawer_auto_hide}
              onChange={(e) => handleChange('drawer_auto_hide', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              抽屉自动隐藏延迟: {draft.drawer_hide_delay_ms} ms
            </label>
            <input
              type="range"
              min="0"
              max="3000"
              step="100"
              value={draft.drawer_hide_delay_ms}
              onChange={(e) => handleChange('drawer_hide_delay_ms', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                抽屉默认显示条数
              </label>
              <select
                value={draft.drawer_default_limit}
                onChange={(e) => handleChange('drawer_default_limit', parseInt(e.target.value))}
                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                {[5, 10, 20].map(v => (
                  <option key={v} value={v}>{v} 条</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                抽屉默认排序
              </label>
              <select
                value={draft.drawer_sort}
                onChange={(e) => handleChange('drawer_sort', e.target.value as any)}
                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                <option value="recent">最近</option>
                <option value="frequent">最常用</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Save & Archive */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <PanelRight size={20} />
          保存与整理
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                保存模式
              </label>
              <select
                value={draft.save_mode}
                onChange={(e) => handleChange('save_mode', e.target.value as any)}
                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                <option value="manual">手动保存（弹窗点保存）</option>
                <option value="auto">自动保存（复制即入库）</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                重复内容策略
              </label>
              <select
                value={draft.dedupe_mode}
                onChange={(e) => handleChange('dedupe_mode', e.target.value as any)}
                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                <option value="merge">合并（增加使用次数）</option>
                <option value="new">每次都新增</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自动归档天数: {draft.archive_after_days} 天
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={draft.archive_after_days}
              onChange={(e) => handleChange('archive_after_days', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">收藏不自动归档</p>
              <p className="text-xs text-gray-500">避免常用收藏被归档</p>
            </div>
            <input
              type="checkbox"
              checked={draft.never_archive_favorites}
              onChange={(e) => handleChange('never_archive_favorites', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>
      </section>

      {/* Privacy & Export */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield size={20} />
          隐私与导出
        </h2>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">导出时脱敏</p>
              <p className="text-xs text-gray-500">导出 JSON 时对密码等敏感内容做遮罩</p>
            </div>
            <input
              type="checkbox"
              checked={draft.export_mask_sensitive}
              onChange={(e) => handleChange('export_mask_sensitive', e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        </div>
      </section>

      {/* Shortcuts */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Keyboard size={20} />
          快捷键
        </h2>

        <div className="space-y-4">
          {(
            [
              { key: 'shortcut_search', label: '搜索' },
              { key: 'shortcut_paste_last', label: '粘贴最近一条' },
              { key: 'shortcut_toggle_drawer', label: '打开/关闭抽屉' },
              { key: 'shortcut_toggle_popup', label: '弹窗提示开关' },
            ] as const
          ).map(item => {
            const valid = shortcutValidity[item.key] ?? true
            return (
              <div key={item.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {item.label}
                </label>
                <input
                  value={draft[item.key]}
                  onChange={(e) => {
                    setShortcutValidity(prev => ({ ...prev, [item.key]: true }))
                    handleChange(item.key, e.target.value as any)
                  }}
                  className={`w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border rounded-lg text-sm font-mono ${
                    valid
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-red-400 dark:border-red-500'
                  }`}
                  placeholder="例如 Ctrl+Shift+V"
                />
                {!valid && (
                  <p className="text-xs text-red-600 mt-1">快捷键格式不合法，请包含修饰键（Ctrl/Alt/Shift）并指定按键</p>
                )}
              </div>
            )
          })}
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
            onClick={() => {
              setDraft(config)
              setHasChanges(false)
              setShortcutValidity({})
            }}
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
